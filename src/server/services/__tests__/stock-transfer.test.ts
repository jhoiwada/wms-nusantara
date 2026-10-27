import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma singleton
vi.mock('@/server/db', () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    $queryRaw: vi.fn(),
    product: {
      findUnique: vi.fn(),
    },
    location: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    batch: {
      findUnique: vi.fn(),
    },
    stock: {
      update: vi.fn(),
      create: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    documentCounter: {
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from '@/server/db';
import {
  createStockTransfer,
  listStockTransfers,
  getStockTransferByRefNo,
} from '../stock-transfer.service';

describe('Stock Transfer Service (BR-27, BR-28, BR-01, BR-03, BR-15, BR-22)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProduct = {
    id: 'prod-1',
    sku: 'SKU-001',
    name: 'Kecap Manis 600ml',
    uom: 'PCS',
    isActive: true,
  };

  const mockSourceLocation = {
    id: 'loc-src',
    code: 'A-01-01',
    warehouseId: 'wh-1',
    zone: 'A',
    rack: '01',
    level: '01',
    isFrozen: false,
    isActive: true,
    warehouse: { id: 'wh-1', code: 'WH-JKT', name: 'Gudang Jakarta' },
  };

  const mockTargetLocation = {
    id: 'loc-dst',
    code: 'B-02-01',
    warehouseId: 'wh-1',
    zone: 'B',
    rack: '02',
    level: '01',
    isFrozen: false,
    isActive: true,
    warehouse: { id: 'wh-1', code: 'WH-JKT', name: 'Gudang Jakarta' },
  };

  const mockInterWarehouseTarget = {
    id: 'loc-bks',
    code: 'A-01-01',
    warehouseId: 'wh-2',
    zone: 'A',
    rack: '01',
    level: '01',
    isFrozen: false,
    isActive: true,
    warehouse: { id: 'wh-2', code: 'WH-BKS', name: 'Gudang Bekasi' },
  };

  const mockBatch = {
    id: 'batch-1',
    productId: 'prod-1',
    batchNo: 'BATCH-2026-X',
    expiryDate: new Date('2026-12-31'),
  };

  describe('createStockTransfer (BR-27, BR-28)', () => {
    it('rejects transfer if source and target locations are the same (BR-28)', async () => {
      await expect(
        createStockTransfer(
          {
            items: [
              {
                productId: 'prod-1',
                sourceLocationId: 'loc-src',
                targetLocationId: 'loc-src', // SAME location
                batchId: 'batch-1',
                quantity: 5,
              },
            ],
          },
          { id: 'user-staff', role: 'STAFF' },
        ),
      ).rejects.toThrow(/Lokasi asal dan tujuan tidak boleh sama/);
    });

    it('rejects transfer if user has VIEWER role (BR-35)', async () => {
      await expect(
        createStockTransfer(
          {
            items: [
              {
                productId: 'prod-1',
                sourceLocationId: 'loc-src',
                targetLocationId: 'loc-dst',
                batchId: 'batch-1',
                quantity: 5,
              },
            ],
          },
          { id: 'user-viewer', role: 'VIEWER' },
        ),
      ).rejects.toThrow(/Viewer tidak diizinkan/);
    });

    it('rejects transfer if source location is frozen (BR-22)', async () => {
      vi.mocked(prisma.location.findUnique).mockImplementation((args) => {
        if (args.where.id === 'loc-src') {
          return Promise.resolve({ ...mockSourceLocation, isFrozen: true }) as never;
        }
        return Promise.resolve(mockTargetLocation) as never;
      });

      await expect(
        createStockTransfer(
          {
            items: [
              {
                productId: 'prod-1',
                sourceLocationId: 'loc-src',
                targetLocationId: 'loc-dst',
                batchId: 'batch-1',
                quantity: 5,
              },
            ],
          },
          { id: 'user-staff', role: 'STAFF' },
        ),
      ).rejects.toThrow(/sedang dibekukan karena proses opname/);
    });

    it('rejects transfer if target location is frozen (BR-22)', async () => {
      vi.mocked(prisma.location.findUnique).mockImplementation((args) => {
        if (args.where.id === 'loc-dst') {
          return Promise.resolve({ ...mockTargetLocation, isFrozen: true }) as never;
        }
        return Promise.resolve(mockSourceLocation) as never;
      });

      await expect(
        createStockTransfer(
          {
            items: [
              {
                productId: 'prod-1',
                sourceLocationId: 'loc-src',
                targetLocationId: 'loc-dst',
                batchId: 'batch-1',
                quantity: 5,
              },
            ],
          },
          { id: 'user-staff', role: 'STAFF' },
        ),
      ).rejects.toThrow(/sedang dibekukan karena proses opname/);
    });

    it('atomically executes TRANSFER_OUT and TRANSFER_IN and inherits batch/expiry (BR-27, BR-28)', async () => {
      vi.mocked(prisma.location.findUnique).mockImplementation((args) => {
        if (args.where.id === 'loc-src') return Promise.resolve(mockSourceLocation) as never;
        return Promise.resolve(mockTargetLocation) as never;
      });
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as never);
      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch as never);
      vi.mocked(prisma.documentCounter.upsert).mockResolvedValue({ currentValue: 1 } as never);

      // Row locking mock: source has 20, destination has 0 initially
      let callCount = 0;
      vi.mocked(prisma.$queryRaw).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Source stock check
          return Promise.resolve([{ id: 'stock-src', quantity: 20 }]) as never;
        }
        // Destination stock check
        return Promise.resolve([]) as never;
      });

      vi.mocked(prisma.stock.update).mockResolvedValue({} as never);
      vi.mocked(prisma.stock.create).mockResolvedValue({} as never);
      vi.mocked(prisma.stockMovement.create).mockImplementation((args) => {
        return Promise.resolve({
          id: 'mov-1',
          ...args.data,
          createdAt: new Date(),
        }) as never;
      });

      const result = await createStockTransfer(
        {
          notes: 'Pemindahan ke rak display',
          items: [
            {
              productId: 'prod-1',
              sourceLocationId: 'loc-src',
              targetLocationId: 'loc-dst',
              batchId: 'batch-1',
              quantity: 8,
            },
          ],
        },
        { id: 'user-staff', role: 'STAFF', name: 'Joko' },
      );

      expect(result.transferNo).toMatch(/^TR-\d{4}-\d{4}$/);
      expect(result.itemsCount).toBe(1);
      expect(result.results).toHaveLength(1);

      // Verifikasi 2 mutasi stok tercatat (TRANSFER_OUT & TRANSFER_IN) dalam satu transaksi
      expect(prisma.stockMovement.create).toHaveBeenCalledTimes(2);

      // Verifikasi TRANSFER_OUT
      expect(prisma.stockMovement.create).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          locationId: 'loc-src',
          movementType: 'TRANSFER_OUT',
          quantity: 8,
          balanceAfter: 12, // 20 - 8 = 12
          refType: 'STOCK_TRANSFER',
          refNo: result.transferNo,
        }),
      });

      // Verifikasi TRANSFER_IN (batch tetap sama per BR-28)
      expect(prisma.stockMovement.create).toHaveBeenNthCalledWith(2, {
        data: expect.objectContaining({
          locationId: 'loc-dst',
          batchId: 'batch-1',
          movementType: 'TRANSFER_IN',
          quantity: 8,
          balanceAfter: 8, // 0 + 8 = 8
          refType: 'STOCK_TRANSFER',
          refNo: result.transferNo,
        }),
      });
    });

    it('supports inter-warehouse transfer across two different warehouses (BR-27)', async () => {
      vi.mocked(prisma.location.findUnique).mockImplementation((args) => {
        if (args.where.id === 'loc-src') return Promise.resolve(mockSourceLocation) as never;
        return Promise.resolve(mockInterWarehouseTarget) as never; // Gudang Bekasi
      });
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as never);
      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch as never);
      vi.mocked(prisma.documentCounter.upsert).mockResolvedValue({ currentValue: 2 } as never);

      let callCount = 0;
      vi.mocked(prisma.$queryRaw).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([{ id: 'stock-src', quantity: 15 }]) as never;
        }
        return Promise.resolve([{ id: 'stock-bks', quantity: 5 }]) as never;
      });

      vi.mocked(prisma.stock.update).mockResolvedValue({} as never);
      vi.mocked(prisma.stockMovement.create).mockImplementation((args) => {
        return Promise.resolve({
          id: 'mov-2',
          ...args.data,
          createdAt: new Date(),
        }) as never;
      });

      const result = await createStockTransfer(
        {
          notes: 'Transfer antar gudang JKT -> BKS',
          items: [
            {
              productId: 'prod-1',
              sourceLocationId: 'loc-src',
              targetLocationId: 'loc-bks',
              batchId: 'batch-1',
              quantity: 10,
            },
          ],
        },
        { id: 'user-manager', role: 'MANAGER', name: 'Pak Budi' },
      );

      expect(result.transferNo).toMatch(/^TR-\d{4}-\d{4}$/);
      expect(prisma.stockMovement.create).toHaveBeenCalledTimes(2);
    });

    it('rejects transfer if source stock is insufficient (BR-01)', async () => {
      vi.mocked(prisma.location.findUnique).mockImplementation((args) => {
        if (args.where.id === 'loc-src') return Promise.resolve(mockSourceLocation) as never;
        return Promise.resolve(mockTargetLocation) as never;
      });
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as never);
      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch as never);
      vi.mocked(prisma.documentCounter.upsert).mockResolvedValue({ currentValue: 3 } as never);

      // Only 3 in stock, but trying to transfer 10
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: 'stock-src', quantity: 3 }] as never);

      await expect(
        createStockTransfer(
          {
            items: [
              {
                productId: 'prod-1',
                sourceLocationId: 'loc-src',
                targetLocationId: 'loc-dst',
                batchId: 'batch-1',
                quantity: 10, // > 3
              },
            ],
          },
          { id: 'user-staff', role: 'STAFF' },
        ),
      ).rejects.toThrow(/Stok tidak mencukupi/);
    });
  });

  describe('listStockTransfers and getStockTransferByRefNo', () => {
    it('lists stock transfers with pagination', async () => {
      vi.mocked(prisma.stockMovement.count).mockResolvedValue(2 as never);
      vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([
        {
          id: 'mov-out',
          refNo: 'TR-2026-0001',
          movementType: 'TRANSFER_OUT',
          quantity: 5,
          balanceAfter: 15,
          notes: 'Transfer ke B-02-01',
          createdAt: new Date(),
          product: mockProduct,
          location: mockSourceLocation,
          batch: mockBatch,
          user: { id: 'user-staff', name: 'Joko', email: 'joko@wms.com', role: 'STAFF' },
        },
      ] as never);

      const res = await listStockTransfers();
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(2);
    });

    it('retrieves detailed transfer record by TR document number', async () => {
      vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([
        {
          id: 'mov-out',
          refNo: 'TR-2026-0001',
          movementType: 'TRANSFER_OUT',
          quantity: 5,
          balanceAfter: 15,
          notes: 'Transfer ke B-02-01',
          createdAt: new Date(),
          product: mockProduct,
          location: mockSourceLocation,
          batch: mockBatch,
          user: { id: 'user-staff', name: 'Joko', email: 'joko@wms.com', role: 'STAFF' },
        },
      ] as never);

      const detail = await getStockTransferByRefNo('TR-2026-0001');
      expect(detail.refNo).toBe('TR-2026-0001');
      expect(detail.items).toHaveLength(1);
    });
  });
});
