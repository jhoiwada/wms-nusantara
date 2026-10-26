import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma singleton
vi.mock('@/server/db', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    location: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    stock: {
      findMany: vi.fn(),
    },
    stockMovement: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from '@/server/db';
import {
  getStockSummaryByProduct,
  getStockSummaryByLocation,
  getProductStockCard,
  getLowStockProducts,
  getExpiringBatches,
  verifyStockConsistency,
} from '../stock.service';

describe('Stock Overview, Stock Card & Consistency Checker (T1.9, BR-01, BR-04, BR-05, BR-10, BR-29)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProduct = {
    id: 'prod-1',
    sku: 'SKU-001',
    barcode: '8991234567890',
    name: 'Beras Pandan Wangi 5kg',
    uom: 'BAG',
    minStock: 20,
    costPrice: 75000,
    trackExpiry: true,
    isActive: true,
    category: {
      id: 'cat-1',
      name: 'Sembako',
    },
  };

  const mockWarehouse = {
    id: 'wh-1',
    code: 'WH-JKT',
    name: 'Gudang Utama Jakarta',
  };

  const mockLocation = {
    id: 'loc-1',
    code: 'A-01-01',
    zone: 'A',
    rack: '01',
    level: '01',
    warehouseId: 'wh-1',
    isFrozen: false,
    isActive: true,
    warehouse: mockWarehouse,
  };

  describe('getStockSummaryByProduct', () => {
    it('aggregates stock, separates expired batches, and calculates inventory value (BR-04, BR-05)', async () => {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + 90);

      const pastDate = new Date();
      pastDate.setDate(now.getDate() - 10);

      const mockProductWithStocks = {
        ...mockProduct,
        stocks: [
          {
            id: 's-1',
            quantity: 50,
            batch: {
              id: 'b-1',
              batchNo: 'B2601',
              expiryDate: futureDate, // valid unexpired
            },
            location: mockLocation,
          },
          {
            id: 's-2',
            quantity: 10,
            batch: {
              id: 'b-2',
              batchNo: 'B2501',
              expiryDate: pastDate, // expired
            },
            location: mockLocation,
          },
        ],
      };

      vi.mocked(prisma.product.count).mockResolvedValue(1);
      vi.mocked(prisma.product.findMany).mockResolvedValue([mockProductWithStocks as never]);

      const result = await getStockSummaryByProduct();

      expect(result.data).toHaveLength(1);
      const item = result.data[0]!;
      expect(item.totalQuantity).toBe(60); // 50 + 10
      expect(item.availableQuantity).toBe(50); // only unexpired
      expect(item.expiredQuantity).toBe(10);
      expect(item.totalValue).toBe(60 * 75000); // 4,500,000
      expect(item.isLowStock).toBe(false); // 50 > minStock (20)
      expect(item.warehouses).toHaveLength(1);
      expect(item.warehouses[0]!.quantity).toBe(60);
    });

    it('identifies low stock when available stock is below or equal to minStock (BR-04)', async () => {
      const mockLowStockProduct = {
        ...mockProduct,
        minStock: 30,
        stocks: [
          {
            id: 's-1',
            quantity: 15,
            batch: { id: 'b-1', expiryDate: null },
            location: mockLocation,
          },
        ],
      };

      vi.mocked(prisma.product.count).mockResolvedValue(1);
      vi.mocked(prisma.product.findMany).mockResolvedValue([mockLowStockProduct as never]);

      const result = await getStockSummaryByProduct();
      expect(result.data[0]!.isLowStock).toBe(true); // 15 <= 30

      const lowProducts = await getLowStockProducts();
      expect(lowProducts).toHaveLength(1);
      expect(lowProducts[0]!.deficit).toBe(15);
    });
  });

  describe('getStockSummaryByLocation', () => {
    it('groups stocks per rack location with frozen state (BR-22)', async () => {
      const mockLocationWithStocks = {
        ...mockLocation,
        stocks: [
          {
            id: 's-1',
            productId: 'prod-1',
            quantity: 40,
            product: mockProduct,
            batch: { id: 'b-1', batchNo: 'B2601', expiryDate: null },
          },
        ],
      };

      vi.mocked(prisma.location.count).mockResolvedValue(1);
      vi.mocked(prisma.location.findMany).mockResolvedValue([mockLocationWithStocks as never]);

      const result = await getStockSummaryByLocation();

      expect(result.data).toHaveLength(1);
      const loc = result.data[0]!;
      expect(loc.location.code).toBe('A-01-01');
      expect(loc.totalQuantity).toBe(40);
      expect(loc.stocks[0]!.sku).toBe('SKU-001');
    });
  });

  describe('getProductStockCard', () => {
    it('returns running movements and current balance (BR-29, BR-30)', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as never);
      vi.mocked(prisma.stock.findMany).mockResolvedValue([{ quantity: 80 }] as never);

      const mockMovements = [
        {
          id: 'm-2',
          movementType: 'OUT',
          quantity: 20,
          balanceAfter: 80,
          refNo: 'DO-2026-0001',
          refType: 'DELIVERY_ORDER',
          createdAt: new Date('2026-03-15T10:00:00Z'),
          location: mockLocation,
          batch: { id: 'b-1', batchNo: 'B2601', expiryDate: null },
          user: { id: 'u-1', name: 'Budi Santoso', email: 'budi@wms.local' },
        },
        {
          id: 'm-1',
          movementType: 'IN',
          quantity: 100,
          balanceAfter: 100,
          refNo: 'GR-2026-0001',
          refType: 'GOODS_RECEIPT',
          createdAt: new Date('2026-03-10T08:00:00Z'),
          location: mockLocation,
          batch: { id: 'b-1', batchNo: 'B2601', expiryDate: null },
          user: { id: 'u-1', name: 'Budi Santoso', email: 'budi@wms.local' },
        },
      ];

      vi.mocked(prisma.stockMovement.count).mockResolvedValue(2);
      vi.mocked(prisma.stockMovement.findMany).mockResolvedValue(mockMovements as never);

      const result = await getProductStockCard('prod-1');

      expect(result.product.sku).toBe('SKU-001');
      expect(result.currentStock).toBe(80);
      expect(result.movements).toHaveLength(2);
      expect(result.movements[0]!.balanceAfter).toBe(80);
      expect(result.movements[1]!.balanceAfter).toBe(100);
    });
  });

  describe('verifyStockConsistency (Roadmap Invariant Check)', () => {
    it('verifies that SUM(movements) equals SUM(stock) for consistent state', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([
        { id: 'prod-1', sku: 'SKU-001', name: 'Produk A' },
      ] as never);

      // Current stock in table is 75 (e.g. 50 in Loc 1, 25 in Loc 2)
      vi.mocked(prisma.stock.findMany).mockResolvedValue([
        { quantity: 50 },
        { quantity: 25 },
      ] as never);

      // Movements: +100 IN, -25 OUT = 75
      vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([
        { movementType: 'IN', quantity: 100 },
        { movementType: 'OUT', quantity: 25 },
      ] as never);

      const result = await verifyStockConsistency();

      expect(result.isConsistent).toBe(true);
      expect(result.inconsistentCount).toBe(0);
      expect(result.results[0]!.currentStock).toBe(75);
      expect(result.results[0]!.movementSum).toBe(75);
      expect(result.results[0]!.difference).toBe(0);
    });

    it('detects inconsistency when stock table deviates from movement sum', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([
        { id: 'prod-corrupt', sku: 'SKU-ERR', name: 'Produk Selisih' },
      ] as never);

      // Stock table says 60
      vi.mocked(prisma.stock.findMany).mockResolvedValue([{ quantity: 60 }] as never);

      // Movements say: +100 IN, -30 OUT = 70 (Discrepancy of 10!)
      vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([
        { movementType: 'IN', quantity: 100 },
        { movementType: 'OUT', quantity: 30 },
      ] as never);

      const result = await verifyStockConsistency();

      expect(result.isConsistent).toBe(false);
      expect(result.inconsistentCount).toBe(1);
      const item = result.results[0]!;
      expect(item.currentStock).toBe(60);
      expect(item.movementSum).toBe(70);
      expect(item.difference).toBe(10);
      expect(item.isConsistent).toBe(false);
    });
  });

  describe('getExpiringBatches (BR-10)', () => {
    it('returns batches nearing expiry within threshold', async () => {
      const now = new Date();
      const inFifteenDays = new Date();
      inFifteenDays.setDate(now.getDate() + 15);

      vi.mocked(prisma.stock.findMany).mockResolvedValue([
        {
          id: 's-1',
          productId: 'prod-1',
          quantity: 25,
          batch: {
            id: 'b-1',
            batchNo: 'B-EXP-SOON',
            expiryDate: inFifteenDays,
          },
          product: mockProduct,
          location: mockLocation,
        },
      ] as never);

      const result = await getExpiringBatches({ days: 30 });

      expect(result).toHaveLength(1);
      expect(result[0]!.batchNo).toBe('B-EXP-SOON');
      expect(result[0]!.daysRemaining).toBeLessThanOrEqual(16);
    });
  });
});
