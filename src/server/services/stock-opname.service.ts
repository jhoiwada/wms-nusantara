import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';
import { getNextDocumentNumber } from './counter.service';
import { applyStockMovement } from './stock.service';
import type {
  CreateStockOpnameInput,
  UpdateStockOpnameCountsInput,
  RejectStockOpnameInput,
} from '@/schemas/stock-opname.schema';
import type { Prisma, Role, StockOpnameStatus } from '@prisma/client';

export interface ListStockOpnamesOptions {
  page?: number;
  pageSize?: number;
  q?: string;
  warehouseId?: string;
  status?: StockOpnameStatus;
}

interface ParsedNotes {
  text: string | null;
  locationIds: string[];
}

export function parseOpnameNotes(rawNotes: string | null | undefined): ParsedNotes {
  if (!rawNotes) {
    return { text: null, locationIds: [] };
  }
  try {
    const parsed = JSON.parse(rawNotes) as { text?: string | null; locationIds?: string[] };
    if (typeof parsed === 'object' && parsed !== null && Array.isArray(parsed.locationIds)) {
      return {
        text: parsed.text || null,
        locationIds: parsed.locationIds,
      };
    }
  } catch {
    // rawNotes is plain string
  }
  return { text: rawNotes, locationIds: [] };
}

export function serializeOpnameNotes(
  text: string | null | undefined,
  locationIds: string[],
): string {
  return JSON.stringify({
    text: text?.trim() || null,
    locationIds,
  });
}

/**
 * List stock opname documents with pagination, searching, and filtering.
 */
