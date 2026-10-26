import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';
import { applyStockMovementSchema, type ApplyStockMovementInput } from '@/schemas/stock.schema';
import type { Prisma, StockMovement } from '@prisma/client';

const INCOMING_TYPES = new Set(['IN', 'ADJUST_IN', 'TRANSFER_IN']);

export interface StockMovementResult {
  movement: StockMovement;
  previousBalance: number;
  newBalance: number;
}

export async function getOrCreateDefaultBatch(productId: string, tx?: Prisma.TransactionClient) {
  const client = tx || prisma;

  const existing = await client.batch.findUnique({
    where: {
      productId_batchNo: {
        productId,
        batchNo: 'DEFAULT',
      },
    },
  });

  if (existing) return existing;

  return client.batch.create({
    data: {
      productId,
      batchNo: 'DEFAULT',
      expiryDate: null,
    },
  });
}

/**
 * Core atomic stock mutation engine (BR-01, BR-12, BR-17, BR-22, BR-29, BR-30).
 * Enforces:
 * - Positive integer quantity (BR-03)
 * - Active product and location (BR-32)
 * - Unfrozen location check (BR-22)
 * - Expired batch shipment rejection (BR-09)
 * - Row-level locking (SELECT ... FOR UPDATE) to prevent concurrency races
 * - Non-negative stock invariant (BR-01, BR-17)
 * - Append-only stock movement logging with running balance (BR-29, BR-30)
 */
export async function applyStockMovement(
  input: ApplyStockMovementInput,
  options?: { tx?: Prisma.TransactionClient },
): Promise<StockMovementResult> {
  const validated = applyStockMovementSchema.parse(input);

  const execute = async (tx: Prisma.TransactionClient): Promise<StockMovementResult> => {
    // 1. Validate Product (BR-32)
    const product = await tx.product.findUnique({
      where: { id: validated.productId },
    });
    if (!product) {
      throw new AppError('NOT_FOUND', 'Produk tidak ditemukan');
    }
    if (!product.isActive) {
      throw new AppError('VALIDATION_ERROR', `Produk '${product.sku}' tidak aktif (BR-32)`);
    }

    // 2. Validate Location (BR-22, BR-32)
    const location = await tx.location.findUnique({
      where: { id: validated.locationId },
    });
    if (!location) {
      throw new AppError('NOT_FOUND', 'Lokasi rak tidak ditemukan');
    }
    if (!location.isActive) {
      throw new AppError('VALIDATION_ERROR', `Lokasi '${location.code}' tidak aktif (BR-32)`);
    }
    if (location.isFrozen) {
      throw new AppError(
        'INVALID_STATE',
        `Lokasi '${location.code}' sedang dibekukan karena proses opname (BR-22)`,
      );
    }

    // 3. Validate Batch & Expiry (BR-06, BR-09)
    const batch = await tx.batch.findUnique({
      where: { id: validated.batchId },
    });
    if (!batch || batch.productId !== validated.productId) {
      throw new AppError('NOT_FOUND', 'Batch tidak ditemukan atau tidak sesuai dengan produk');
    }

    const isIncoming = INCOMING_TYPES.has(validated.movementType);

    // BR-09: Batch yang sudah kedaluwarsa tidak boleh dikirim lewat DO (movementType = OUT)
    if (
      !isIncoming &&
      validated.movementType === 'OUT' &&
      batch.expiryDate &&
      new Date(batch.expiryDate) < new Date()
    ) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Batch '${batch.batchNo}' sudah kedaluwarsa dan tidak boleh dikirim (BR-09)`,
      );
    }

    // 4. Row-level Lock (SELECT ... FOR UPDATE)
    // Query existing stock row with lock
    const lockedRows = await tx.$queryRaw<{ id: string; quantity: number }[]>`
      SELECT id, quantity
      FROM stock
      WHERE product_id = ${validated.productId}
        AND location_id = ${validated.locationId}
        AND batch_id = ${validated.batchId}
      FOR UPDATE
    `;

    const existingStock = lockedRows[0];
    const currentQty = existingStock ? existingStock.quantity : 0;
    const delta = isIncoming ? validated.quantity : -validated.quantity;
    const newBalance = currentQty + delta;

    // 5. Negative Stock Guard (BR-01, BR-17)
    if (newBalance < 0) {
      throw new AppError(
        'INSUFFICIENT_STOCK',
        `Stok tidak mencukupi untuk produk '${product.name}' (${product.sku}) di lokasi '${location.code}'. Stok tersedia: ${currentQty}, diminta: ${validated.quantity} (BR-01, BR-17)`,
        409,
        {
          productId: product.id,
          sku: product.sku,
          locationId: location.id,
          locationCode: location.code,
          availableStock: currentQty,
          requestedQuantity: validated.quantity,
        },
      );
    }

    // 6. Update or Insert Stock Row
    if (existingStock) {
      await tx.stock.update({
        where: { id: existingStock.id },
        data: { quantity: newBalance },
      });
    } else {
      await tx.stock.create({
        data: {
          productId: validated.productId,
          locationId: validated.locationId,
          batchId: validated.batchId,
          quantity: newBalance,
        },
      });
    }

    // 7. Append-only Stock Movement Audit Entry (BR-29, BR-30)
    const movement = await tx.stockMovement.create({
      data: {
        productId: validated.productId,
        locationId: validated.locationId,
        batchId: validated.batchId,
        movementType: validated.movementType,
        quantity: validated.quantity,
        balanceAfter: newBalance,
        refType: validated.refType,
        refId: validated.refId,
        refNo: validated.refNo,
        userId: validated.userId,
        notes: validated.notes || null,
      },
    });

    return {
      movement,
      previousBalance: currentQty,
      newBalance,
    };
  };

  if (options?.tx) {
    return execute(options.tx);
  }

  return prisma.$transaction((tx) => execute(tx));
}

/**
 * Apply a batch of stock movements atomically.
 * If any single movement fails, the entire transaction rolls back (BR-12, BR-17).
 */
export async function applyStockMovements(
  inputs: ApplyStockMovementInput[],
  options?: { tx?: Prisma.TransactionClient },
): Promise<StockMovementResult[]> {
  const execute = async (tx: Prisma.TransactionClient): Promise<StockMovementResult[]> => {
    const results: StockMovementResult[] = [];
    for (const input of inputs) {
      const res = await applyStockMovement(input, { tx });
      results.push(res);
    }
    return results;
  };

  if (options?.tx) {
    return execute(options.tx);
  }

  return prisma.$transaction((tx) => execute(tx));
}

export async function listStockMovements(
  options: {
    productId?: string;
    locationId?: string;
    batchId?: string;
    refNo?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const page = Math.max(Number(options.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 20, 1), 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.StockMovementWhereInput = {};

  if (options.productId) where.productId = options.productId;
  if (options.locationId) where.locationId = options.locationId;
  if (options.batchId) where.batchId = options.batchId;
  if (options.refNo) where.refNo = { contains: options.refNo, mode: 'insensitive' };

  const [total, data] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            uom: true,
          },
        },
        location: {
          select: {
            id: true,
            code: true,
            warehouse: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        batch: {
          select: {
            id: true,
            batchNo: true,
            expiryDate: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
