import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';
import { getNextDocumentNumber } from './counter.service';
import { applyStockMovement } from './stock.service';
import {
  type CreateStockAdjustmentInput,
  AdjustmentReasonLabels,
} from '@/schemas/stock-adjustment.schema';
import type { Prisma, Role } from '@prisma/client';

export interface ListStockAdjustmentsOptions {
  page?: number;
  pageSize?: number;
  q?: string;
  warehouseId?: string;
  productId?: string;
  movementType?: 'ADJUST_IN' | 'ADJUST_OUT';
}

/**
 * Service to execute manual stock adjustments (BR-26).
 * Enforces:
 * - Only Manager or Admin role is authorized (BR-26).
 * - Mandatory reason category and notes explanation (BR-26).
 * - Location freezing check (BR-22).
 * - Zero-negative stock invariant (BR-01).
 * - Atomic document numbering ADJ-YYYY-XXXX (BR-15).
 * - Append-only ledger recording with running balance (BR-29, BR-30).
 */
export async function createStockAdjustment(
  input: CreateStockAdjustmentInput,
  user: { id: string; role: Role; name?: string },
) {
  // BR-26: Hanya oleh Manager/Admin
  if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
    throw new AppError(
      'FORBIDDEN',
      'Hanya Manager atau Admin yang memiliki hak akses untuk melakukan penyesuaian stok manual (BR-26)',
    );
  }

  if (!input.notes || input.notes.trim().length < 5) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Alasan penyesuaian stok wajib diisi minimal 5 karakter (BR-26)',
    );
  }

  const reasonLabel = AdjustmentReasonLabels[input.reasonCategory] || input.reasonCategory;

  return prisma.$transaction(async (tx) => {
    // Generate atomic document number ADJ-YYYY-XXXX (BR-15)
    const adjNo = await getNextDocumentNumber('ADJ', tx);

    const movementResults = [];

    for (const item of input.items) {
      const itemNote = item.itemNotes?.trim() ? ` (${item.itemNotes.trim()})` : '';
      const formattedNotes = `[${reasonLabel}] ${input.notes.trim()}${itemNote}`;

      const res = await applyStockMovement(
        {
          productId: item.productId,
          locationId: item.locationId,
          batchId: item.batchId,
          movementType: item.movementType,
          quantity: item.quantity,
          refType: 'MANUAL_ADJUSTMENT',
          refId: adjNo,
          refNo: adjNo,
          userId: user.id,
          notes: formattedNotes,
        },
        { tx },
      );

      movementResults.push(res);
    }

    return {
      adjNo,
      reasonCategory: input.reasonCategory,
      reasonLabel,
      notes: input.notes.trim(),
      itemsCount: input.items.length,
      createdAt: new Date(),
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
      },
      results: movementResults,
    };
  });
}

/**
 * List manual stock adjustments with filtering and pagination.
 */
export async function listStockAdjustments(options: ListStockAdjustmentsOptions = {}) {
  const page = Math.max(Number(options.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 20, 1), 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.StockMovementWhereInput = {
    refType: 'MANUAL_ADJUSTMENT',
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
 * Get detailed adjustment records grouped by reference document number (ADJ-YYYY-XXXX).
 */
export async function getStockAdjustmentByRefNo(refNo: string) {
  const movements = await prisma.stockMovement.findMany({
    where: {
      refType: 'MANUAL_ADJUSTMENT',
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
    throw new AppError('NOT_FOUND', `Dokumen penyesuaian stok '${refNo}' tidak ditemukan`);
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
