import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';
import { getNextDocumentNumber } from './counter.service';
import { applyStockMovement } from './stock.service';
import {
  type CreateCustomerReturnInput,
  CustomerReturnReasonLabels,
} from '@/schemas/customer-return.schema';
import type { Prisma, Role } from '@prisma/client';

export interface ListCustomerReturnsOptions {
  page?: number;
  pageSize?: number;
  q?: string;
  warehouseId?: string;
  customerId?: string;
}

export interface ReturnableDeliveryOrderItem {
  productId: string;
  productSku: string;
  productName: string;
  uom: string;
  batchId: string;
  batchNo: string;
  expiryDate: Date | null;
  shippedLocationId: string;
  shippedLocationCode: string;
  shippedQuantity: number;
  returnedQuantity: number;
  returnableQuantity: number;
}

/**
 * Fetch a SHIPPED Delivery Order with previously returned quantities calculated (BR-18).
 */
export async function getDeliveryOrderReturnDetails(deliveryOrderId: string) {
  const doOrder = await prisma.deliveryOrder.findUnique({
    where: { id: deliveryOrderId },
    include: {
      customer: true,
      warehouse: {
        include: {
          locations: {
            where: { isActive: true },
            select: { id: true, code: true, zone: true, rack: true, level: true, isFrozen: true },
            orderBy: { code: 'asc' },
          },
        },
      },
      items: {
        include: {
          product: {
            select: { id: true, sku: true, name: true, uom: true },
          },
          batch: {
            select: { id: true, batchNo: true, expiryDate: true },
          },
          location: {
            select: { id: true, code: true },
          },
        },
      },
    },
  });

  if (!doOrder) {
    throw new AppError('NOT_FOUND', 'Dokumen Delivery Order (DO) tidak ditemukan');
  }

  if (doOrder.status !== 'SHIPPED') {
    throw new AppError(
      'INVALID_STATE',
      `Hanya Delivery Order yang berstatus SHIPPED yang dapat diretur oleh customer (status saat ini: ${doOrder.status}) (BR-18)`,
    );
  }

  // Fetch all existing returns for this DO
  const previousReturnMovements = await prisma.stockMovement.findMany({
    where: {
      refType: 'CUSTOMER_RETURN',
      refId: deliveryOrderId,
      movementType: 'IN',
    },
    select: {
      productId: true,
      batchId: true,
      quantity: true,
      refNo: true,
      createdAt: true,
    },
  });

  // Calculate previously returned quantity per product & batch
  const returnedMap = new Map<string, number>();
  for (const m of previousReturnMovements) {
    const key = `${m.productId}_${m.batchId}`;
    returnedMap.set(key, (returnedMap.get(key) || 0) + m.quantity);
  }

  // Map DO items with remaining returnable quantity
  const items: ReturnableDeliveryOrderItem[] = doOrder.items.map((item) => {
    const batchId = item.batchId || '';
    const key = `${item.productId}_${batchId}`;
    const returnedQuantity = returnedMap.get(key) || 0;
    const returnableQuantity = Math.max(0, item.quantity - returnedQuantity);

    return {
      productId: item.productId,
      productSku: item.product.sku,
      productName: item.product.name,
      uom: item.product.uom,
      batchId: item.batch?.id || '',
      batchNo: item.batch?.batchNo || 'DEFAULT',
      expiryDate: item.batch?.expiryDate || null,
      shippedLocationId: item.location.id,
      shippedLocationCode: item.location.code,
      shippedQuantity: item.quantity,
      returnedQuantity,
      returnableQuantity,
    };
  });

  return {
    deliveryOrder: {
      id: doOrder.id,
      orderNo: doOrder.orderNo,
      status: doOrder.status,
      shippedAt: doOrder.shippedAt,
      notes: doOrder.notes,
    },
    customer: doOrder.customer,
    warehouse: doOrder.warehouse,
    items,
    totalShippedUnits: items.reduce((sum, i) => sum + i.shippedQuantity, 0),
    totalReturnedUnits: items.reduce((sum, i) => sum + i.returnedQuantity, 0),
    totalReturnableUnits: items.reduce((sum, i) => sum + i.returnableQuantity, 0),
  };
}

/**
 * List SHIPPED Delivery Orders eligible for customer returns.
 */
export async function listShippedDeliveryOrdersForReturn(
  options: {
    q?: string;
    warehouseId?: string;
    customerId?: string;
    limit?: number;
  } = {},
) {
  const where: Prisma.DeliveryOrderWhereInput = {
    status: 'SHIPPED',
    ...(options.warehouseId ? { warehouseId: options.warehouseId } : {}),
    ...(options.customerId ? { customerId: options.customerId } : {}),
  };

  if (options.q?.trim()) {
    const query = options.q.trim();
    where.OR = [
      { orderNo: { contains: query, mode: 'insensitive' } },
      { customer: { name: { contains: query, mode: 'insensitive' } } },
      { customer: { code: { contains: query, mode: 'insensitive' } } },
    ];
  }

  return prisma.deliveryOrder.findMany({
    where,
    take: options.limit || 50,
    orderBy: { shippedAt: 'desc' },
    select: {
      id: true,
      orderNo: true,
      shippedAt: true,
      notes: true,
      customer: {
        select: { id: true, code: true, name: true },
      },
      warehouse: {
        select: { id: true, code: true, name: true },
      },
      _count: {
        select: { items: true },
      },
    },
  });
}