export async function listStockOpnames(options: ListStockOpnamesOptions = {}) {
  const page = Math.max(Number(options.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 20, 1), 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.StockOpnameWhereInput = {};

  if (options.status) where.status = options.status;
  if (options.warehouseId) where.warehouseId = options.warehouseId;

  if (options.q?.trim()) {
    const query = options.q.trim();
    where.OR = [
      { opnameNo: { contains: query, mode: 'insensitive' } },
      { warehouse: { name: { contains: query, mode: 'insensitive' } } },
      { createdBy: { name: { contains: query, mode: 'insensitive' } } },
    ];
  }

  const [total, rawData] = await Promise.all([
    prisma.stockOpname.count({ where }),
    prisma.stockOpname.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
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
            role: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
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

  const data = rawData.map((opname) => {
    const parsedNotes = parseOpnameNotes(opname.notes);
    return {
      ...opname,
      displayNotes: parsedNotes.text,
      targetLocationCount: parsedNotes.locationIds.length,
    };
  });

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
 * Get detailed stock opname document by ID.
 */
export async function getStockOpnameById(id: string) {
  const opname = await prisma.stockOpname.findUnique({
    where: { id },
    include: {
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
          role: true,
        },
      },
      approvedBy: {
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
              minStock: true,
              trackExpiry: true,
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
        orderBy: [{ location: { code: 'asc' } }, { product: { sku: 'asc' } }],
      },
    },
  });

  if (!opname) {
    throw new AppError('NOT_FOUND', 'Dokumen stock opname tidak ditemukan');
  }

  const parsedNotes = parseOpnameNotes(opname.notes);

  // Compute summary stats
  const totalItems = opname.items.length;
  const countedItems = opname.items.filter((i) => i.physicalQty !== null).length;
  const itemsWithDiscrepancy = opname.items.filter(
    (i) => i.difference !== null && i.difference !== 0,
  ).length;

  return {
    ...opname,
    displayNotes: parsedNotes.text,
    scopeLocationIds: parsedNotes.locationIds,
    summary: {
      totalItems,
      countedItems,
      isFullyCounted: totalItems > 0 && countedItems === totalItems,
      itemsWithDiscrepancy,
    },
  };
}

/**
 * Get warehouse locations for opname creation UI with their current stock counts and freezing status.
 */
export async function getWarehouseLocationsForOpname(warehouseId: string) {
  return prisma.location.findMany({
    where: {
      warehouseId,
      isActive: true,
    },
    orderBy: { code: 'asc' },
    include: {
      _count: {
        select: {
          stocks: {
            where: {
              quantity: { gt: 0 },
            },
          },
        },
      },
    },
  });
}

/**
 * Create a new stock opname (BR-20, BR-21, BR-22).
 * 1. Takes system stock snapshot of the target locations.
 * 2. Freezes all target locations (isFrozen = true) so no GR, DO, or transfer can modify them.
 * 3. Saves document with initial DRAFT status.
 */
export async function createStockOpname(input: CreateStockOpnameInput, userId: string) {
  // Validate warehouse
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: input.warehouseId },
  });
  if (!warehouse) {
    throw new AppError('NOT_FOUND', 'Gudang tidak ditemukan');
  }
  if (!warehouse.isActive) {
    throw new AppError('VALIDATION_ERROR', `Gudang '${warehouse.name}' tidak aktif (BR-32)`);
  }

  // Determine target locations
  let targetLocations = [];
  if (input.locationIds && input.locationIds.length > 0) {
    targetLocations = await prisma.location.findMany({
      where: {
        warehouseId: input.warehouseId,
        id: { in: input.locationIds },
        isActive: true,
      },
    });

    if (targetLocations.length !== input.locationIds.length) {
      throw new AppError(
        'NOT_FOUND',
        'Satu atau beberapa lokasi rak tidak ditemukan di gudang ini',
      );
    }
  } else {
    // If not specified, count all active locations in the warehouse
    targetLocations = await prisma.location.findMany({
      where: {
        warehouseId: input.warehouseId,
        isActive: true,
      },
    });
  }

  if (targetLocations.length === 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Tidak ada lokasi aktif di gudang ini yang dapat di-opname',
    );
  }

  // Check if any target location is already frozen (BR-22)
  const alreadyFrozen = targetLocations.filter((l) => l.isFrozen);
  if (alreadyFrozen.length > 0) {
    const codes = alreadyFrozen.map((l) => l.code).join(', ');
    throw new AppError(
      'INVALID_STATE',
      `Lokasi rak '${codes}' sedang dibekukan oleh proses opname lain (BR-22)`,
    );
  }

  const targetLocationIds = targetLocations.map((l) => l.id);

  // Query snapshot stock rows with quantity > 0
  const stocks = await prisma.stock.findMany({
    where: {
      locationId: { in: targetLocationIds },
      quantity: { gt: 0 },
    },
    include: {
      product: true,
      batch: true,
    },
    orderBy: [{ location: { code: 'asc' } }, { product: { sku: 'asc' } }],
  });

  return prisma.$transaction(async (tx) => {
    // Generate document number SO-YYYY-XXXX (BR-15)
    const opnameNo = await getNextDocumentNumber('SO', tx);

    // Freeze target locations (BR-22)
    await tx.location.updateMany({
      where: { id: { in: targetLocationIds } },
      data: { isFrozen: true },
    });

    const serializedNotes = serializeOpnameNotes(input.notes, targetLocationIds);

    // Create StockOpname header
    const opname = await tx.stockOpname.create({
      data: {
        opnameNo,
        warehouseId: input.warehouseId,
        status: 'DRAFT',
        notes: serializedNotes,
        createdById: userId,
      },
    });

    // Create snapshot items (BR-21)
    if (stocks.length > 0) {
      await tx.stockOpnameItem.createMany({
        data: stocks.map((s) => ({
          stockOpnameId: opname.id,
          productId: s.productId,
          locationId: s.locationId,
          batchId: s.batchId,
          systemQty: s.quantity,
          physicalQty: null,
          difference: null,
          notes: null,
        })),
      });
    }

    return opname;
  });
}

/**
 * Update physical count values on opname items (BR-21).
 * Allowed only when document status is DRAFT.
 * Automatically computes difference = physicalQty - systemQty.
 */
export async function updateStockOpnameCounts(
  id: string,
  input: UpdateStockOpnameCountsInput,
  _userId: string,
) {
  const opname = await prisma.stockOpname.findUnique({
    where: { id },
  });

  if (!opname) {
    throw new AppError('NOT_FOUND', 'Dokumen stock opname tidak ditemukan');
  }

  if (opname.status !== 'DRAFT') {
    throw new AppError(
      'INVALID_STATE',
      `Hitung fisik hanya dapat diubah saat dokumen berstatus DRAFT. Status saat ini: ${opname.status} (BR-20)`,
    );
  }

  // Update items inside transaction
  await prisma.$transaction(async (tx) => {
    for (const itemInput of input.items) {
      const item = await tx.stockOpnameItem.findUnique({
        where: { id: itemInput.id },
      });

      if (!item || item.stockOpnameId !== id) {
        throw new AppError(
          'NOT_FOUND',
          `Item opname dengan ID '${itemInput.id}' tidak ditemukan pada dokumen ini`,
        );
      }

      const difference = itemInput.physicalQty - item.systemQty;

      await tx.stockOpnameItem.update({
        where: { id: itemInput.id },
        data: {
          physicalQty: itemInput.physicalQty,
          difference,
          notes: itemInput.notes !== undefined ? itemInput.notes : item.notes,
        },
      });
    }

    await tx.stockOpname.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  });

  return getStockOpnameById(id);
}

