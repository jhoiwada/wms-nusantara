import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma singleton
vi.mock('@/server/db', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
    },
    stock: {
      findMany: vi.fn(),
    },
    goodsReceipt: {
      count: vi.fn(),
    },
    deliveryOrder: {
      count: vi.fn(),
    },
    warehouse: {
      findMany: vi.fn(),
    },
    stockMovement: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/server/db';
import {
  getDashboardSummary,
  getMovementChart,
  getRecentTransactions,
  getLowStockAlerts,
} from '../dashboard.service';

describe('Dashboard Service (T1.10, BR-04, BR-05, BR-10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProduct = {
    id: 'prod-1',
    sku: 'SKU-001',
    name: 'Beras Ramos 5kg',
    uom: 'BAG',
    minStock: 20,
    costPrice: 65000,
    isActive: true,
    category: { name: 'Sembako' },
    stocks: [
      {
        quantity: 15, // Low stock: 15 <= 20
        batch: { expiryDate: null },
      },
    ],
  };

  const mockStocks = [
    {
      quantity: 100,
      product: { costPrice: 65000 },
    },
    {
      quantity: 50,
      product: { costPrice: 30000 },
    },
  ];

  const mockWarehouse = {
    id: 'wh-1',
    code: 'WH-JKT',
    name: 'Gudang Utama Jakarta',
    locations: [
      {
        id: 'loc-1',
        stocks: [{ quantity: 150 }],
      },
    ],
  };

  describe('getDashboardSummary', () => {
    it('calculates total value, total units, low stock count, and pending drafts (BR-04, BR-05)', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([mockProduct as never]);
      vi.mocked(prisma.stock.findMany)
        .mockResolvedValueOnce(mockStocks as never) // stocks
        .mockResolvedValueOnce([{ id: 'exp-1' }] as never); // expiring stocks
      vi.mocked(prisma.goodsReceipt.count).mockResolvedValue(2);
      vi.mocked(prisma.deliveryOrder.count).mockResolvedValue(3);
      vi.mocked(prisma.warehouse.findMany).mockResolvedValue([mockWarehouse as never]);

      const summary = await getDashboardSummary();

      // Total units: 100 + 50 = 150
      expect(summary.totalStockUnits).toBe(150);
      // Total value: (100 * 65000) + (50 * 30000) = 6,500,000 + 1,500,000 = 8,000,000
      expect(summary.totalInventoryValue).toBe(8000000);
      // Low stock: prod-1 has 15 <= minStock 20
      expect(summary.lowStockCount).toBe(1);
      // Expiring batches
      expect(summary.expiringBatchesCount).toBe(1);
      // Drafts
      expect(summary.draftGoodsReceipts).toBe(2);
      expect(summary.draftDeliveryOrders).toBe(3);
      // Warehouse
      expect(summary.warehouses[0]!.activeRacks).toBe(1);
      expect(summary.warehouses[0]!.totalUnits).toBe(150);
    });
  });

  describe('getMovementChart', () => {
    it('aggregates daily incoming vs outgoing movements and fills missing dates with zeros', async () => {
      const today = new Date();
      const mockMovements = [
        {
          movementType: 'IN',
          quantity: 200,
          createdAt: today,
        },
        {
          movementType: 'OUT',
          quantity: 80,
          createdAt: today,
        },
      ];

      vi.mocked(prisma.stockMovement.findMany).mockResolvedValue(mockMovements as never);

      const chart = await getMovementChart('7d');

      expect(chart).toHaveLength(7);
      const todayItem = chart[chart.length - 1]!;
      expect(todayItem.incomingQty).toBe(200);
      expect(todayItem.outgoingQty).toBe(80);

      // Earlier days should have zero fill
      const earlierItem = chart[0]!;
      expect(earlierItem.incomingQty).toBe(0);
      expect(earlierItem.outgoingQty).toBe(0);
    });
  });

  describe('getRecentTransactions', () => {
    it('returns latest stock movements', async () => {
      const mockMovements = [
        {
          id: 'm-1',
          refNo: 'GR-2026-0001',
          quantity: 50,
          product: { name: 'Minyak Goreng' },
        },
      ];

      vi.mocked(prisma.stockMovement.findMany).mockResolvedValue(mockMovements as never);

      const result = await getRecentTransactions(5);
      expect(result).toHaveLength(1);
      expect(result[0]!.refNo).toBe('GR-2026-0001');
    });
  });

  describe('getLowStockAlerts', () => {
    it('returns products below minimum stock sorted by deficit descending', async () => {
      const products = [
        {
          id: 'p-1',
          sku: 'SKU-1',
          name: 'Produk A',
          uom: 'PCS',
          minStock: 50,
          stocks: [{ quantity: 10, batch: { expiryDate: null } }], // Deficit: 40
        },
        {
          id: 'p-2',
          sku: 'SKU-2',
          name: 'Produk B',
          uom: 'PCS',
          minStock: 20,
          stocks: [{ quantity: 15, batch: { expiryDate: null } }], // Deficit: 5
        },
      ];

      vi.mocked(prisma.product.findMany).mockResolvedValue(products as never);

      const alerts = await getLowStockAlerts(5);
      expect(alerts).toHaveLength(2);
      expect(alerts[0]!.sku).toBe('SKU-1');
      expect(alerts[0]!.deficit).toBe(40);
      expect(alerts[1]!.sku).toBe('SKU-2');
      expect(alerts[1]!.deficit).toBe(5);
    });
  });
});
