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
  createStockAdjustment,
  listStockAdjustments,
  getStockAdjustmentByRefNo,
} from '../stock-adjustment.service';

describe('Stock Adjustment Service (BR-26, BR-01, BR-03, BR-09, BR-15, BR-22)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProduct = {
    id: 'prod-1',
    sku: 'SKU-001',
    name: 'Beras Premium 5kg',
    uom: 'PCS',
    isActive: true,
  };

  const mockLocation = {
    id: 'loc-1',
    code: 'A-01-01',
    warehouseId: 'wh-1',
    zone: 'A',
    rack: '01',
    level: '01',
    isFrozen: false,
    isActive: true,
  };

  const mockBatch = {
    id: 'batch-1',
    productId: 'prod-1',
    batchNo: 'BATCH-2026-A',
    expiryDate: null,
  };

  describe('createStockAdjustment (BR-26)', () => {
    it('enforces role: rejects STAFF or VIEWER with FORBIDDEN (BR-26)', async () => {
      await expect(
        createStockAdjustment(
          {
            reasonCategory: 'DAMAGED_GOODS',
            notes: 'Pecah saat penataan rak',
            items: [
              {
                productId: 'prod-1',
                locationId: 'loc-1',
                batchId: 'batch-1',
                movementType: 'ADJUST_OUT',
                quantity: 2,
              },
            ],
          },
          { id: 'user-staff', role: 'STAFF' },
        ),
      ).rejects.toThrow(/Hanya Manager atau Admin/);
    });

    it('enforces mandatory reason notes with at least 5 characters (BR-26)', async () => {
      await expect(
        createStockAdjustment(
          {
            reasonCategory: 'DAMAGED_GOODS',
            notes: 'oke', // < 5 karakter
            items: [
              {
                productId: 'prod-1',
                locationId: 'loc-1',
                batchId: 'batch-1',
                movementType: 'ADJUST_OUT',
                quantity: 1,
              },
            ],
          },
          { id: 'user-mgr', role: 'MANAGER' },
        ),
      ).rejects.toThrow(/minimal 5 karakter/);
    });

    it('generates ADJ-YYYY-XXXX number and creates ADJUST_IN movement atomically (BR-15, BR-26)', async () => {
      vi.mocked(prisma.documentCounter.upsert).mockResolvedValue({ currentValue: 1 } as never);
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as never);
      vi.mocked(prisma.location.findUnique).mockResolvedValue(mockLocation as never);
      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch as never);

      // Current stock is 10
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: 'stock-1', quantity: 10 }] as never);
      vi.mocked(prisma.stock.update).mockResolvedValue({} as never);
      vi.mocked(prisma.stockMovement.create).mockResolvedValue({} as never);

      const result = await createStockAdjustment(
        {
          reasonCategory: 'FOUND_INVENTORY',
          notes: 'Ditemukan 5 pcs saat pembersihan lorong rak',
          items: [
            {
              productId: 'prod-1',
              locationId: 'loc-1',
              batchId: 'batch-1',
              movementType: 'ADJUST_IN',
              quantity: 5,
              itemNotes: 'Kondisi bagus',
            },
          ],
        },
        { id: 'user-mgr', role: 'MANAGER', name: 'Pak Budi' },
      );

      expect(result.adjNo).toMatch(/^ADJ-\d{4}-\d{4}$/);
      expect(result.reasonCategory).toBe('FOUND_INVENTORY');
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.newBalance).toBe(15);

      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          movementType: 'ADJUST_IN',
          quantity: 5,
          balanceAfter: 15,
          refType: 'MANUAL_ADJUSTMENT',
          refNo: result.adjNo,
          userId: 'user-mgr',
        }),
      });
    });

    it('allows ADJUST_OUT for expired batches for disposal/pemusnahan (BR-09, BR-26)', async () => {
      vi.mocked(prisma.documentCounter.upsert).mockResolvedValue({ currentValue: 2 } as never);
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as never);
      vi.mocked(prisma.location.findUnique).mockResolvedValue(mockLocation as never);

      // Expired batch (yesterday)
      const yesterday = new Date(Date.now() - 86400000);
      const expiredBatch = {
        ...mockBatch,
        expiryDate: yesterday,
      };
      vi.mocked(prisma.batch.findUnique).mockResolvedValue(expiredBatch as never);

      // Current stock is 20
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: 'stock-1', quantity: 20 }] as never);
      vi.mocked(prisma.stock.update).mockResolvedValue({} as never);
      vi.mocked(prisma.stockMovement.create).mockResolvedValue({} as never);

      const result = await createStockAdjustment(
        {
          reasonCategory: 'EXPIRED_DISPOSAL',
          notes: 'Pemusnahan barang kedaluwarsa sesuai berita acara BA-01',
          items: [
            {
              productId: 'prod-1',
              locationId: 'loc-1',
              batchId: 'batch-1',
              movementType: 'ADJUST_OUT',
              quantity: 20,
            },
          ],
        },
        { id: 'user-admin', role: 'ADMIN', name: 'Admin Gudang' },
      );

      // Berhasil mengurangi batch expired (BR-09 lewat penyesuaian/pemusnahan)
      expect(result.results[0]?.newBalance).toBe(0);
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          movementType: 'ADJUST_OUT',
          quantity: 20,
          balanceAfter: 0,
        }),
      });
    });

    it('rejects adjustment if location is frozen (BR-22)', async () => {
      vi.mocked(prisma.documentCounter.upsert).mockResolvedValue({ currentValue: 3 } as never);
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as never);
      vi.mocked(prisma.location.findUnique).mockResolvedValue({
        ...mockLocation,
        isFrozen: true,
      } as never);

      await expect(
        createStockAdjustment(
          {
            reasonCategory: 'DAMAGED_GOODS',
            notes: 'Pecah saat handling',
            items: [
              {
                productId: 'prod-1',
                locationId: 'loc-1',
                batchId: 'batch-1',
                movementType: 'ADJUST_OUT',
                quantity: 1,
              },
            ],
          },
          { id: 'user-admin', role: 'ADMIN' },
        ),
      ).rejects.toThrow(/sedang dibekukan/);
    });

    it('rejects ADJUST_OUT if quantity exceeds available stock (BR-01)', async () => {
      vi.mocked(prisma.documentCounter.upsert).mockResolvedValue({ currentValue: 4 } as never);
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as never);
      vi.mocked(prisma.location.findUnique).mockResolvedValue(mockLocation as never);
      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch as never);

      // Only 3 in stock
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: 'stock-1', quantity: 3 }] as never);

      await expect(
        createStockAdjustment(
          {
            reasonCategory: 'DAMAGED_GOODS',
            notes: 'Pecah 5 pcs saat jatuh dari tangga',
            items: [
              {
                productId: 'prod-1',
                locationId: 'loc-1',
                batchId: 'batch-1',
                movementType: 'ADJUST_OUT',
                quantity: 5, // > 3
              },
            ],
          },
          { id: 'user-admin', role: 'ADMIN' },
        ),
      ).rejects.toThrow(/Stok tidak mencukupi/);
    });
  });

  describe('listStockAdjustments and getStockAdjustmentByRefNo', () => {
    it('lists stock adjustments with filtering', async () => {
      vi.mocked(prisma.stockMovement.count).mockResolvedValue(1 as never);
      vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([
        {
          id: 'mov-1',
          refNo: 'ADJ-2026-0001',
          movementType: 'ADJUST_IN',
          quantity: 5,
          balanceAfter: 15,
          notes: '[Penemuan Stok Fisik] Catatan',
          createdAt: new Date(),
          product: mockProduct,
          location: {
            ...mockLocation,
            warehouse: { id: 'wh-1', code: 'WH-JKT', name: 'Gudang JKT' },
          },
          batch: mockBatch,
          user: { id: 'user-mgr', name: 'Pak Budi', email: 'budi@wms.com', role: 'MANAGER' },
        },
      ] as never);

      const res = await listStockAdjustments({ movementType: 'ADJUST_IN' });
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });

    it('gets adjustment detail by refNo', async () => {
      vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([
        {
          id: 'mov-1',
          refNo: 'ADJ-2026-0001',
          movementType: 'ADJUST_IN',
          quantity: 5,
          balanceAfter: 15,
          notes: '[Penemuan Stok Fisik] Catatan',
          createdAt: new Date(),
          product: mockProduct,
          location: {
            ...mockLocation,
            warehouse: { id: 'wh-1', code: 'WH-JKT', name: 'Gudang JKT' },
          },
          batch: mockBatch,
          user: { id: 'user-mgr', name: 'Pak Budi', email: 'budi@wms.com', role: 'MANAGER' },
        },
      ] as never);

      const detail = await getStockAdjustmentByRefNo('ADJ-2026-0001');
      expect(detail.refNo).toBe('ADJ-2026-0001');
      expect(detail.items).toHaveLength(1);
    });
  });
});
