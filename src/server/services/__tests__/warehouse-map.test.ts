import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/server/db', () => ({
  prisma: {
    warehouse: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    location: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/server/db';
import { getWarehouseMapData } from '../warehouse-map.service';

type WarehouseListMock = Awaited<ReturnType<typeof prisma.warehouse.findMany>>;
type WarehouseItemMock = Awaited<ReturnType<typeof prisma.warehouse.findUnique>>;
type LocationListMock = Awaited<ReturnType<typeof prisma.location.findMany>>;

describe('Warehouse Map Service (T3.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockWarehouses = [
    { id: 'wh-1', code: 'WH-JKT', name: 'Gudang Jakarta' },
    { id: 'wh-2', code: 'WH-BKS', name: 'Gudang Bekasi' },
  ];

  const mockTargetWarehouse = {
    id: 'wh-1',
    code: 'WH-JKT',
    name: 'Gudang Jakarta',
    address: 'Jakarta Timur',
    isActive: true,
  };

  it('mengembalikan data denah lengkap beserta metrik okupansi dan zona', async () => {
    vi.mocked(prisma.warehouse.findMany).mockResolvedValueOnce(
      mockWarehouses as unknown as WarehouseListMock,
    );
    vi.mocked(prisma.warehouse.findUnique).mockResolvedValueOnce(
      mockTargetWarehouse as unknown as WarehouseItemMock,
    );

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 10); // expiring soon (< 30 days)

    const mockLocations = [
      {
        id: 'loc-1',
        warehouseId: 'wh-1',
        code: 'A-01-01',
        zone: 'A',
        rack: '01',
        level: '01',
        isFrozen: false,
        isActive: true,
        stocks: [
          {
            quantity: 50,
            product: {
              id: 'prod-1',
              sku: 'SKU-001',
              name: 'Indomie Goreng',
              uom: 'DUS',
              category: { name: 'Makanan' },
            },
            batch: {
              batchNo: 'BATCH-01',
              expiryDate: futureDate,
            },
          },
        ],
      },
      {
        id: 'loc-2',
        warehouseId: 'wh-1',
        code: 'A-01-02',
        zone: 'A',
        rack: '01',
        level: '02',
        isFrozen: true,
        isActive: true,
        stocks: [],
      },
      {
        id: 'loc-3',
        warehouseId: 'wh-1',
        code: 'B-01-01',
        zone: 'B',
        rack: '01',
        level: '01',
        isFrozen: false,
        isActive: true,
        stocks: [
          {
            quantity: 120, // >= 100 -> FULL
            product: {
              id: 'prod-2',
              sku: 'SKU-002',
              name: 'Minyak Goreng',
              uom: 'BOTOL',
              category: { name: 'Sembako' },
            },
            batch: {
              batchNo: 'BATCH-02',
              expiryDate: null,
            },
          },
        ],
      },
    ];

    vi.mocked(prisma.location.findMany).mockResolvedValueOnce(
      mockLocations as unknown as LocationListMock,
    );

    const result = await getWarehouseMapData({ warehouseId: 'wh-1' });

    expect(result.warehouse.code).toBe('WH-JKT');
    expect(result.availableWarehouses).toHaveLength(2);

    // Summary calculations
    expect(result.summary.totalLocations).toBe(3);
    expect(result.summary.occupiedLocations).toBe(2);
    expect(result.summary.emptyLocations).toBe(1);
    expect(result.summary.frozenLocations).toBe(1);
    expect(result.summary.totalUnits).toBe(170); // 50 + 120
    expect(result.summary.totalSkus).toBe(2);
    expect(result.summary.occupancyRate).toBe(67); // 2/3 = 66.6% -> 67%
    expect(result.summary.expiringBatchesCount).toBe(1);

    // Zones summary
    expect(result.zones).toHaveLength(2);
    const zoneA = result.zones.find((z) => z.zone === 'A');
    expect(zoneA).toBeDefined();
    expect(zoneA?.totalLocations).toBe(2);
    expect(zoneA?.occupiedLocations).toBe(1);
    expect(zoneA?.emptyLocations).toBe(1);
    expect(zoneA?.frozenLocations).toBe(1);

    // Enriched locations
    const loc1 = result.locations.find((l) => l.code === 'A-01-01');
    expect(loc1?.occupancyStatus).toBe('OCCUPIED');
    expect(loc1?.hasExpiringSoon).toBe(true);

    const loc2 = result.locations.find((l) => l.code === 'A-01-02');
    expect(loc2?.occupancyStatus).toBe('FROZEN');

    const loc3 = result.locations.find((l) => l.code === 'B-01-01');
    expect(loc3?.occupancyStatus).toBe('FULL');
  });

  it('memfilter lokasi sesuai kata kunci pencarian SKU atau kode lokasi', async () => {
    vi.mocked(prisma.warehouse.findMany).mockResolvedValueOnce(
      mockWarehouses as unknown as WarehouseListMock,
    );
    vi.mocked(prisma.warehouse.findUnique).mockResolvedValueOnce(
      mockTargetWarehouse as unknown as WarehouseItemMock,
    );

    const mockLocations = [
      {
        id: 'loc-1',
        warehouseId: 'wh-1',
        code: 'A-01-01',
        zone: 'A',
        rack: '01',
        level: '01',
        isFrozen: false,
        isActive: true,
        stocks: [
          {
            quantity: 10,
            product: {
              id: 'prod-1',
              sku: 'SKU-INDOMIE',
              name: 'Indomie Goreng',
              uom: 'PCS',
              category: { name: 'Makanan' },
            },
            batch: { batchNo: 'B1', expiryDate: null },
          },
        ],
      },
      {
        id: 'loc-2',
        warehouseId: 'wh-1',
        code: 'A-01-02',
        zone: 'A',
        rack: '01',
        level: '02',
        isFrozen: false,
        isActive: true,
        stocks: [
          {
            quantity: 5,
            product: {
              id: 'prod-2',
              sku: 'SKU-KOPI',
              name: 'Kopi Kapal Api',
              uom: 'PCS',
              category: { name: 'Minuman' },
            },
            batch: { batchNo: 'B2', expiryDate: null },
          },
        ],
      },
    ];

    vi.mocked(prisma.location.findMany).mockResolvedValueOnce(
      mockLocations as unknown as LocationListMock,
    );

    const result = await getWarehouseMapData({ warehouseId: 'wh-1', q: 'KOPI' });

    expect(result.locations).toHaveLength(1);
    expect(result.locations[0]?.code).toBe('A-01-02');
  });

  it('melempar AppError NOT_FOUND jika gudang tidak ditemukan', async () => {
    vi.mocked(prisma.warehouse.findMany).mockResolvedValueOnce(
      mockWarehouses as unknown as WarehouseListMock,
    );
    vi.mocked(prisma.warehouse.findUnique).mockResolvedValueOnce(null);

    await expect(getWarehouseMapData({ warehouseId: 'wh-unknown' })).rejects.toThrow(
      'Gudang tidak ditemukan',
    );
  });
});
