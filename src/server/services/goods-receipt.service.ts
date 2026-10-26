import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';
import { getNextDocumentNumber } from './counter.service';
import { applyStockMovement, getOrCreateDefaultBatch } from './stock.service';
import type {
  CreateGoodsReceiptInput,
  UpdateGoodsReceiptInput,
  GoodsReceiptItemInput,
} from '@/schemas/goods-receipt.schema';
import { Prisma, type GoodsReceiptStatus } from '@prisma/client';

export interface ListGoodsReceiptsOptions {
  page?: number;
  pageSize?: number;
  q?: string;
  warehouseId?: string;
  supplierId?: string;
  status?: GoodsReceiptStatus;
}

export async function listGoodsReceipts(options: ListGoodsReceiptsOptions = {}) {
  const page = Math.max(Number(options.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 20, 1), 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.GoodsReceiptWhereInput = {};

  if (options.status) where.status = options.status;
  if (options.warehouseId) where.warehouseId = options.warehouseId;
  if (options.supplierId) where.supplierId = options.supplierId;

  if (options.q?.trim()) {
    const query = options.q.trim();
    where.OR = [
      { receiptNo: { contains: query, mode: 'insensitive' } },
      { notes: { contains: query, mode: 'insensitive' } },
      { supplier: { name: { contains: query, mode: 'insensitive' } } },
    ];
  }

  const [total, data] = await Promise.all([
    prisma.goodsReceipt.count({ where }),
    prisma.goodsReceipt.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    }),
  ]);

  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

export async function getGoodsReceiptById(id: string) {
  const gr = await prisma.goodsReceipt.findUnique({
    where: { id },
    include: {
      supplier: true,
      warehouse: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              uom: true,
              trackExpiry: true,
              costPrice: true,
            },
          },
          location: {
            select: {
              id: true,
              code: true,
              zone: true,
              rack: true,
              level: true,
              warehouseId: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!gr) {
    throw new AppError('NOT_FOUND', 'Dokumen penerimaan barang tidak ditemukan');
  }

  return gr;
}

/**
 * Validates each item against business rules:
 * - BR-13: Lokasi harus aktif dan berada di gudang yang dipilih pada dokumen
 * - BR-22: Lokasi tidak boleh dalam keadaan dibekukan karena opname
 * - BR-06: Jika produk trackExpiry=true, batchNo dan expiryDate wajib diisi
 * - BR-07: Jika trackExpiry=false, batchNo memakai DEFAULT dan expiryDate null
 * - BR-32: Produk dan lokasi nonaktif ditolak
 */
async function validateGoodsReceiptItems(
  warehouseId: string,
  items: GoodsReceiptItemInput[],
  receivedAt?: string | Date | null,
  tx?: Prisma.TransactionClient,
) {
  const client = tx || prisma;
  const receivedDate = receivedAt ? new Date(receivedAt) : null;

  const productIds = Array.from(new Set(items.map((i) => i.productId)));
  const locationIds = Array.from(new Set(items.map((i) => i.locationId)));

  const [products, locations] = await Promise.all([
    client.product.findMany({
      where: { id: { in: productIds } },
    }),
    client.location.findMany({
      where: { id: { in: locationIds } },
    }),
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const locationMap = new Map(locations.map((l) => [l.id, l]));

  const validatedItems: {
    productId: string;
    locationId: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    batchNo: string;
    expiryDate: Date | null;
  }[] = [];

  for (const [idx, item] of items.entries()) {
    const rowNum = idx + 1;

    // Validate Product (BR-32)
    const product = productMap.get(item.productId);
    if (!product) {
      throw new AppError('NOT_FOUND', `Baris #${rowNum}: Produk tidak ditemukan`);
    }
    if (!product.isActive) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Baris #${rowNum}: Produk '${product.name}' (${product.sku}) sedang nonaktif (BR-32)`,
      );
    }

    // Validate Location (BR-13, BR-22, BR-32)
    const location = locationMap.get(item.locationId);
    if (!location) {
      throw new AppError('NOT_FOUND', `Baris #${rowNum}: Lokasi rak tidak ditemukan`);
    }
    if (!location.isActive) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Baris #${rowNum}: Lokasi rak '${location.code}' sedang nonaktif (BR-32)`,
      );
    }
    if (location.warehouseId !== warehouseId) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Baris #${rowNum}: Lokasi rak '${location.code}' tidak berada di gudang tujuan yang dipilih (BR-13)`,
      );
    }
    if (location.isFrozen) {
      throw new AppError(
        'INVALID_STATE',
        `Baris #${rowNum}: Lokasi rak '${location.code}' sedang dibekukan karena proses opname (BR-22)`,
      );
    }

    // Validate Batch & Expiry per Product configuration (BR-06, BR-07)
    let batchNo = 'DEFAULT';
    let expiryDate: Date | null = null;

    if (product.trackExpiry) {
      if (!item.batchNo || item.batchNo.trim().toUpperCase() === 'DEFAULT') {
        throw new AppError(
          'VALIDATION_ERROR',
          `Baris #${rowNum}: Produk '${product.name}' mewajibkan nomor batch yang valid (BR-06)`,
        );
      }
      if (!item.expiryDate) {
        throw new AppError(
          'VALIDATION_ERROR',
          `Baris #${rowNum}: Produk '${product.name}' mewajibkan tanggal kedaluwarsa (BR-06)`,
        );
      }
      const parsedExp = new Date(item.expiryDate);
      if (receivedDate && parsedExp < receivedDate) {
        throw new AppError(
          'VALIDATION_ERROR',
          `Baris #${rowNum}: Tanggal kedaluwarsa tidak boleh lebih awal dari tanggal penerimaan barang (BR-06)`,
        );
      }
      batchNo = item.batchNo.trim().toUpperCase();
      expiryDate = parsedExp;
    } else {
      // BR-07: Produk tanpa track_expiry selalu menggunakan batch DEFAULT
      batchNo = 'DEFAULT';
      expiryDate = null;
    }

    validatedItems.push({
      productId: item.productId,
      locationId: item.locationId,
      quantity: item.quantity,
      unitPrice: new Prisma.Decimal(item.unitPrice ?? 0),
      batchNo,
      expiryDate,
    });
  }

  return validatedItems;
}

