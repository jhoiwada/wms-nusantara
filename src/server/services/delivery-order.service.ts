import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';
import { getNextDocumentNumber } from './counter.service';
import { applyStockMovement } from './stock.service';
import type {
  CreateDeliveryOrderInput,
  UpdateDeliveryOrderInput,
  DeliveryOrderItemInput,
} from '@/schemas/delivery-order.schema';
import type { Prisma, DeliveryOrderStatus } from '@prisma/client';

export interface ListDeliveryOrdersOptions {
  page?: number;
  pageSize?: number;
  q?: string;
  warehouseId?: string;
  customerId?: string;
  status?: DeliveryOrderStatus;
}

export async function listDeliveryOrders(options: ListDeliveryOrdersOptions = {}) {
  const page = Math.max(Number(options.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 20, 1), 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.DeliveryOrderWhereInput = {};

  if (options.status) where.status = options.status;
  if (options.warehouseId) where.warehouseId = options.warehouseId;
  if (options.customerId) where.customerId = options.customerId;

  if (options.q?.trim()) {
    const query = options.q.trim();
    where.OR = [
      { orderNo: { contains: query, mode: 'insensitive' } },
      { notes: { contains: query, mode: 'insensitive' } },
      { customer: { name: { contains: query, mode: 'insensitive' } } },
    ];
  }

  const [total, data] = await Promise.all([
    prisma.deliveryOrder.count({ where }),
    prisma.deliveryOrder.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
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

export async function getDeliveryOrderById(id: string) {
  const doOrder = await prisma.deliveryOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      warehouse: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
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
              isFrozen: true,
            },
          },
          batch: {
            select: {
              id: true,
              batchNo: true,
              expiryDate: true,
            },
          },
        },
      },
    },
  });

  if (!doOrder) {
    throw new AppError('NOT_FOUND', 'Dokumen pengiriman (Delivery Order) tidak ditemukan');
  }

  return doOrder;
}

/**
 * Validate customer, warehouse, and items belong to the designated warehouse.
 */