/**
 * Execute atomic Customer Sales Return (T3.6, BR-18).
 * Enforces:
 * - Only SHIPPED Delivery Orders can be returned.
 * - Returned quantity cannot exceed shipped quantity minus previously returned quantity.
 * - Target location must be active and not frozen (BR-22, BR-32).
 * - Target location must belong to the same warehouse as the DO.
 * - Generates RET-YYYY-XXXX document number (BR-15).
 * - Adds stock via applyStockMovement with movementType: 'IN' and refType: 'CUSTOMER_RETURN'.
 * - Records audit log.
 */
export async function createCustomerReturn(
  input: CreateCustomerReturnInput,
  user: { id: string; role: Role; name?: string },
) {
  // BR-35: Viewer role cannot create transactions
  if (user.role === 'VIEWER') {
    throw new AppError(
      'FORBIDDEN',
      'Pengguna dengan peran Viewer tidak diizinkan membuat retur customer (BR-35)',
    );
  }

  const returnDetails = await getDeliveryOrderReturnDetails(input.deliveryOrderId);
  const doOrder = returnDetails.deliveryOrder;
  const customer = returnDetails.customer;
  const warehouse = returnDetails.warehouse;

  const returnableMap = new Map<string, ReturnableDeliveryOrderItem>();
  for (const item of returnDetails.items) {
    returnableMap.set(`${item.productId}_${item.batchId}`, item);
  }

  // Pre-validate return items
  for (const item of input.items) {
    const key = `${item.productId}_${item.batchId}`;
    const returnable = returnableMap.get(key);

    if (!returnable) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Produk / batch ini tidak ditemukan pada dokumen ${doOrder.orderNo}`,
      );
    }

    if (item.quantity > returnable.returnableQuantity) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Kuantitas retur (${item.quantity} ${returnable.uom}) untuk '${returnable.productName}' melebihi kuantitas sisa yang dapat diretur (${returnable.returnableQuantity} ${returnable.uom})`,
      );
    }

    // Validate target location
    const targetLoc = await prisma.location.findUnique({
      where: { id: item.locationId },
      include: { warehouse: true },
    });

    if (!targetLoc) {
      throw new AppError('NOT_FOUND', 'Lokasi rak tujuan retur tidak ditemukan');
    }

    if (!targetLoc.isActive) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Lokasi rak tujuan '${targetLoc.code}' sedang nonaktif (BR-32)`,
      );
    }

    if (targetLoc.isFrozen) {
      throw new AppError(
        'INVALID_STATE',
        `Lokasi rak tujuan '${targetLoc.code}' sedang dibekukan karena opname (BR-22)`,
      );
    }

    if (targetLoc.warehouseId !== warehouse.id) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Lokasi rak tujuan '${targetLoc.code}' harus berada di gudang yang sama dengan DO (${warehouse.name}) (BR-13)`,
      );
    }
  }

  const reasonLabel = CustomerReturnReasonLabels[input.reasonCategory] || input.reasonCategory;

  return prisma.$transaction(async (tx) => {
    // Generate atomic document number RET-YYYY-XXXX (BR-15)
    const returnNo = await getNextDocumentNumber('RET', tx);

    const movementResults = [];

    for (const item of input.items) {
      const returnable = returnableMap.get(`${item.productId}_${item.batchId}`)!;
      const itemNote = item.itemNotes?.trim() ? ` [${item.itemNotes.trim()}]` : '';
      const formattedNotes = `[RETUR CUSTOMER - ${reasonLabel}] DO: ${doOrder.orderNo} | Cust: ${customer.name} | ${input.notes.trim()}${itemNote}`;

      const res = await applyStockMovement(
        {
          productId: item.productId,
          locationId: item.locationId,
          batchId: item.batchId,
          movementType: 'IN',
          quantity: item.quantity,
          refType: 'CUSTOMER_RETURN',
          refId: doOrder.id,
          refNo: returnNo,
          userId: user.id,
          notes: formattedNotes,
        },
        { tx },
      );

      movementResults.push({
        ...res,
        productSku: returnable.productSku,
        productName: returnable.productName,
        uom: returnable.uom,
        batchNo: returnable.batchNo,
      });
    }

    // Record audit log
    await tx.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name || 'System User',
        userRole: user.role,
        action: 'CREATE_CUSTOMER_RETURN',
        entity: 'CustomerReturn',
        entityId: returnNo,
        description: `Menerima retur customer ${returnNo} dari DO ${doOrder.orderNo} (${customer.name}) sejumlah ${input.items.length} item. Alasan: ${reasonLabel}`,
        newValues: {
          returnNo,
          deliveryOrderId: doOrder.id,
          deliveryOrderNo: doOrder.orderNo,
          customerId: customer.id,
          customerName: customer.name,
          reasonCategory: input.reasonCategory,
          reasonLabel,
          notes: input.notes.trim(),
          itemsCount: input.items.length,
          totalUnits: input.items.reduce((s, i) => s + i.quantity, 0),
        },
      },
    });

    return {
      returnNo,
      deliveryOrder: {
        id: doOrder.id,
        orderNo: doOrder.orderNo,
      },
      customer: {
        id: customer.id,
        code: customer.code,
        name: customer.name,
      },
      warehouse: {
        id: warehouse.id,
        code: warehouse.code,
        name: warehouse.name,
      },
      reasonCategory: input.reasonCategory,
      reasonLabel,
      notes: input.notes.trim(),
      itemsCount: input.items.length,
      totalUnits: input.items.reduce((s, i) => s + i.quantity, 0),
      createdAt: new Date(),
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      results: movementResults,
    };
  });
}