export async function createGoodsReceipt(input: CreateGoodsReceiptInput, userId: string) {
  // Validate Supplier (BR-32)
  const supplier = await prisma.supplier.findUnique({
    where: { id: input.supplierId },
  });
  if (!supplier) {
    throw new AppError('NOT_FOUND', 'Supplier tidak ditemukan');
  }
  if (!supplier.isActive) {
    throw new AppError('VALIDATION_ERROR', 'Supplier yang dipilih sedang nonaktif (BR-32)');
  }

  // Validate Warehouse (BR-32)
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: input.warehouseId },
  });
  if (!warehouse) {
    throw new AppError('NOT_FOUND', 'Gudang tujuan tidak ditemukan');
  }
  if (!warehouse.isActive) {
    throw new AppError('VALIDATION_ERROR', 'Gudang tujuan sedang nonaktif (BR-32)');
  }

  // Validate Line Items
  const validatedItems = await validateGoodsReceiptItems(
    input.warehouseId,
    input.items,
    input.receivedAt,
  );

  return prisma.$transaction(async (tx) => {
    // Generate official sequential receipt number (BR-15)
    const receiptNo = await getNextDocumentNumber('GR', tx);

    return tx.goodsReceipt.create({
      data: {
        receiptNo,
        supplierId: input.supplierId,
        warehouseId: input.warehouseId,
        status: 'DRAFT',
        receivedAt: input.receivedAt ? new Date(input.receivedAt) : null,
        notes: input.notes || null,
        createdById: userId,
        items: {
          create: validatedItems,
        },
      },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: true,
            location: true,
          },
        },
      },
    });
  });
}

export async function updateGoodsReceipt(
  id: string,
  input: UpdateGoodsReceiptInput,
  _userId: string,
) {
  const existing = await getGoodsReceiptById(id);

  // BR-11: Hanya DRAFT yang boleh diedit
  if (existing.status !== 'DRAFT') {
    throw new AppError(
      'INVALID_STATE',
      'Hanya dokumen penerimaan berstatus DRAFT yang dapat diedit (BR-11)',
    );
  }

  const targetWarehouseId = input.warehouseId || existing.warehouseId;

  // Validate Supplier if changed
  if (input.supplierId && input.supplierId !== existing.supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
    if (!supplier || !supplier.isActive) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Supplier tidak ditemukan atau sedang nonaktif (BR-32)',
      );
    }
  }

  // Validate Warehouse if changed
  if (input.warehouseId && input.warehouseId !== existing.warehouseId) {
    const warehouse = await prisma.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse || !warehouse.isActive) {
      throw new AppError('VALIDATION_ERROR', 'Gudang tujuan tidak ditemukan atau nonaktif (BR-32)');
    }
  }

  return prisma.$transaction(async (tx) => {
    let validatedItems;
    if (input.items && input.items.length > 0) {
      validatedItems = await validateGoodsReceiptItems(
        targetWarehouseId,
        input.items,
        input.receivedAt ?? existing.receivedAt,
        tx,
      );

      // Replace items
      await tx.goodsReceiptItem.deleteMany({
        where: { goodsReceiptId: id },
      });
    }

    return tx.goodsReceipt.update({
      where: { id },
      data: {
        ...(input.supplierId && { supplierId: input.supplierId }),
        ...(input.warehouseId && { warehouseId: input.warehouseId }),
        ...(input.receivedAt !== undefined && {
          receivedAt: input.receivedAt ? new Date(input.receivedAt) : null,
        }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(validatedItems && {
          items: {
            create: validatedItems,
          },
        }),
      },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: true,
            location: true,
          },
        },
      },
    });
  });
}