/**
 * Submit stock opname for review (BR-20).
 * Transitions status from DRAFT -> SUBMITTED.
 * Enforces that all items must be counted before submission.
 */
export async function submitStockOpname(id: string, _userId: string) {
  const opname = await prisma.stockOpname.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!opname) {
    throw new AppError('NOT_FOUND', 'Dokumen stock opname tidak ditemukan');
  }

  if (opname.status !== 'DRAFT') {
    throw new AppError(
      'INVALID_STATE',
      `Hanya dokumen berstatus DRAFT yang dapat diajukan. Status saat ini: ${opname.status} (BR-20)`,
    );
  }

  // Check if any items remain uncounted
  const uncounted = opname.items.filter((i) => i.physicalQty === null);
  if (uncounted.length > 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Masih ada ${uncounted.length} item yang belum dihitung fisiknya (BR-21)`,
    );
  }

  const updated = await prisma.stockOpname.update({
    where: { id },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
    },
  });

  return updated;
}

/**
 * Helper to retrieve all location IDs that were scoped/frozen by an opname.
 */
async function getScopedLocationIds(opname: {
  notes: string | null;
  items: { locationId: string }[];
}): Promise<string[]> {
  const parsed = parseOpnameNotes(opname.notes);
  const locationIds = new Set<string>(parsed.locationIds);

  for (const item of opname.items) {
    locationIds.add(item.locationId);
  }

  return Array.from(locationIds);
}

/**
 * Approve stock opname (BR-20, BR-23, BR-24).
 * Enforces:
 * 1. Approver must have role MANAGER or ADMIN (BR-23).
 * 2. Four-eyes principle: approverId !== createdById (BR-23).
 * 3. Status must be SUBMITTED.
 * 4. Atomic execution: records ADJUST_IN or ADJUST_OUT for each non-zero difference.
 * 5. Unfreezes all scoped locations (isFrozen = false).
 * 6. Sets status to APPROVED with approvedById and approvedAt.
 */
export async function approveStockOpname(id: string, approver: { id: string; role: Role }) {
  // BR-23: Hanya Manager atau Admin
  if (approver.role !== 'MANAGER' && approver.role !== 'ADMIN') {
    throw new AppError(
      'FORBIDDEN',
      'Hanya Manager atau Admin yang boleh menyetujui stock opname (BR-23)',
    );
  }

  const opname = await prisma.stockOpname.findUnique({
    where: { id },
    include: {
      items: true,
    },
  });

  if (!opname) {
    throw new AppError('NOT_FOUND', 'Dokumen stock opname tidak ditemukan');
  }

  // BR-23 Four-eyes principle: bukan orang yang sama yang menyusun/membuat
  if (opname.createdById === approver.id) {
    throw new AppError(
      'FORBIDDEN',
      'Prinsip four-eyes (BR-23): Penyetuju opname tidak boleh sama dengan pembuat dokumen',
    );
  }

  if (opname.status !== 'SUBMITTED') {
    throw new AppError(
      'INVALID_STATE',
      `Hanya dokumen berstatus SUBMITTED yang dapat disetujui. Status saat ini: ${opname.status} (BR-20)`,
    );
  }

  // Ensure all items are counted
  const uncounted = opname.items.filter((i) => i.physicalQty === null);
  if (uncounted.length > 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Terdapat ${uncounted.length} item yang belum dihitung fisiknya`,
    );
  }

  const scopedLocationIds = await getScopedLocationIds(opname);

  return prisma.$transaction(async (tx) => {
    // Unfreeze locations in scope (BR-24)
    if (scopedLocationIds.length > 0) {
      await tx.location.updateMany({
        where: { id: { in: scopedLocationIds } },
        data: { isFrozen: false },
      });
    }

    // Apply adjustments for items with difference !== 0 (BR-24)
    for (const item of opname.items) {
      if (item.difference === null || item.difference === 0) {
        continue;
      }

      if (item.difference > 0) {
        // Kelebihan fisik -> ADJUST_IN
        await applyStockMovement(
          {
            productId: item.productId,
            locationId: item.locationId,
            batchId: item.batchId,
            movementType: 'ADJUST_IN',
            quantity: item.difference,
            refType: 'STOCK_OPNAME',
            refId: opname.id,
            refNo: opname.opnameNo,
            userId: approver.id,
            notes: item.notes || 'Penyesuaian lebih hasil stock opname',
          },
          { tx, allowFrozenLocation: true },
        );
      } else {
        // Kekurangan fisik -> ADJUST_OUT
        await applyStockMovement(
          {
            productId: item.productId,
            locationId: item.locationId,
            batchId: item.batchId,
            movementType: 'ADJUST_OUT',
            quantity: Math.abs(item.difference),
            refType: 'STOCK_OPNAME',
            refId: opname.id,
            refNo: opname.opnameNo,
            userId: approver.id,
            notes: item.notes || 'Penyesuaian kurang hasil stock opname',
          },
          { tx, allowFrozenLocation: true },
        );
      }
    }

    // Update opname status to APPROVED
    const updated = await tx.stockOpname.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: approver.id,
        approvedAt: new Date(),
      },
    });

    return updated;
  });
}

