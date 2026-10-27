import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';

export type LocationOccupancyStatus = 'EMPTY' | 'OCCUPIED' | 'FULL' | 'FROZEN' | 'INACTIVE';

export interface LocationStockDetail {
  productId: string;
  sku: string;
  name: string;
  categoryName: string | null;
  batchNo: string;
  expiryDate: string | null;
  quantity: number;
  uom: string;
}

export interface EnrichedLocationCell {
  id: string;
  warehouseId: string;
  code: string;
  zone: string;
  rack: string;
  level: string;
  isFrozen: boolean;
  isActive: boolean;
  occupancyStatus: LocationOccupancyStatus;
  totalQuantity: number;
  itemCount: number;
  hasExpiringSoon: boolean;
  hasExpired: boolean;
  stocks: LocationStockDetail[];
}

export interface ZoneSummary {
  zone: string;
  totalLocations: number;
  occupiedLocations: number;
  emptyLocations: number;
  frozenLocations: number;
  totalQuantity: number;
  occupancyRate: number;
}

export interface WarehouseMapSummary {
  totalLocations: number;
  occupiedLocations: number;
  emptyLocations: number;
  frozenLocations: number;
  totalUnits: number;
  totalSkus: number;
  occupancyRate: number;
  expiringBatchesCount: number;
  expiredBatchesCount: number;
}

export interface WarehouseMapData {
  warehouse: {
    id: string;
    code: string;
    name: string;
    address: string | null;
    isActive: boolean;
  };
  availableWarehouses: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  summary: WarehouseMapSummary;
  zones: ZoneSummary[];
  locations: EnrichedLocationCell[];
}

export interface GetWarehouseMapOptions {
  warehouseId?: string;
  zone?: string;
  q?: string;
}

const FULL_OCCUPANCY_THRESHOLD = 100; // Units threshold for 'FULL' status indicator