/**
 * List customer return receipts from StockMovement records with pagination and search.
 */
export async function listCustomerReturns(options: ListCustomerReturnsOptions = {}) {
  const page = Math.max(Number(options.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 20, 1), 100);

  const where: Prisma.StockMovementWhereInput = {
    refType: 'CUSTOMER_RETURN',
    movementType: 'IN',
  };

  if (options.warehouseId) {
    where.location = { warehouseId: options.warehouseId };
  }

  if (options.q?.trim()) {
    const query = options.q.trim();
    where.OR = [
      { refNo: { contains: query, mode: 'insensitive' } },
      { notes: { contains: query, mode: 'insensitive' } },
      { product: { name: { contains: query, mode: 'insensitive' } } },
      { product: { sku: { contains: query, mode: 'insensitive' } } },
    ];
  }

  // Fetch all movements matching criteria to aggregate by refNo
  const movements = await prisma.stockMovement.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { sku: true, name: true, uom: true } },
      location: {
        select: {
          code: true,
          warehouse: { select: { id: true, code: true, name: true } },
        },
      },
      batch: { select: { batchNo: true, expiryDate: true } },
      user: { select: { id: true, name: true, role: true } },
    },
  });

  // Group movements by return document number (refNo)
  const docMap = new Map<
    string,
    {
      returnNo: string;
      refId: string;
      warehouse: { id: string; code: string; name: string };
      createdAt: Date;
      user: { id: string; name: string; role: Role };
      notes: string | null;
      itemsCount: number;
      totalUnits: number;
      sampleProducts: string[];
    }
  >();

  for (const m of movements) {
    let doc = docMap.get(m.refNo);
    if (!doc) {
      doc = {
        returnNo: m.refNo,
        refId: m.refId,
        warehouse: m.location.warehouse,
        createdAt: m.createdAt,
        user: m.user,
        notes: m.notes,
        itemsCount: 0,
        totalUnits: 0,
        sampleProducts: [],
      };
      docMap.set(m.refNo, doc);
    }

    doc.itemsCount += 1;
    doc.totalUnits += m.quantity;
    if (doc.sampleProducts.length < 2 && !doc.sampleProducts.includes(m.product.name)) {
      doc.sampleProducts.push(m.product.name);
    }
  }

  const allDocs = Array.from(docMap.values());
  const total = allDocs.length;
  const paginatedDocs = allDocs.slice((page - 1) * pageSize, page * pageSize);

  return {
    data: paginatedDocs,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

/**
 * Get detailed Customer Return document by return document number (refNo).
 */
export async function getCustomerReturnByRefNo(refNo: string) {
  const movements = await prisma.stockMovement.findMany({
    where: {
      refNo,
      refType: 'CUSTOMER_RETURN',
    },
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          uom: true,
          category: { select: { name: true } },
        },
      },
      location: {
        include: {
          warehouse: true,
        },
      },
      batch: true,
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (movements.length === 0) {
    throw new AppError('NOT_FOUND', `Dokumen retur '${refNo}' tidak ditemukan`);
  }

  const first = movements[0]!;
  const deliveryOrderId = first.refId;

  // Retrieve original DO details if available
  const doOrder = await prisma.deliveryOrder.findUnique({
    where: { id: deliveryOrderId },
    include: {
      customer: true,
      warehouse: true,
    },
  });

  return {
    returnNo: refNo,
    createdAt: first.createdAt,
    user: first.user,
    rawNotes: first.notes,
    warehouse: first.location.warehouse,
    deliveryOrder: doOrder
      ? {
          id: doOrder.id,
          orderNo: doOrder.orderNo,
          customer: doOrder.customer,
          shippedAt: doOrder.shippedAt,
        }
      : null,
    items: movements.map((m) => ({
      id: m.id,
      productId: m.productId,
      productSku: m.product.sku,
      productName: m.product.name,
      categoryName: m.product.category?.name || '-',
      uom: m.product.uom,
      batchNo: m.batch.batchNo,
      expiryDate: m.batch.expiryDate,
      locationId: m.locationId,
      locationCode: m.location.code,
      quantity: m.quantity,
      balanceAfter: m.balanceAfter,
      notes: m.notes,
    })),
    totalUnits: movements.reduce((sum, m) => sum + m.quantity, 0),
  };
}
