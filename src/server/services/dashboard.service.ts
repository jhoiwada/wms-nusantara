import { prisma } from '@/server/db';
import type { Prisma } from '@prisma/client';

const INCOMING_TYPES = new Set(['IN', 'ADJUST_IN', 'TRANSFER_IN']);

export interface DashboardSummary {
  totalInventoryValue: number;
  totalStockUnits: number;
  lowStockCount: number;
  expiringBatchesCount: number;
  draftGoodsReceipts: number;
  draftDeliveryOrders: number;
  warehouses: {
    id: string;
    code: string;
    name: string;
    activeRacks: number;
    totalUnits: number;
  }[];
}

export interface MovementChartItem {
  date: string;
  label: string;
  incomingQty: number;
  outgoingQty: number;
}

export async function getDashboardSummary(warehouseId?: string): Promise<DashboardSummary> {
  const now = new Date();
  const future30Days = new Date();
  future30Days.setDate(now.getDate() + 30);

  // Stock filter
  const stockWhere: Prisma.StockWhereInput = {
    quantity: { gt: 0 },
    ...(warehouseId ? { location: { warehouseId } } : {}),
  };

  const [allProducts, stocks, expiringStocks, draftGRCount, draftDOCount, warehousesData] =
    await Promise.all([
      // All active products for minStock check
      prisma.product.findMany({
        where: { isActive: true },
        include: {
          stocks: {
            where: stockWhere,
            include: {
              batch: true,
            },
          },
        },
      }),

      // Stock for inventory value and total units
      prisma.stock.findMany({
        where: stockWhere,
        include: {
          product: {
            select: { costPrice: true },
          },
        },
      }),

      // Expiring batches in next 30 days
      prisma.stock.findMany({
        where: {
          quantity: { gt: 0 },
          batch: {
            expiryDate: {
              gte: now,
              lte: future30Days,
            },
          },
          ...(warehouseId ? { location: { warehouseId } } : {}),
        },
      }),

      // Draft documents
      prisma.goodsReceipt.count({
        where: {
          status: 'DRAFT',
          ...(warehouseId ? { warehouseId } : {}),
        },
      }),
      prisma.deliveryOrder.count({
        where: {
          status: 'DRAFT',
          ...(warehouseId ? { warehouseId } : {}),
        },
      }),

      // Warehouse summaries
      prisma.warehouse.findMany({
        where: {
          isActive: true,
          ...(warehouseId ? { id: warehouseId } : {}),
        },
        include: {
          locations: {
            where: { isActive: true },
            include: {
              stocks: {
                where: { quantity: { gt: 0 } },
                select: { quantity: true },
              },
            },
          },
        },
      }),
    ]);

  // Total inventory value & units
  let totalInventoryValue = 0;
  let totalStockUnits = 0;
  for (const s of stocks) {
    totalStockUnits += s.quantity;
    totalInventoryValue += s.quantity * (Number(s.product.costPrice) || 0);
  }

  // Low stock products count (BR-04: available stock <= minStock)
  let lowStockCount = 0;
  for (const prod of allProducts) {
    let availableStock = 0;
    for (const s of prod.stocks) {
      const isExpired = s.batch?.expiryDate && new Date(s.batch.expiryDate) < now;
      if (!isExpired) {
        availableStock += s.quantity;
      }
    }
    if (availableStock <= prod.minStock) {
      lowStockCount++;
    }
  }

  // Warehouse breakdown
  const warehouses = warehousesData.map((wh) => {
    let totalUnits = 0;
    for (const loc of wh.locations) {
      for (const s of loc.stocks) {
        totalUnits += s.quantity;
      }
    }

    return {
      id: wh.id,
      code: wh.code,
      name: wh.name,
      activeRacks: wh.locations.length,
      totalUnits,
    };
  });

  return {
    totalInventoryValue,
    totalStockUnits,
    lowStockCount,
    expiringBatchesCount: expiringStocks.length,
    draftGoodsReceipts: draftGRCount,
    draftDeliveryOrders: draftDOCount,
    warehouses,
  };
}

/**
 * Get daily incoming vs outgoing movements for charts (BR-03).
 * Supports ranges: 7d, 30d, 90d.
 * Guaranteed continuous sequence with zero-fill for days with no movements.
 */
export async function getMovementChart(
  range: '7d' | '30d' | '90d' = '7d',
  warehouseId?: string,
): Promise<MovementChartItem[]> {
  const daysCount = range === '90d' ? 90 : range === '30d' ? 30 : 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (daysCount - 1));
  startDate.setHours(0, 0, 0, 0);

  const where: Prisma.StockMovementWhereInput = {
    createdAt: { gte: startDate },
    ...(warehouseId ? { location: { warehouseId } } : {}),
  };

  const movements = await prisma.stockMovement.findMany({
    where,
    select: {
      movementType: true,
      quantity: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Map movements by YYYY-MM-DD
  const dailyMap = new Map<string, { incoming: number; outgoing: number }>();

  for (const m of movements) {
    const dateKey = m.createdAt.toISOString().split('T')[0]!;
    const entry = dailyMap.get(dateKey) || { incoming: 0, outgoing: 0 };

    if (INCOMING_TYPES.has(m.movementType)) {
      entry.incoming += m.quantity;
    } else {
      entry.outgoing += m.quantity;
    }
    dailyMap.set(dateKey, entry);
  }

  // Generate complete continuous series
  const results: MovementChartItem[] = [];
  const curr = new Date(startDate);
  const today = new Date();

  while (curr <= today) {
    const dateKey = curr.toISOString().split('T')[0]!;
    const entry = dailyMap.get(dateKey) || { incoming: 0, outgoing: 0 };

    const label = curr.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });

    results.push({
      date: dateKey,
      label,
      incomingQty: entry.incoming,
      outgoingQty: entry.outgoing,
    });

    curr.setDate(curr.getDate() + 1);
  }

  return results;
}

export async function getRecentTransactions(limit = 10, warehouseId?: string) {
  const where: Prisma.StockMovementWhereInput = warehouseId ? { location: { warehouseId } } : {};

  return prisma.stockMovement.findMany({
    where,
    take: limit,
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
  });
}

export async function getLowStockAlerts(limit = 5, warehouseId?: string) {
  const now = new Date();

  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      stocks: {
        where: {
          quantity: { gt: 0 },
          ...(warehouseId ? { location: { warehouseId } } : {}),
        },
        include: {
          batch: true,
        },
      },
    },
  });

  const alerts = [];

  for (const prod of products) {
    let availableStock = 0;
    for (const s of prod.stocks) {
      const isExpired = s.batch?.expiryDate && new Date(s.batch.expiryDate) < now;
      if (!isExpired) {
        availableStock += s.quantity;
      }
    }

    if (availableStock <= prod.minStock) {
      alerts.push({
        id: prod.id,
        sku: prod.sku,
        name: prod.name,
        uom: prod.uom,
        minStock: prod.minStock,
        availableStock,
        deficit: Math.max(0, prod.minStock - availableStock),
        categoryName: prod.category?.name || '-',
      });
    }
  }

  // Sort by largest deficit first
  alerts.sort((a, b) => b.deficit - a.deficit);
  return alerts.slice(0, limit);
}