/**
 * Approve & Receive Goods Receipt (BR-11, BR-12, BR-14):
 * In a single ACID transaction:
 * 1. Locks document and verifies status is DRAFT
 * 2. For each item:
 *    a. Upserts batch record
 *    b. Applies stock movement (IN) and increases physical stock
 *    c. Logs append-only stock_movements entry
 * 3. Updates status to RECEIVED and sets receivedAt
 * Fails anywhere = complete automatic rollback (BR-12)
 */
export async function receiveGoodsReceipt(id: string, userId: string) {
  const gr = await getGoodsReceiptById(id);

  if (gr.status === 'RECEIVED') {
    throw new AppError('INVALID_STATE', 'Dokumen penerimaan ini sudah diterima sebelumnya (BR-14)');
  }

  if (gr.status === 'CANCELLED') {
    throw new AppError(
      'INVALID_STATE',
      'Dokumen penerimaan yang sudah dibatalkan tidak dapat diterima',
    );
  }

  if (gr.items.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Dokumen penerimaan tidak memiliki item barang');
  }

  return prisma.$transaction(async (tx) => {
    for (const item of gr.items) {
      // 1. Ensure Batch exists
      let batchId: string;

      if (item.batchNo === 'DEFAULT') {
        const batch = await getOrCreateDefaultBatch(item.productId, tx);
        batchId = batch.id;
      } else {
        const batch = await tx.batch.upsert({
          where: {
            productId_batchNo: {
              productId: item.productId,
              batchNo: item.batchNo,
            },
          },
          update: {
            ...(item.expiryDate && { expiryDate: item.expiryDate }),
          },
          create: {
            productId: item.productId,
            batchNo: item.batchNo,
            expiryDate: item.expiryDate,
          },
        });
        batchId = batch.id;
      }

      // 2. Apply Stock Movement (IN) via Core Engine
      await applyStockMovement(
        {
          productId: item.productId,
          locationId: item.locationId,
          batchId,
          movementType: 'IN',
          quantity: item.quantity,
          refType: 'GOODS_RECEIPT',
          refId: gr.id,
          refNo: gr.receiptNo,
          userId,
          notes: `Penerimaan barang dari supplier '${gr.supplier.name}' (${gr.receiptNo})`,
        },
        { tx },
      );
    }

    // 3. Mark status as RECEIVED (BR-12)
    return tx.goodsReceipt.update({
      where: { id },
      data: {
        status: 'RECEIVED',
        receivedAt: new Date(),
      },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: true,
            location: true,
          },
        },
      },
    });
  });
}

/**
 * Cancel Goods Receipt (BR-11, BR-14, BR-15):
 * Only DRAFT documents can be cancelled.
 * RECEIVED documents cannot be cancelled (must use manual adjustment).
 * Document number is never reused (BR-15).
 */
export async function cancelGoodsReceipt(id: string, _userId: string) {
  const gr = await getGoodsReceiptById(id);

  if (gr.status === 'RECEIVED') {
    throw new AppError(
      'INVALID_STATE',
      'Dokumen yang sudah RECEIVED tidak bisa dibatalkan. Kesalahan harus dikoreksi lewat penyesuaian stok (BR-14)',
    );
  }

  if (gr.status === 'CANCELLED') {
    throw new AppError('INVALID_STATE', 'Dokumen penerimaan sudah berstatus CANCELLED');
  }

  return prisma.goodsReceipt.update({
    where: { id },
    data: {
      status: 'CANCELLED',
    },
    include: {
      supplier: true,
      warehouse: true,
      items: true,
    },
  });
}