export async function getWarehouseMapData(
  options: GetWarehouseMapOptions = {},
): Promise<WarehouseMapData> {
  // 1. Fetch available active warehouses for the switcher
  const availableWarehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: 'asc' },
  });

  if (availableWarehouses.length === 0) {
    throw new AppError('NOT_FOUND', 'Tidak ada data gudang aktif');
  }

  // Determine target warehouse
  let targetWarehouseId = options.warehouseId;
  if (!targetWarehouseId) {
    const firstWh = availableWarehouses[0];
    if (!firstWh) {
      throw new AppError('NOT_FOUND', 'Tidak ada data gudang aktif');
    }
    targetWarehouseId = firstWh.id;
  }

  // 2. Fetch target warehouse details
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: targetWarehouseId },
    select: {
      id: true,
      code: true,
      name: true,
      address: true,
      isActive: true,
    },
  });

  if (!warehouse) {
    throw new AppError('NOT_FOUND', 'Gudang tidak ditemukan');
  }

  // 3. Fetch all locations belonging to this warehouse with stock relations
  const locations = await prisma.location.findMany({
    where: {
      warehouseId: targetWarehouseId,
      ...(options.zone ? { zone: options.zone.trim().toUpperCase() } : {}),
    },
    orderBy: [{ zone: 'asc' }, { rack: 'asc' }, { level: 'asc' }, { code: 'asc' }],
    include: {
      stocks: {
        where: { quantity: { gt: 0 } },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              uom: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
          batch: {
            select: {
              batchNo: true,
              expiryDate: true,
            },
          },
        },
      },
    },
  });

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const distinctSkus = new Set<string>();
  let expiringBatchesCount = 0;
  let expiredBatchesCount = 0;

  // 4. Enrich locations
  const enrichedLocations: EnrichedLocationCell[] = locations.map((loc) => {
    let totalQuantity = 0;
    let hasExpiringSoon = false;
    let hasExpired = false;

    const stocks: LocationStockDetail[] = [];

    for (const s of loc.stocks) {
      totalQuantity += s.quantity;
      distinctSkus.add(s.product.id);

      if (s.batch.expiryDate) {
        const expDate = new Date(s.batch.expiryDate);
        if (expDate < now) {
          hasExpired = true;
          expiredBatchesCount += 1;
        } else if (expDate <= thirtyDaysFromNow) {
          hasExpiringSoon = true;
          expiringBatchesCount += 1;
        }
      }

      stocks.push({
        productId: s.product.id,
        sku: s.product.sku,
        name: s.product.name,
        categoryName: s.product.category?.name ?? null,
        batchNo: s.batch.batchNo,
        expiryDate: s.batch.expiryDate ? s.batch.expiryDate.toISOString() : null,
        quantity: s.quantity,
        uom: s.product.uom,
      });
    }

    let occupancyStatus: LocationOccupancyStatus = 'EMPTY';
    if (!loc.isActive) {
      occupancyStatus = 'INACTIVE';
    } else if (loc.isFrozen) {
      occupancyStatus = 'FROZEN';
    } else if (totalQuantity === 0) {
      occupancyStatus = 'EMPTY';
    } else if (totalQuantity >= FULL_OCCUPANCY_THRESHOLD) {
      occupancyStatus = 'FULL';
    } else {
      occupancyStatus = 'OCCUPIED';
    }

    return {
      id: loc.id,
      warehouseId: loc.warehouseId,
      code: loc.code,
      zone: loc.zone,
      rack: loc.rack,
      level: loc.level,
      isFrozen: loc.isFrozen,
      isActive: loc.isActive,
      occupancyStatus,
      totalQuantity,
      itemCount: stocks.length,
      hasExpiringSoon,
      hasExpired,
      stocks,
    };
  });

  // Optional search query filter (matches SKU, product name, batch, or location code)
  let filteredLocations = enrichedLocations;
  if (options.q?.trim()) {
    const query = options.q.trim().toLowerCase();
    filteredLocations = enrichedLocations.filter((loc) => {
      const matchCode = loc.code.toLowerCase().includes(query);
      const matchZone = loc.zone.toLowerCase().includes(query);
      const matchRack = loc.rack.toLowerCase().includes(query);
      const matchStock = loc.stocks.some(
        (s) =>
          s.sku.toLowerCase().includes(query) ||
          s.name.toLowerCase().includes(query) ||
          s.batchNo.toLowerCase().includes(query) ||
          (s.categoryName && s.categoryName.toLowerCase().includes(query)),
      );
      return matchCode || matchZone || matchRack || matchStock;
    });
  }

  // 5. Zone summaries calculation (calculated on full warehouse locations for this warehouse)
  const zoneMap = new Map<string, ZoneSummary>();
  for (const loc of enrichedLocations) {
    let z = zoneMap.get(loc.zone);
    if (!z) {
      z = {
        zone: loc.zone,
        totalLocations: 0,
        occupiedLocations: 0,
        emptyLocations: 0,
        frozenLocations: 0,
        totalQuantity: 0,
        occupancyRate: 0,
      };
      zoneMap.set(loc.zone, z);
    }

    z.totalLocations += 1;
    z.totalQuantity += loc.totalQuantity;
    if (loc.isFrozen) {
      z.frozenLocations += 1;
    }
    if (loc.totalQuantity > 0) {
      z.occupiedLocations += 1;
    } else {
      z.emptyLocations += 1;
    }
  }

  const zones: ZoneSummary[] = Array.from(zoneMap.values())
    .map((z) => ({
      ...z,
      occupancyRate:
        z.totalLocations > 0 ? Math.round((z.occupiedLocations / z.totalLocations) * 100) : 0,
    }))
    .sort((a, b) => a.zone.localeCompare(b.zone));

  // 6. Overall warehouse summary
  const totalLocations = enrichedLocations.length;
  const occupiedLocations = enrichedLocations.filter((l) => l.totalQuantity > 0).length;
  const emptyLocations = enrichedLocations.filter((l) => l.totalQuantity === 0).length;
  const frozenLocations = enrichedLocations.filter((l) => l.isFrozen).length;
  const totalUnits = enrichedLocations.reduce((sum, l) => sum + l.totalQuantity, 0);
  const occupancyRate =
    totalLocations > 0 ? Math.round((occupiedLocations / totalLocations) * 100) : 0;

  const summary: WarehouseMapSummary = {
    totalLocations,
    occupiedLocations,
    emptyLocations,
    frozenLocations,
    totalUnits,
    totalSkus: distinctSkus.size,
    occupancyRate,
    expiringBatchesCount,
    expiredBatchesCount,
  };

  return {
    warehouse,
    availableWarehouses,
    summary,
    zones,
    locations: filteredLocations,
  };
}