/**
 * Reject stock opname (BR-20, BR-23, BR-25).
 * Enforces:
 * 1. Approver must have role MANAGER or ADMIN (BR-23).
 * 2. Four-eyes principle: approverId !== createdById (BR-23).
 * 3. Status must be SUBMITTED (or DRAFT if rejecting draft).
 * 4. Rejection reason is required (BR-25).
 * 5. Stock is untouched.
 * 6. Scoped locations are unfrozen (isFrozen = false).
 * 7. Sets status to REJECTED.
 */
export async function rejectStockOpname(
  id: string,
  input: RejectStockOpnameInput,
  approver: { id: string; role: Role },
) {
  // BR-23: Hanya Manager atau Admin
  if (approver.role !== 'MANAGER' && approver.role !== 'ADMIN') {
    throw new AppError(
      'FORBIDDEN',
      'Hanya Manager atau Admin yang boleh menolak stock opname (BR-23)',
    );
  }

  const opname = await prisma.stockOpname.findUnique({
    where: { id },
    include: {
      items: true,
    },
  });

  if (!opname) {
    throw new AppError('NOT_FOUND', 'Dokumen stock opname tidak ditemukan');
  }

  // BR-23 Four-eyes principle
  if (opname.createdById === approver.id) {
    throw new AppError(
      'FORBIDDEN',
      'Prinsip four-eyes (BR-23): Penolak opname tidak boleh sama dengan pembuat dokumen',
    );
  }

  if (opname.status !== 'SUBMITTED' && opname.status !== 'DRAFT') {
    throw new AppError(
      'INVALID_STATE',
      `Dokumen berstatus ${opname.status} tidak dapat ditolak (BR-20)`,
    );
  }

  const scopedLocationIds = await getScopedLocationIds(opname);

  return prisma.$transaction(async (tx) => {
    // Unfreeze locations in scope (BR-25)
    if (scopedLocationIds.length > 0) {
      await tx.location.updateMany({
        where: { id: { in: scopedLocationIds } },
        data: { isFrozen: false },
      });
    }

    // Update opname status to REJECTED (BR-25)
    const updated = await tx.stockOpname.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: input.rejectionReason,
        approvedById: approver.id,
        approvedAt: new Date(),
      },
    });

    return updated;
  });
}

/**
 * Cancel or delete a DRAFT stock opname.
 * If user is creator or Manager/Admin, unfreezes locations and deletes/cancels the draft.
 */
export async function cancelStockOpname(id: string, user: { id: string; role: Role }) {
  const opname = await prisma.stockOpname.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!opname) {
    throw new AppError('NOT_FOUND', 'Dokumen stock opname tidak ditemukan');
  }

  if (opname.status !== 'DRAFT') {
    throw new AppError(
      'INVALID_STATE',
      `Hanya dokumen berstatus DRAFT yang dapat dibatalkan. Status saat ini: ${opname.status}`,
    );
  }

  // Only creator, manager, or admin can cancel draft
  if (opname.createdById !== user.id && user.role !== 'MANAGER' && user.role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Anda tidak memiliki izin untuk membatalkan draft opname ini');
  }

  const scopedLocationIds = await getScopedLocationIds(opname);

  return prisma.$transaction(async (tx) => {
    // Unfreeze locations
    if (scopedLocationIds.length > 0) {
      await tx.location.updateMany({
        where: { id: { in: scopedLocationIds } },
        data: { isFrozen: false },
      });
    }

    // Delete draft opname and items
    await tx.stockOpname.delete({
      where: { id },
    });

    return { success: true };
  });
}