async function validateDeliveryOrderItems(
  warehouseId: string,
  items: DeliveryOrderItemInput[],
  tx: Prisma.TransactionClient,
) {
  if (!items || items.length === 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Dokumen pengiriman wajib memiliki minimal 1 item barang',
    );
  }

  for (const [idx, item] of items.entries()) {
    const product = await tx.product.findUnique({
      where: { id: item.productId },
    });
    if (!product) {
      throw new AppError('NOT_FOUND', `Produk pada baris ${idx + 1} tidak ditemukan`);
    }
    if (!product.isActive) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Produk '${product.sku}' tidak aktif dan tidak dapat dipilih (BR-32)`,
      );
    }

    const location = await tx.location.findUnique({
      where: { id: item.locationId },
    });
    if (!location) {
      throw new AppError('NOT_FOUND', `Lokasi rak pada baris ${idx + 1} tidak ditemukan`);
    }
    if (!location.isActive) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Lokasi '${location.code}' tidak aktif dan tidak dapat dipilih (BR-32)`,
      );
    }
    if (location.warehouseId !== warehouseId) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Lokasi '${location.code}' tidak berada dalam gudang yang dipilih (BR-13)`,
      );
    }

    if (item.batchId) {
      const batch = await tx.batch.findUnique({
        where: { id: item.batchId },
      });
      if (!batch || batch.productId !== item.productId) {
        throw new AppError(
          'NOT_FOUND',
          `Batch pada baris ${idx + 1} tidak ditemukan atau tidak cocok dengan produk`,
        );
      }
      if (batch.expiryDate) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const expDate = new Date(batch.expiryDate);
        expDate.setHours(0, 0, 0, 0);
        if (expDate < todayStart) {
          throw new AppError(
            'VALIDATION_ERROR',
            `Batch '${batch.batchNo}' sudah kedaluwarsa dan tidak boleh dikirim (BR-09)`,
          );
        }
      }
    }
  }
}

/**
 * Create a new Delivery Order draft (BR-15, BR-16, BR-19).
 * Generates an atomic sequential order number DO-YYYY-XXXX.
 */
export async function createDeliveryOrder(input: CreateDeliveryOrderInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Validate Customer (BR-32)
    const customer = await tx.customer.findUnique({
      where: { id: input.customerId },
    });
    if (!customer) {
      throw new AppError('NOT_FOUND', 'Customer tidak ditemukan');
    }
    if (!customer.isActive) {
      throw new AppError('VALIDATION_ERROR', `Customer '${customer.name}' tidak aktif (BR-32)`);
    }

    // 2. Validate Warehouse (BR-32)
    const warehouse = await tx.warehouse.findUnique({
      where: { id: input.warehouseId },
    });
    if (!warehouse) {
      throw new AppError('NOT_FOUND', 'Gudang tidak ditemukan');
    }
    if (!warehouse.isActive) {
      throw new AppError('VALIDATION_ERROR', `Gudang '${warehouse.name}' tidak aktif (BR-32)`);
    }

    // 3. Validate items
    await validateDeliveryOrderItems(input.warehouseId, input.items, tx);

    // 4. Generate sequential document number (BR-15)
    const orderNo = await getNextDocumentNumber('DO', tx);

    // 5. Create DO Header and Items
    return tx.deliveryOrder.create({
      data: {
        orderNo,
        customerId: input.customerId,
        warehouseId: input.warehouseId,
        status: 'DRAFT',
        shippedAt: input.shippedAt ? new Date(input.shippedAt) : null,
        notes: input.notes?.trim() || null,
        createdById: userId,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            locationId: item.locationId,
            batchId: item.batchId || null,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        customer: true,
        warehouse: true,
        items: {
          include: {
            product: true,
            location: true,
            batch: true,
          },
        },
      },
    });
  });
}

/**
 * Update Delivery Order draft (BR-16, BR-18).
 * Only DRAFT documents can be updated.
 */
export async function updateDeliveryOrder(
  id: string,
  input: UpdateDeliveryOrderInput,
  _userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.deliveryOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      throw new AppError('NOT_FOUND', 'Dokumen pengiriman tidak ditemukan');
    }

    if (existing.status !== 'DRAFT') {
      throw new AppError(
        'INVALID_STATE',
        `Hanya dokumen berstatus DRAFT yang dapat diedit. Status saat ini: ${existing.status} (BR-16, BR-18)`,
      );
    }

    const targetWarehouseId = input.warehouseId || existing.warehouseId;

    if (input.customerId && input.customerId !== existing.customerId) {
      const customer = await tx.customer.findUnique({
        where: { id: input.customerId },
      });
      if (!customer || !customer.isActive) {
        throw new AppError('VALIDATION_ERROR', 'Customer tidak ditemukan atau tidak aktif (BR-32)');
      }
    }

    if (input.warehouseId && input.warehouseId !== existing.warehouseId) {
      const warehouse = await tx.warehouse.findUnique({
        where: { id: input.warehouseId },
      });
      if (!warehouse || !warehouse.isActive) {
        throw new AppError('VALIDATION_ERROR', 'Gudang tidak ditemukan atau tidak aktif (BR-32)');
      }
    }

    if (input.items) {
      await validateDeliveryOrderItems(targetWarehouseId, input.items, tx);

      // Recreate items
      await tx.deliveryOrderItem.deleteMany({
        where: { deliveryOrderId: id },
      });

      await tx.deliveryOrderItem.createMany({
        data: input.items.map((item) => ({
          deliveryOrderId: id,
          productId: item.productId,
          locationId: item.locationId,
          batchId: item.batchId || null,
          quantity: item.quantity,
        })),
      });
    }

    return tx.deliveryOrder.update({
      where: { id },
      data: {
        customerId: input.customerId,
        warehouseId: input.warehouseId,
        shippedAt: input.shippedAt ? new Date(input.shippedAt) : undefined,
        notes: input.notes !== undefined ? input.notes?.trim() || null : undefined,
      },
      include: {
        customer: true,
        warehouse: true,
        items: {
          include: {
            product: true,
            location: true,
            batch: true,
          },
        },
      },
    });
  });
}

/**
 * Ship Delivery Order atomically (BR-08, BR-09, BR-16, BR-17, BR-18, BR-22).
 * - Automatic FEFO allocation when batch is not specified (BR-08)
 * - Row-level locking and negative stock prevention (BR-01, BR-17)
 * - Whole DO rejected if any item has insufficient stock (BR-17)
 * - Frozen location check (BR-22)
 * - Status transition DRAFT -> SHIPPED
 */
export async function shipDeliveryOrder(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch DO with items and relations
    const doOrder = await tx.deliveryOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        warehouse: true,
        items: {
          include: {
            product: true,
            location: true,
            batch: true,
          },
        },
      },
    });

    if (!doOrder) {
      throw new AppError('NOT_FOUND', 'Dokumen pengiriman tidak ditemukan');
    }

    if (doOrder.status === 'SHIPPED') {
      throw new AppError(
        'INVALID_STATE',
        `Dokumen pengiriman '${doOrder.orderNo}' sudah berstatus SHIPPED dan tidak dapat dikirim ulang (BR-18)`,
      );
    }

    if (doOrder.status === 'CANCELLED') {
      throw new AppError(
        'INVALID_STATE',
        `Dokumen pengiriman '${doOrder.orderNo}' sudah dibatalkan (BR-16)`,
      );
    }

    if (!doOrder.items || doOrder.items.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Dokumen pengiriman tidak memiliki item barang');
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 2. Process each item: allocate batch (FEFO) if needed, and applyStockMovement (OUT)
    for (const item of doOrder.items) {
      if (item.batchId) {
        // Manual batch selection override (BR-08): Validate batch is not expired (BR-09)
        const batch = item.batch ?? (await tx.batch.findUnique({ where: { id: item.batchId } }));
        if (batch?.expiryDate) {
          const expDate = new Date(batch.expiryDate);
          expDate.setHours(0, 0, 0, 0);
          if (expDate < todayStart) {
            throw new AppError(
              'VALIDATION_ERROR',
              `Batch '${batch.batchNo}' sudah kedaluwarsa dan tidak boleh dikirim (BR-09)`,
            );
          }
        }

        // Deduct stock for manual batch
        await applyStockMovement(
          {
            productId: item.productId,
            locationId: item.locationId,
            batchId: item.batchId,
            movementType: 'OUT',
            quantity: item.quantity,
            refType: 'DELIVERY_ORDER',
            refId: doOrder.id,
            refNo: doOrder.orderNo,
            userId,
            notes: `Pengiriman barang DO ${doOrder.orderNo} (Batch manual ${item.batch?.batchNo || item.batchId})`,
          },
          { tx },
        );
      } else {
        // BR-08: If batch is not specified, auto-allocate using FEFO:
        // Nearest unexpired batch at that location, then largest stock
        const candidateStocks = await tx.stock.findMany({
          where: {
            productId: item.productId,
            locationId: item.locationId,
            quantity: { gt: 0 },
            batch: {
              OR: [{ expiryDate: null }, { expiryDate: { gte: todayStart } }],
            },
          },
          include: { batch: true },
          orderBy: [{ batch: { expiryDate: 'asc' } }, { quantity: 'desc' }],
        });

        // Deterministic in-memory FEFO sort (earliest expiry first, non-expiring last, largest stock secondary)
        candidateStocks.sort((a, b) => {
          if (a.batch.expiryDate && b.batch.expiryDate) {
            const diff =
              new Date(a.batch.expiryDate).getTime() - new Date(b.batch.expiryDate).getTime();
            if (diff !== 0) return diff;
          } else if (a.batch.expiryDate && !b.batch.expiryDate) {
            return -1;
          } else if (!a.batch.expiryDate && b.batch.expiryDate) {
            return 1;
          }
          return b.quantity - a.quantity;
        });

        const totalAvailable = candidateStocks.reduce((sum, s) => sum + s.quantity, 0);

        if (totalAvailable < item.quantity) {
          throw new AppError(
            'INSUFFICIENT_STOCK',
            `Stok tidak mencukupi untuk produk '${item.product.name}' (${item.product.sku}) di lokasi '${item.location.code}'. Stok tersedia: ${totalAvailable}, diminta: ${item.quantity} (BR-17)`,
            409,
            {
              productId: item.productId,
              sku: item.product.sku,
              locationId: item.locationId,
              locationCode: item.location.code,
              availableStock: totalAvailable,
              requestedQuantity: item.quantity,
            },
          );
        }

        // Check if single batch satisfies entire line item (fast path)
        const primaryStock = candidateStocks[0]!;
        if (primaryStock.quantity >= item.quantity) {
          await tx.deliveryOrderItem.update({
            where: { id: item.id },
            data: { batchId: primaryStock.batchId },
          });

          await applyStockMovement(
            {
              productId: item.productId,
              locationId: item.locationId,
              batchId: primaryStock.batchId,
              movementType: 'OUT',
              quantity: item.quantity,
              refType: 'DELIVERY_ORDER',
              refId: doOrder.id,
              refNo: doOrder.orderNo,
              userId,
              notes: `Pengiriman barang DO ${doOrder.orderNo} (FEFO Batch ${primaryStock.batch.batchNo})`,
            },
            { tx },
          );
        } else {
          // Multi-batch FEFO splitting: deplete earliest candidate batches in order (BR-08, BR-17)
          let remainingQty = item.quantity;
          let isFirstSlice = true;

          for (const stock of candidateStocks) {
            if (remainingQty <= 0) break;

            const sliceQty = Math.min(stock.quantity, remainingQty);

            if (isFirstSlice) {
              await tx.deliveryOrderItem.update({
                where: { id: item.id },
                data: {
                  batchId: stock.batchId,
                  quantity: sliceQty,
                },
              });
              isFirstSlice = false;
            } else {
              await tx.deliveryOrderItem.create({
                data: {
                  deliveryOrderId: doOrder.id,
                  productId: item.productId,
                  locationId: item.locationId,
                  batchId: stock.batchId,
                  quantity: sliceQty,
                },
              });
            }

            await applyStockMovement(
              {
                productId: item.productId,
                locationId: item.locationId,
                batchId: stock.batchId,
                movementType: 'OUT',
                quantity: sliceQty,
                refType: 'DELIVERY_ORDER',
                refId: doOrder.id,
                refNo: doOrder.orderNo,
                userId,
                notes: `Pengiriman barang DO ${doOrder.orderNo} (Split FEFO Batch ${stock.batch.batchNo})`,
              },
              { tx },
            );

            remainingQty -= sliceQty;
          }
        }
      }
    }

    // 3. Update DO status to SHIPPED
    return tx.deliveryOrder.update({
      where: { id: doOrder.id },
      data: {
        status: 'SHIPPED',
        shippedAt: new Date(),
      },
      include: {
        customer: true,
        warehouse: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: true,
            location: true,
            batch: true,
          },
        },
      },
    });
  });
}

/**
 * Cancel Delivery Order draft (BR-16, BR-18).
 * Document number is preserved (BR-15).
 */
export async function cancelDeliveryOrder(id: string, _userId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.deliveryOrder.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('NOT_FOUND', 'Dokumen pengiriman tidak ditemukan');
    }

    if (existing.status === 'SHIPPED') {
      throw new AppError(
        'INVALID_STATE',
        `Dokumen pengiriman '${existing.orderNo}' sudah berstatus SHIPPED dan tidak dapat dibatalkan (BR-18)`,
      );
    }

    if (existing.status === 'CANCELLED') {
      throw new AppError(
        'INVALID_STATE',
        `Dokumen pengiriman '${existing.orderNo}' sudah dibatalkan`,
      );
    }

    return tx.deliveryOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        customer: true,
        warehouse: true,
        items: true,
      },
    });
  });
}

/**
 * Get available unexpired batches with stock > 0 for a product at a location.
 * Annotates the FEFO-recommended batch (BR-08, BR-09).
 */
export async function getAvailableBatchesForDelivery(params: {
  productId: string;
  locationId: string;
}) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const stocks = await prisma.stock.findMany({
    where: {
      productId: params.productId,
      locationId: params.locationId,
      quantity: { gt: 0 },
      batch: {
        OR: [{ expiryDate: null }, { expiryDate: { gte: todayStart } }],
      },
    },
    include: {
      batch: true,
    },
  });

  // Sort candidate stocks with deterministic FEFO:
  // Earliest expiry first; non-expiring last; largest quantity secondary
  const sortedStocks = [...stocks].sort((a, b) => {
    if (a.batch.expiryDate && b.batch.expiryDate) {
      const diff = new Date(a.batch.expiryDate).getTime() - new Date(b.batch.expiryDate).getTime();
      if (diff !== 0) return diff;
    } else if (a.batch.expiryDate && !b.batch.expiryDate) {
      return -1;
    } else if (!a.batch.expiryDate && b.batch.expiryDate) {
      return 1;
    }
    return b.quantity - a.quantity;
  });

  return sortedStocks.map((s, index) => {
    let daysRemaining: number | null = null;
    let isNearExpiry = false;

    if (s.batch.expiryDate) {
      const msDiff = new Date(s.batch.expiryDate).getTime() - todayStart.getTime();
      daysRemaining = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
      isNearExpiry = daysRemaining <= 30; // BR-10 preview
    }

    return {
      stockId: s.id,
      batchId: s.batchId,
      batchNo: s.batch.batchNo,
      expiryDate: s.batch.expiryDate,
      availableQuantity: s.quantity,
      isFefoRecommended: index === 0,
      daysRemaining,
      isNearExpiry,
    };
  });
}
