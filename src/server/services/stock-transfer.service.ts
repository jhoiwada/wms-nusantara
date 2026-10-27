import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';
import { getNextDocumentNumber } from './counter.service';
import { applyStockMovement } from './stock.service';
import type { CreateStockTransferInput } from '@/schemas/stock-transfer.schema';
import type { Prisma, Role } from '@prisma/client';

export interface ListStockTransfersOptions {
  page?: number;
  pageSize?: number;
  q?: string;
  warehouseId?: string;
  productId?: string;
  movementType?: 'TRANSFER_IN' | 'TRANSFER_OUT';
}

/**
 * Core atomic stock transfer service (BR-27, BR-28).
 * Enforces:
 * - Source and target location must be different (BR-28).
 * - Target location inherits batch and expiry date (BR-28).
 * - Atomic execution: TRANSFER_OUT at source and TRANSFER_IN at target in single transaction (BR-27).
 * - Zero-negative stock invariant (BR-01): fails with INSUFFICIENT_STOCK if source stock < quantity.
 * - Both source and destination locations must NOT be frozen (BR-22).
 * - Both locations and products must be active (BR-32).
 * - Document numbering: TR-YYYY-XXXX (BR-15).
 */
export async function createStockTransfer(
  input: CreateStockTransferInput,
  user: { id: string; role: Role; name?: string },
) {
  // BR-35: Viewer tidak diizinkan
  if (user.role === 'VIEWER') {
    throw new AppError(
      'FORBIDDEN',
      'Pengguna dengan peran Viewer tidak diizinkan melakukan transfer stok (BR-35)',
    );
  }

  // Pre-validate all items
  for (const item of input.items) {
    if (item.sourceLocationId === item.targetLocationId) {
      throw new AppError('VALIDATION_ERROR', 'Lokasi asal dan tujuan tidak boleh sama (BR-28)');
    }

    const [sourceLoc, targetLoc] = await Promise.all([
      prisma.location.findUnique({
        where: { id: item.sourceLocationId },
        include: { warehouse: true },
      }),
      prisma.location.findUnique({
        where: { id: item.targetLocationId },
        include: { warehouse: true },
      }),
    ]);

    if (!sourceLoc) {
      throw new AppError('NOT_FOUND', `Lokasi rak asal '${item.sourceLocationId}' tidak ditemukan`);
    }
    if (!targetLoc) {
      throw new AppError(
        'NOT_FOUND',
        `Lokasi rak tujuan '${item.targetLocationId}' tidak ditemukan`,
      );
    }

    if (!sourceLoc.isActive) {
      throw new AppError('VALIDATION_ERROR', `Lokasi asal '${sourceLoc.code}' tidak aktif (BR-32)`);
    }
    if (!targetLoc.isActive) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Lokasi tujuan '${targetLoc.code}' tidak aktif (BR-32)`,
      );
    }

    if (sourceLoc.isFrozen) {
      throw new AppError(
        'INVALID_STATE',
        `Lokasi rak asal '${sourceLoc.code}' sedang dibekukan karena proses opname (BR-22)`,
      );
    }
    if (targetLoc.isFrozen) {
      throw new AppError(
        'INVALID_STATE',
        `Lokasi rak tujuan '${targetLoc.code}' sedang dibekukan karena proses opname (BR-22)`,
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    // Generate atomic document number TR-YYYY-XXXX (BR-15)
    const transferNo = await getNextDocumentNumber('TR', tx);

    const pairResults = [];

    for (const item of input.items) {
      const sourceLoc = await tx.location.findUnique({
        where: { id: item.sourceLocationId },
        select: { code: true },
      });
      const targetLoc = await tx.location.findUnique({
        where: { id: item.targetLocationId },
        select: { code: true },
      });

      const noteSuffix = input.notes?.trim() ? ` - ${input.notes.trim()}` : '';
      const itemNote = item.itemNotes?.trim() ? ` (${item.itemNotes.trim()})` : '';

      // 1. TRANSFER_OUT at source location (BR-27)
      const outResult = await applyStockMovement(
        {
          productId: item.productId,
          locationId: item.sourceLocationId,
          batchId: item.batchId,
          movementType: 'TRANSFER_OUT',
          quantity: item.quantity,
          refType: 'STOCK_TRANSFER',
          refId: transferNo,
          refNo: transferNo,
          userId: user.id,
          notes: `Transfer ke rak ${targetLoc?.code || item.targetLocationId}${noteSuffix}${itemNote}`,
        },
        { tx },
      );

      // 2. TRANSFER_IN at destination location (BR-27, batch & expiry inherited per BR-28)
      const inResult = await applyStockMovement(
        {
          productId: item.productId,
          locationId: item.targetLocationId,
          batchId: item.batchId,
          movementType: 'TRANSFER_IN',
          quantity: item.quantity,
          refType: 'STOCK_TRANSFER',
          refId: transferNo,
          refNo: transferNo,
          userId: user.id,
          notes: `Transfer dari rak ${sourceLoc?.code || item.sourceLocationId}${noteSuffix}${itemNote}`,
        },
        { tx },
      );

      pairResults.push({
        productId: item.productId,
        batchId: item.batchId,
        sourceLocationId: item.sourceLocationId,
        targetLocationId: item.targetLocationId,
        quantity: item.quantity,
        outMovement: outResult.movement,
        inMovement: inResult.movement,
      });
    }

    return {
      transferNo,
      notes: input.notes?.trim() || null,
      createdAt: new Date(),
      itemsCount: input.items.length,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      results: pairResults,
    };
  });
}

/**
 * List stock transfer movements with pagination and search.
 */
export async function listStockTransfers(options: ListStockTransfersOptions = {}) {
  const page = Math.max(Number(options.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 20, 1), 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.StockMovementWhereInput = {
    refType: 'STOCK_TRANSFER',
  };

  if (options.movementType) {
    where.movementType = options.movementType;
  }

  if (options.productId) {
    where.productId = options.productId;
  }

  if (options.warehouseId) {
    where.location = {
      warehouseId: options.warehouseId,
    };
  }

  if (options.q?.trim()) {
    const query = options.q.trim();
    where.OR = [
      { refNo: { contains: query, mode: 'insensitive' } },
      { notes: { contains: query, mode: 'insensitive' } },
      { product: { name: { contains: query, mode: 'insensitive' } } },
      { product: { sku: { contains: query, mode: 'insensitive' } } },
      { batch: { batchNo: { contains: query, mode: 'insensitive' } } },
      { location: { code: { contains: query, mode: 'insensitive' } } },
      { user: { name: { contains: query, mode: 'insensitive' } } },
    ];
  }

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
            zone: true,
            rack: true,
            level: true,
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
            role: true,
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

/**
 * Get detailed stock transfer records by document number (TR-YYYY-XXXX).
 */
export async function getStockTransferByRefNo(refNo: string) {
  const movements = await prisma.stockMovement.findMany({
    where: {
      refType: 'STOCK_TRANSFER',
      refNo,
    },
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
          zone: true,
          rack: true,
          level: true,
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
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (movements.length === 0) {
    throw new AppError('NOT_FOUND', `Dokumen transfer stok '${refNo}' tidak ditemukan`);
  }

  const first = movements[0]!;

  return {
    refNo,
    createdAt: first.createdAt,
    user: first.user,
    notes: first.notes,
    items: movements.map((m) => ({
      id: m.id,
      product: m.product,
      location: m.location,
      batch: m.batch,
      movementType: m.movementType,
      quantity: m.quantity,
      balanceAfter: m.balanceAfter,
      notes: m.notes,
      createdAt: m.createdAt,
    })),
  };
}
