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

export interface StockSummaryByProductOptions {
  q?: string;
  categoryId?: string;
  warehouseId?: string;
  lowStockOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getStockSummaryByProduct(options: StockSummaryByProductOptions = {}) {
  const page = Math.max(Number(options.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 20, 1), 100);
  const skip = (page - 1) * pageSize;

  const now = new Date();
  const where: Prisma.ProductWhereInput = {
    isActive: true,
  };

  if (options.categoryId) {
    where.categoryId = options.categoryId;
  }

  if (options.q?.trim()) {
    const query = options.q.trim();
    where.OR = [
      { sku: { contains: query, mode: 'insensitive' } },
      { name: { contains: query, mode: 'insensitive' } },
      { barcode: { contains: query, mode: 'insensitive' } },
    ];
  }

  // Fetch products with their stocks filtered by warehouse if specified
  const stockWhere: Prisma.StockWhereInput = {
    quantity: { gt: 0 },
  };
  if (options.warehouseId) {
    stockWhere.location = { warehouseId: options.warehouseId };
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: 'asc' },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        stocks: {
          where: stockWhere,
          include: {
            batch: true,
            location: {
              include: {
                warehouse: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const items = products.map((prod) => {
    let totalQuantity = 0;
    let availableQuantity = 0;
    let expiredQuantity = 0;
    const warehouseMap = new Map<
      string,
      { id: string; code: string; name: string; quantity: number }
    >();

    for (const s of prod.stocks) {
      totalQuantity += s.quantity;

      const isExpired = s.batch?.expiryDate && new Date(s.batch.expiryDate) < now;
      if (isExpired) {
        expiredQuantity += s.quantity;
      } else {
        availableQuantity += s.quantity;
      }

      const wh = s.location.warehouse;
      const existingWh = warehouseMap.get(wh.id);
      if (existingWh) {
        existingWh.quantity += s.quantity;
      } else {
        warehouseMap.set(wh.id, {
          id: wh.id,
          code: wh.code,
          name: wh.name,
          quantity: s.quantity,
        });
      }
    }

    const costPriceNum = Number(prod.costPrice) || 0;
    const totalValue = totalQuantity * costPriceNum;
    const isLowStock = availableQuantity <= prod.minStock;

    return {
      product: {
        id: prod.id,
        sku: prod.sku,
        barcode: prod.barcode,
        name: prod.name,
        uom: prod.uom,
        minStock: prod.minStock,
        costPrice: prod.costPrice,
        trackExpiry: prod.trackExpiry,
        category: prod.category,
      },
      totalQuantity,
      availableQuantity,
      expiredQuantity,
      totalValue,
      isLowStock,
      warehouses: Array.from(warehouseMap.values()),
    };
  });

  const filteredItems = options.lowStockOnly ? items.filter((i) => i.isLowStock) : items;

  return {
    data: filteredItems,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

export interface StockSummaryByLocationOptions {
  warehouseId?: string;
  zone?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function getStockSummaryByLocation(options: StockSummaryByLocationOptions = {}) {
  const page = Math.max(Number(options.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 20, 1), 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.LocationWhereInput = {
    isActive: true,
  };

  if (options.warehouseId) {
    where.warehouseId = options.warehouseId;
  }
  if (options.zone) {
    where.zone = options.zone;
  }
  if (options.q?.trim()) {
    const query = options.q.trim();
    where.OR = [
      { code: { contains: query, mode: 'insensitive' } },
      { warehouse: { name: { contains: query, mode: 'insensitive' } } },
    ];
  }

  const [total, locations] = await Promise.all([
    prisma.location.count({ where }),
    prisma.location.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ warehouseId: 'asc' }, { code: 'asc' }],
      include: {
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        stocks: {
          where: { quantity: { gt: 0 } },
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                uom: true,
                trackExpiry: true,
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
    }),
  ]);

  const items = locations.map((loc) => {
    const totalQuantity = loc.stocks.reduce((sum, s) => sum + s.quantity, 0);

    return {
      location: {
        id: loc.id,
        code: loc.code,
        zone: loc.zone,
        rack: loc.rack,
        level: loc.level,
        isFrozen: loc.isFrozen,
        isActive: loc.isActive,
      },
      warehouse: loc.warehouse,
      totalQuantity,
      totalItems: loc.stocks.length,
      stocks: loc.stocks.map((s) => ({
        stockId: s.id,
        productId: s.productId,
        productName: s.product.name,
        sku: s.product.sku,
        uom: s.product.uom,
        batchNo: s.batch.batchNo,
        expiryDate: s.batch.expiryDate,
        quantity: s.quantity,
      })),
    };
  });

  return {
    data: items,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

export interface StockCardOptions {
  from?: Date | string;
  to?: Date | string;
  locationId?: string;
  warehouseId?: string;
  page?: number;
  pageSize?: number;
}

export async function getProductStockCard(productId: string, options: StockCardOptions = {}) {
  const page = Math.max(Number(options.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 50, 1), 200);
  const skip = (page - 1) * pageSize;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!product) {
    throw new AppError('NOT_FOUND', 'Produk tidak ditemukan');
  }

  const where: Prisma.StockMovementWhereInput = {
    productId,
  };

  if (options.locationId) {
    where.locationId = options.locationId;
  } else if (options.warehouseId) {
    where.location = { warehouseId: options.warehouseId };
  }

  if (options.from || options.to) {
    where.createdAt = {};
    if (options.from) where.createdAt.gte = new Date(options.from);
    if (options.to) where.createdAt.lte = new Date(options.to);
  }

  // Get current stock
  const stockRows = await prisma.stock.findMany({
    where: {
      productId,
      ...(options.locationId ? { locationId: options.locationId } : {}),
      ...(options.warehouseId ? { location: { warehouseId: options.warehouseId } } : {}),
    },
  });
  const currentStock = stockRows.reduce((sum, s) => sum + s.quantity, 0);

  const [totalMovements, movements] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
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
    product: {
      id: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      uom: product.uom,
      minStock: product.minStock,
      costPrice: product.costPrice,
      trackExpiry: product.trackExpiry,
      category: product.category,
    },
    currentStock,
    movements,
    meta: {
      page,
      pageSize,
      total: totalMovements,
      totalPages: Math.ceil(totalMovements / pageSize) || 1,
    },
  };
}

export async function getLowStockProducts(options: { warehouseId?: string } = {}) {
  const now = new Date();

  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      stocks: {
        where: options.warehouseId
          ? {
              quantity: { gt: 0 },
              location: { warehouseId: options.warehouseId },
            }
          : { quantity: { gt: 0 } },
        include: {
          batch: true,
          location: {
            include: { warehouse: true },
          },
        },
      },
    },
  });

  const lowStockItems = [];

  for (const prod of products) {
    let availableQuantity = 0;
    let totalQuantity = 0;

    for (const s of prod.stocks) {
      totalQuantity += s.quantity;
      const isExpired = s.batch?.expiryDate && new Date(s.batch.expiryDate) < now;
      if (!isExpired) {
        availableQuantity += s.quantity;
      }
    }

    if (availableQuantity <= prod.minStock) {
      lowStockItems.push({
        product: {
          id: prod.id,
          sku: prod.sku,
          name: prod.name,
          uom: prod.uom,
          minStock: prod.minStock,
          costPrice: prod.costPrice,
          category: prod.category?.name || '-',
        },
        totalQuantity,
        availableQuantity,
        deficit: Math.max(0, prod.minStock - availableQuantity),
      });
    }
  }

  return lowStockItems;
}

export type ExpiryStatus = 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'SAFE';

export interface ExpiringBatchItem {
  stockId: string;
  productId: string;
  productName: string;
  sku: string;
  uom: string;
  category: string;
  costPrice: number;
  potentialLossValue: number;
  batchId: string;
  batchNo: string;
  expiryDate: Date | null;
  daysRemaining: number;
  status: ExpiryStatus;
  quantity: number;
  locationId: string;
  locationCode: string;
  warehouseId: string;
  warehouseName: string;
}

export interface GetExpiringBatchesOptions {
  days?: number;
  warehouseId?: string;
  includeExpired?: boolean;
  status?: 'ALL' | ExpiryStatus;
}

export type ExpiringBatchesResult = ExpiringBatchItem[] & {
  summary: {
    totalBatches: number;
    expiredCount: number;
    criticalCount: number;
    warningCount: number;
    safeCount: number;
    totalPotentialLoss: number;
    totalAtRiskUnits: number;
  };
  items: ExpiringBatchItem[];
};

export async function getExpiringBatches(
  options: GetExpiringBatchesOptions = {},
): Promise<ExpiringBatchesResult> {
  const days = options.days !== undefined ? options.days : 30;
  const includeExpired = options.includeExpired !== false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + days);
  futureDate.setHours(23, 59, 59, 999);

  const expiryFilter: Prisma.DateTimeNullableFilter = includeExpired
    ? { lte: futureDate }
    : { gte: today, lte: futureDate };

  const stocks = await prisma.stock.findMany({
    where: {
      quantity: { gt: 0 },
      batch: {
        expiryDate: expiryFilter,
      },
      ...(options.warehouseId ? { location: { warehouseId: options.warehouseId } } : {}),
    },
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          uom: true,
          costPrice: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      },
      batch: true,
      location: {
        include: {
          warehouse: true,
        },
      },
    },
    orderBy: {
      batch: {
        expiryDate: 'asc',
      },
    },
  });

  const allItems: ExpiringBatchItem[] = stocks.map((s) => {
    const expDate = s.batch.expiryDate ? new Date(s.batch.expiryDate) : null;
    let daysRemaining = 9999;
    let status: ExpiryStatus = 'SAFE';

    if (expDate) {
      const expMidnight = new Date(expDate);
      expMidnight.setHours(0, 0, 0, 0);
      const diffMs = expMidnight.getTime() - today.getTime();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (daysRemaining < 0) {
        status = 'EXPIRED';
      } else if (daysRemaining <= 7) {
        status = 'CRITICAL';
      } else if (daysRemaining <= 30) {
        status = 'WARNING';
      } else {
        status = 'SAFE';
      }
    }

    const costPrice = Number(s.product.costPrice) || 0;
    const potentialLossValue = s.quantity * costPrice;

    return {
      stockId: s.id,
      productId: s.productId,
      productName: s.product.name,
      sku: s.product.sku,
      uom: s.product.uom,
      category: s.product.category?.name || 'Tanpa Kategori',
      costPrice,
      potentialLossValue,
      batchId: s.batchId,
      batchNo: s.batch.batchNo,
      expiryDate: s.batch.expiryDate,
      daysRemaining,
      status,
      quantity: s.quantity,
      locationId: s.locationId,
      locationCode: s.location.code,
      warehouseId: s.location.warehouseId,
      warehouseName: s.location.warehouse.name,
    };
  });

  let expiredCount = 0;
  let criticalCount = 0;
  let warningCount = 0;
  let safeCount = 0;
  let totalPotentialLoss = 0;
  let totalAtRiskUnits = 0;

  for (const item of allItems) {
    if (item.status === 'EXPIRED') expiredCount++;
    else if (item.status === 'CRITICAL') criticalCount++;
    else if (item.status === 'WARNING') warningCount++;
    else safeCount++;

    totalPotentialLoss += item.potentialLossValue;
    totalAtRiskUnits += item.quantity;
  }

  const filteredItems =
    options.status && options.status !== 'ALL'
      ? allItems.filter((i) => i.status === options.status)
      : allItems;

  const summary = {
    totalBatches: allItems.length,
    expiredCount,
    criticalCount,
    warningCount,
    safeCount,
    totalPotentialLoss,
    totalAtRiskUnits,
  };

  const result = Object.assign([...filteredItems], {
    summary,
    items: filteredItems,
  });

  return result as unknown as ExpiringBatchesResult;
}

/**
 * Consistency Checker: verifies that for every product,
 * SUM(stock_movements) == SUM(stock table)
 * Roadmap requirement for T1.9: "jumlah seluruh pergerakan per produk sama dengan stok di tabel stok"
 */
export async function verifyStockConsistency(productId?: string) {
  const where: Prisma.ProductWhereInput = productId ? { id: productId } : {};

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      sku: true,
      name: true,
    },
  });

  const results = [];
  let inconsistentCount = 0;

  for (const prod of products) {
    const [stockRows, movements] = await Promise.all([
      prisma.stock.findMany({
        where: { productId: prod.id },
        select: { quantity: true },
      }),
      prisma.stockMovement.findMany({
        where: { productId: prod.id },
        select: { movementType: true, quantity: true },
      }),
    ]);

    const currentStock = stockRows.reduce((sum, s) => sum + s.quantity, 0);

    let movementSum = 0;
    for (const m of movements) {
      if (INCOMING_TYPES.has(m.movementType)) {
        movementSum += m.quantity;
      } else {
        movementSum -= m.quantity;
      }
    }

    const difference = movementSum - currentStock;
    const isConsistent = difference === 0;

    if (!isConsistent) {
      inconsistentCount++;
    }

    results.push({
      productId: prod.id,
      sku: prod.sku,
      name: prod.name,
      currentStock,
      movementSum,
      difference,
      isConsistent,
    });
  }

  return {
    isConsistent: inconsistentCount === 0,
    totalCheckedProducts: products.length,
    inconsistentCount,
    results,
  };
}
