import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma singleton
vi.mock('@/server/db', () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    $queryRaw: vi.fn(),
    warehouse: {
      findUnique: vi.fn(),
    },
    location: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
    batch: {
      findUnique: vi.fn(),
    },
    stock: {
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    documentCounter: {
      upsert: vi.fn(),
    },
    stockOpname: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    stockOpnameItem: {
      findUnique: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '@/server/db';
import {
  createStockOpname,
  updateStockOpnameCounts,
  submitStockOpname,
  approveStockOpname,
  rejectStockOpname,
  cancelStockOpname,
} from '../stock-opname.service';

describe('Stock Opname Service (BR-20 s.d. BR-26)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockWarehouse = {
    id: 'wh-1',
    code: 'WH-JKT',
    name: 'Gudang Utama Jakarta',
    isActive: true,
  };

  const mockLocations = [
    {
      id: 'loc-1',
      code: 'A-01-01',
      warehouseId: 'wh-1',
      zone: 'A',
      rack: '01',
      level: '01',
      isFrozen: false,
      isActive: true,
    },
    {
      id: 'loc-2',
      code: 'A-01-02',
      warehouseId: 'wh-1',
      zone: 'A',
      rack: '01',
      level: '02',
      isFrozen: false,
      isActive: true,
    },
  ];

  const mockStocks = [
    {
      id: 'stock-1',
      productId: 'prod-1',
      locationId: 'loc-1',
      batchId: 'batch-1',
      quantity: 50,
      product: { id: 'prod-1', sku: 'SKU-001', name: 'Barang A', isActive: true },
      batch: { id: 'batch-1', productId: 'prod-1', batchNo: 'BATCH-01', expiryDate: null },
    },
    {
      id: 'stock-2',
      productId: 'prod-2',
      locationId: 'loc-2',
      batchId: 'batch-2',
      quantity: 20,
      product: { id: 'prod-2', sku: 'SKU-002', name: 'Barang B', isActive: true },
      batch: { id: 'batch-2', productId: 'prod-2', batchNo: 'BATCH-02', expiryDate: null },
    },
  ];

  describe('createStockOpname (BR-21, BR-22)', () => {
    it('creates snapshot and freezes scoped locations with DRAFT status', async () => {
      vi.mocked(prisma.warehouse.findUnique).mockResolvedValue(mockWarehouse as never);
      vi.mocked(prisma.location.findMany).mockResolvedValue(mockLocations as never);
      vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks as never);
      vi.mocked(prisma.documentCounter.upsert).mockResolvedValue({ currentValue: 1 } as never);
      vi.mocked(prisma.location.updateMany).mockResolvedValue({ count: 2 } as never);
      vi.mocked(prisma.stockOpname.create).mockResolvedValue({
        id: 'so-1',
        opnameNo: 'SO-2026-0001',
        warehouseId: 'wh-1',
        status: 'DRAFT',
        notes: JSON.stringify({ text: 'Rutin bulanan', locationIds: ['loc-1', 'loc-2'] }),
        createdById: 'user-staff',
      } as never);
      vi.mocked(prisma.stockOpnameItem.createMany).mockResolvedValue({ count: 2 } as never);

      const result = await createStockOpname(
        {
          warehouseId: 'wh-1',
          locationIds: ['loc-1', 'loc-2'],
          notes: 'Rutin bulanan',
        },
        'user-staff',
      );

      // Verifikasi pembekuan lokasi (BR-22)
      expect(prisma.location.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['loc-1', 'loc-2'] } },
        data: { isFrozen: true },
      });

      // Verifikasi pembuatan snapshot (BR-21)
      expect(prisma.stockOpnameItem.createMany).toHaveBeenCalledWith({
        data: [
          {
            stockOpnameId: 'so-1',
            productId: 'prod-1',
            locationId: 'loc-1',
            batchId: 'batch-1',
            systemQty: 50,
            physicalQty: null,
            difference: null,
            notes: null,
          },
          {
            stockOpnameId: 'so-1',
            productId: 'prod-2',
            locationId: 'loc-2',
            batchId: 'batch-2',
            systemQty: 20,
            physicalQty: null,
            difference: null,
            notes: null,
          },
        ],
      });

      expect(result.opnameNo).toBe('SO-2026-0001');
      expect(result.status).toBe('DRAFT');
    });

    it('rejects creation if any target location is already frozen (BR-22)', async () => {
      vi.mocked(prisma.warehouse.findUnique).mockResolvedValue(mockWarehouse as never);
      const frozenLocations = [{ ...mockLocations[0], isFrozen: true }, mockLocations[1]];
      vi.mocked(prisma.location.findMany).mockResolvedValue(frozenLocations as never);

      await expect(
        createStockOpname(
          {
            warehouseId: 'wh-1',
            locationIds: ['loc-1', 'loc-2'],
          },
          'user-staff',
        ),
      ).rejects.toThrow(/sedang dibekukan oleh proses opname lain/);
    });
  });

  describe('updateStockOpnameCounts (BR-21)', () => {
    it('updates physicalQty and computes difference = physicalQty - systemQty', async () => {
      vi.mocked(prisma.stockOpname.findUnique).mockResolvedValue({
        id: 'so-1',
        status: 'DRAFT',
      } as never);

      vi.mocked(prisma.stockOpnameItem.findUnique).mockResolvedValue({
        id: 'item-1',
        stockOpnameId: 'so-1',
        systemQty: 50,
        notes: null,
      } as never);

      vi.mocked(prisma.stockOpnameItem.update).mockResolvedValue({} as never);
      vi.mocked(prisma.stockOpname.update).mockResolvedValue({} as never);

      // Mock getStockOpnameById return
      vi.mocked(prisma.stockOpname.findUnique).mockImplementation((args) => {
        if (args?.include) {
          return Promise.resolve({
            id: 'so-1',
            opnameNo: 'SO-2026-0001',
            status: 'DRAFT',
            notes: null,
            warehouse: mockWarehouse,
            createdBy: { id: 'user-staff', name: 'Staff' },
            items: [
              {
                id: 'item-1',
                systemQty: 50,
                physicalQty: 55,
                difference: 5,
                notes: 'Kelebihan 5 pcs',
                product: mockStocks[0]!.product,
                location: mockLocations[0]!,
                batch: mockStocks[0]!.batch,
              },
            ],
          }) as never;
        }
        return Promise.resolve({ id: 'so-1', status: 'DRAFT' }) as never;
      });

      const result = await updateStockOpnameCounts(
        'so-1',
        {
          items: [{ id: 'item-1', physicalQty: 55, notes: 'Kelebihan 5 pcs' }],
        },
        'user-staff',
      );

      // Verifikasi update difference = 55 - 50 = 5
      expect(prisma.stockOpnameItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: {
          physicalQty: 55,
          difference: 5,
          notes: 'Kelebihan 5 pcs',
        },
      });

      expect(result.items[0]?.difference).toBe(5);
    });

    it('rejects count updates when status is not DRAFT', async () => {
      vi.mocked(prisma.stockOpname.findUnique).mockResolvedValue({
        id: 'so-1',
        status: 'SUBMITTED',
      } as never);

      await expect(
        updateStockOpnameCounts(
          'so-1',
          { items: [{ id: 'item-1', physicalQty: 10 }] },
          'user-staff',
        ),
      ).rejects.toThrow(/hanya dapat diubah saat dokumen berstatus DRAFT/i);
    });
  });

  describe('submitStockOpname (BR-20, BR-21)', () => {
    it('transitions status from DRAFT to SUBMITTED when all items are counted', async () => {
      vi.mocked(prisma.stockOpname.findUnique).mockResolvedValue({
        id: 'so-1',
        status: 'DRAFT',
        items: [
          { id: 'item-1', physicalQty: 50 },
          { id: 'item-2', physicalQty: 18 },
        ],
      } as never);

      vi.mocked(prisma.stockOpname.update).mockResolvedValue({
        id: 'so-1',
        status: 'SUBMITTED',
      } as never);

      const result = await submitStockOpname('so-1', 'user-staff');
      expect(result.status).toBe('SUBMITTED');
    });

    it('rejects submission if any item is not yet counted (BR-21)', async () => {
      vi.mocked(prisma.stockOpname.findUnique).mockResolvedValue({
        id: 'so-1',
        status: 'DRAFT',
        items: [
          { id: 'item-1', physicalQty: 50 },
          { id: 'item-2', physicalQty: null }, // belum dihitung
        ],
      } as never);

      await expect(submitStockOpname('so-1', 'user-staff')).rejects.toThrow(
        /belum dihitung fisiknya/,
      );
    });
  });

  describe('approveStockOpname (BR-23, BR-24)', () => {
    const mockSubmittedOpname = {
      id: 'so-1',
      opnameNo: 'SO-2026-0001',
      warehouseId: 'wh-1',
      status: 'SUBMITTED',
      notes: JSON.stringify({ text: null, locationIds: ['loc-1', 'loc-2'] }),
      createdById: 'user-staff',
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          locationId: 'loc-1',
          batchId: 'batch-1',
          systemQty: 50,
          physicalQty: 55,
          difference: 5, // Kelebihan 5 -> ADJUST_IN
          notes: null,
        },
        {
          id: 'item-2',
          productId: 'prod-2',
          locationId: 'loc-2',
          batchId: 'batch-2',
          systemQty: 20,
          physicalQty: 18,
          difference: -2, // Kekurangan 2 -> ADJUST_OUT
          notes: null,
        },
      ],
    };

    it('enforces Four-Eyes Principle: creator cannot approve own opname (BR-23)', async () => {
      vi.mocked(prisma.stockOpname.findUnique).mockResolvedValue(mockSubmittedOpname as never);

      await expect(
        approveStockOpname('so-1', {
          id: 'user-staff', // SAME user as createdById
          role: 'MANAGER',
        }),
      ).rejects.toThrow(/Prinsip four-eyes \(BR-23\)/);
    });

    it('enforces Role: STAFF or VIEWER cannot approve opname (BR-23)', async () => {
      await expect(
        approveStockOpname('so-1', {
          id: 'user-other',
          role: 'STAFF',
        }),
      ).rejects.toThrow(/Hanya Manager atau Admin/);
    });

    it('atomically reconciles stock differences and unfreezes locations on approval (BR-24)', async () => {
      vi.mocked(prisma.stockOpname.findUnique).mockResolvedValue(mockSubmittedOpname as never);
      vi.mocked(prisma.location.updateMany).mockResolvedValue({ count: 2 } as never);

      // Mock dependencies for applyStockMovement
      vi.mocked(prisma.product.findUnique).mockImplementation((args) => {
        if (args.where.id === 'prod-1') return Promise.resolve(mockStocks[0]!.product) as never;
        return Promise.resolve(mockStocks[1]!.product) as never;
      });
      vi.mocked(prisma.location.findUnique).mockImplementation((args) => {
        if (args.where.id === 'loc-1') return Promise.resolve(mockLocations[0]!) as never;
        return Promise.resolve(mockLocations[1]!) as never;
      });
      vi.mocked(prisma.batch.findUnique).mockImplementation((args) => {
        if (args.where.id === 'batch-1') return Promise.resolve(mockStocks[0]!.batch) as never;
        return Promise.resolve(mockStocks[1]!.batch) as never;
      });

      // Row locking mocks
      vi.mocked(prisma.$queryRaw).mockImplementation(
        () => Promise.resolve([{ id: 'stock-1', quantity: 50 }]) as never,
      );

      vi.mocked(prisma.stock.update).mockResolvedValue({} as never);
      vi.mocked(prisma.stockMovement.create).mockResolvedValue({} as never);
      vi.mocked(prisma.stockOpname.update).mockResolvedValue({
        id: 'so-1',
        status: 'APPROVED',
        approvedById: 'user-manager',
      } as never);

      const result = await approveStockOpname('so-1', {
        id: 'user-manager',
        role: 'MANAGER',
      });

      // Verifikasi unfreezing lokasi rak (BR-24)
      expect(prisma.location.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['loc-1', 'loc-2'] } },
        data: { isFrozen: false },
      });

      // Verifikasi pencatatan mutasi penyesuaian (ADJUST_IN & ADJUST_OUT)
      expect(prisma.stockMovement.create).toHaveBeenCalledTimes(2);

      expect(result.status).toBe('APPROVED');
    });
  });

  describe('rejectStockOpname (BR-23, BR-25)', () => {
    const mockSubmittedOpname = {
      id: 'so-1',
      createdById: 'user-staff',
      status: 'SUBMITTED',
      notes: JSON.stringify({ text: null, locationIds: ['loc-1'] }),
      items: [{ locationId: 'loc-1' }],
    };

    it('enforces four-eyes principle on rejection (BR-23)', async () => {
      vi.mocked(prisma.stockOpname.findUnique).mockResolvedValue(mockSubmittedOpname as never);

      await expect(
        rejectStockOpname(
          'so-1',
          { rejectionReason: 'Salah hitung' },
          { id: 'user-staff', role: 'MANAGER' },
        ),
      ).rejects.toThrow(/Prinsip four-eyes \(BR-23\)/);
    });

    it('unfreezes locations without changing stock on rejection (BR-25)', async () => {
      vi.mocked(prisma.stockOpname.findUnique).mockResolvedValue(mockSubmittedOpname as never);
      vi.mocked(prisma.location.updateMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.stockOpname.update).mockResolvedValue({
        id: 'so-1',
        status: 'REJECTED',
        rejectionReason: 'Perlu hitung ulang karena batch tertukar',
      } as never);

      const result = await rejectStockOpname(
        'so-1',
        { rejectionReason: 'Perlu hitung ulang karena batch tertukar' },
        { id: 'user-manager', role: 'MANAGER' },
      );

      // Lokasi dibuka kembali
      expect(prisma.location.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['loc-1'] } },
        data: { isFrozen: false },
      });

      // Tidak ada pergerakan stok
      expect(prisma.stockMovement.create).not.toHaveBeenCalled();
      expect(prisma.stock.update).not.toHaveBeenCalled();

      expect(result.status).toBe('REJECTED');
    });
  });

  describe('cancelStockOpname', () => {
    it('unfreezes locations and deletes draft opname', async () => {
      vi.mocked(prisma.stockOpname.findUnique).mockResolvedValue({
        id: 'so-1',
        status: 'DRAFT',
        createdById: 'user-staff',
        notes: JSON.stringify({ text: null, locationIds: ['loc-1'] }),
        items: [],
      } as never);
      vi.mocked(prisma.location.updateMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.stockOpname.delete).mockResolvedValue({} as never);

      const result = await cancelStockOpname('so-1', {
        id: 'user-staff',
        role: 'STAFF',
      });

      expect(prisma.location.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['loc-1'] } },
        data: { isFrozen: false },
      });
      expect(prisma.stockOpname.delete).toHaveBeenCalledWith({
        where: { id: 'so-1' },
      });
      expect(result.success).toBe(true);
    });
  });
});
