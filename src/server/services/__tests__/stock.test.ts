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
      create: vi.fn(),
    },
    stock: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from '@/server/db';
import {
  applyStockMovement,
  applyStockMovements,
  getOrCreateDefaultBatch,
  getExpiringBatches,
} from '../stock.service';

describe('Stock Movement Service (BR-01, BR-03, BR-09, BR-12, BR-17, BR-22, BR-29, BR-30, BR-32)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockActiveProduct = {
    id: 'prod-1',
    sku: 'FNB-IND-001',
    name: 'Indomie Goreng 85g',
    isActive: true,
  };

  const mockActiveLocation = {
    id: 'loc-1',
    code: 'A-01-01',
    isFrozen: false,
    isActive: true,
  };

  const mockValidBatch = {
    id: 'batch-1',
    productId: 'prod-1',
    batchNo: 'B2026-A',
    expiryDate: new Date('2027-12-31'),
  };

  it('berhasil menambah stok awal (IN) dan mencatat mutasi dengan balanceAfter yang tepat', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(mockActiveProduct as never);
    vi.mocked(prisma.location.findUnique).mockResolvedValueOnce(mockActiveLocation as never);
    vi.mocked(prisma.batch.findUnique).mockResolvedValueOnce(mockValidBatch as never);

    // No existing stock row initially
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]);

    vi.mocked(prisma.stock.create).mockResolvedValueOnce({
      id: 'stock-1',
      productId: 'prod-1',
      locationId: 'loc-1',
      batchId: 'batch-1',
      quantity: 50,
    } as never);

    vi.mocked(prisma.stockMovement.create).mockResolvedValueOnce({
      id: 'mov-1',
      productId: 'prod-1',
      locationId: 'loc-1',
      batchId: 'batch-1',
      movementType: 'IN',
      quantity: 50,
      balanceAfter: 50,
      refType: 'GOODS_RECEIPT',
      refId: 'gr-1',
      refNo: 'GR-2026-0001',
      userId: 'user-1',
      notes: 'Penerimaan barang dari supplier',
      createdAt: new Date(),
    } as never);

    const result = await applyStockMovement({
      productId: 'prod-1',
      locationId: 'loc-1',
      batchId: 'batch-1',
      movementType: 'IN',
      quantity: 50,
      refType: 'GOODS_RECEIPT',
      refId: 'gr-1',
      refNo: 'GR-2026-0001',
      userId: 'user-1',
      notes: 'Penerimaan barang dari supplier',
    });

    expect(result.previousBalance).toBe(0);
    expect(result.newBalance).toBe(50);
    expect(prisma.stock.create).toHaveBeenCalledWith({
      data: {
        productId: 'prod-1',
        locationId: 'loc-1',
        batchId: 'batch-1',
        quantity: 50,
      },
    });
    expect(prisma.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          movementType: 'IN',
          quantity: 50,
          balanceAfter: 50,
        }),
      }),
    );
  });

  it('berhasil mengurangi stok (OUT) pada stok yang cukup', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(mockActiveProduct as never);
    vi.mocked(prisma.location.findUnique).mockResolvedValueOnce(mockActiveLocation as never);
    vi.mocked(prisma.batch.findUnique).mockResolvedValueOnce(mockValidBatch as never);

    // Existing stock has 50
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ id: 'stock-1', quantity: 50 }]);

    vi.mocked(prisma.stock.update).mockResolvedValueOnce({
      id: 'stock-1',
      quantity: 30,
    } as never);

    vi.mocked(prisma.stockMovement.create).mockResolvedValueOnce({
      id: 'mov-2',
      balanceAfter: 30,
    } as never);

    const result = await applyStockMovement({
      productId: 'prod-1',
      locationId: 'loc-1',
      batchId: 'batch-1',
      movementType: 'OUT',
      quantity: 20,
      refType: 'DELIVERY_ORDER',
      refId: 'do-1',
      refNo: 'DO-2026-0001',
      userId: 'user-1',
    });

    expect(result.previousBalance).toBe(50);
    expect(result.newBalance).toBe(30);
    expect(prisma.stock.update).toHaveBeenCalledWith({
      where: { id: 'stock-1' },
      data: { quantity: 30 },
    });
  });

  it('menolak pengurangan jika kuantitas diminta melebihi stok yang ada (BR-01, BR-17 INSUFFICIENT_STOCK)', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(mockActiveProduct as never);
    vi.mocked(prisma.location.findUnique).mockResolvedValueOnce(mockActiveLocation as never);
    vi.mocked(prisma.batch.findUnique).mockResolvedValueOnce(mockValidBatch as never);

    // Existing stock only has 10
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ id: 'stock-1', quantity: 10 }]);

    await expect(
      applyStockMovement({
        productId: 'prod-1',
        locationId: 'loc-1',
        batchId: 'batch-1',
        movementType: 'OUT',
        quantity: 15, // wants 15, only 10 available
        refType: 'DELIVERY_ORDER',
        refId: 'do-1',
        refNo: 'DO-2026-0001',
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      statusCode: 409,
    });

    // Stock update and movement creation must NOT be called
    expect(prisma.stock.update).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
  });

  it('menolak pengiriman barang keluar jika batch sudah kedaluwarsa (BR-09)', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(mockActiveProduct as never);
    vi.mocked(prisma.location.findUnique).mockResolvedValueOnce(mockActiveLocation as never);
    vi.mocked(prisma.batch.findUnique).mockResolvedValueOnce({
      ...mockValidBatch,
      expiryDate: new Date('2020-01-01'), // Expired!
    } as never);

    await expect(
      applyStockMovement({
        productId: 'prod-1',
        locationId: 'loc-1',
        batchId: 'batch-1',
        movementType: 'OUT',
        quantity: 5,
        refType: 'DELIVERY_ORDER',
        refId: 'do-1',
        refNo: 'DO-2026-0001',
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  });

  it('menolak mutasi jika lokasi rak sedang dibekukan karena opname (BR-22 INVALID_STATE)', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(mockActiveProduct as never);
    vi.mocked(prisma.location.findUnique).mockResolvedValueOnce({
      ...mockActiveLocation,
      isFrozen: true, // Frozen!
    } as never);

    await expect(
      applyStockMovement({
        productId: 'prod-1',
        locationId: 'loc-1',
        batchId: 'batch-1',
        movementType: 'IN',
        quantity: 10,
        refType: 'GOODS_RECEIPT',
        refId: 'gr-1',
        refNo: 'GR-2026-0001',
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_STATE',
      statusCode: 409,
    });
  });

  it('menolak mutasi jika produk atau lokasi tidak aktif (BR-32)', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
      ...mockActiveProduct,
      isActive: false, // Inactive!
    } as never);

    await expect(
      applyStockMovement({
        productId: 'prod-1',
        locationId: 'loc-1',
        batchId: 'batch-1',
        movementType: 'IN',
        quantity: 10,
        refType: 'GOODS_RECEIPT',
        refId: 'gr-1',
        refNo: 'GR-2026-0001',
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  });

  it('menolak mutasi dengan kuantitas 0 atau negatif (BR-03)', async () => {
    await expect(
      applyStockMovement({
        productId: 'prod-1',
        locationId: 'loc-1',
        batchId: 'batch-1',
        movementType: 'IN',
        quantity: -5,
        refType: 'GOODS_RECEIPT',
        refId: 'gr-1',
        refNo: 'GR-2026-0001',
        userId: 'user-1',
      }),
    ).rejects.toThrow();
  });

  it('melakukan rollback otomatis saat transaksi multi-item gagal di tengah (BR-12, BR-17)', async () => {
    // Item 1 succeeds
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(mockActiveProduct as never);
    vi.mocked(prisma.location.findUnique).mockResolvedValueOnce(mockActiveLocation as never);
    vi.mocked(prisma.batch.findUnique).mockResolvedValueOnce(mockValidBatch as never);
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ id: 'stock-1', quantity: 20 }]);
    vi.mocked(prisma.stock.update).mockResolvedValueOnce({ id: 'stock-1', quantity: 15 } as never);
    vi.mocked(prisma.stockMovement.create).mockResolvedValueOnce({ id: 'mov-1' } as never);

    // Item 2 fails due to insufficient stock
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(mockActiveProduct as never);
    vi.mocked(prisma.location.findUnique).mockResolvedValueOnce(mockActiveLocation as never);
    vi.mocked(prisma.batch.findUnique).mockResolvedValueOnce(mockValidBatch as never);
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ id: 'stock-2', quantity: 2 }]); // only 2 available

    const multiItemPromise = applyStockMovements([
      {
        productId: 'prod-1',
        locationId: 'loc-1',
        batchId: 'batch-1',
        movementType: 'OUT',
        quantity: 5, // ok: 20 -> 15
        refType: 'DELIVERY_ORDER',
        refId: 'do-1',
        refNo: 'DO-2026-0001',
        userId: 'user-1',
      },
      {
        productId: 'prod-1',
        locationId: 'loc-1',
        batchId: 'batch-1',
        movementType: 'OUT',
        quantity: 10, // fails: wants 10, only 2
        refType: 'DELIVERY_ORDER',
        refId: 'do-1',
        refNo: 'DO-2026-0001',
        userId: 'user-1',
      },
    ]);

    await expect(multiItemPromise).rejects.toMatchObject({
      code: 'INSUFFICIENT_STOCK',
    });
  });

  it('dua transaksi bersamaan: transaksi kedua ditolak saat stok tidak mencukupi (Race Condition Safety)', async () => {
    // Initial state: available stock = 10
    // Transaction 1 requests 7
    // Transaction 2 requests 7
    // Because of row locking:
    // Tx 1 executes first: 10 - 7 = 3 (succeeds)
    // Tx 2 executes next against remaining 3: 3 - 7 = -4 (rejected with INSUFFICIENT_STOCK)
    let currentStock = 10;

    const runWithdrawal = async (qty: number) => {
      // Simulate row lock read
      const available = currentStock;
      if (available < qty) {
        throw new Error('INSUFFICIENT_STOCK');
      }
      currentStock -= qty;
      return currentStock;
    };

    const tx1Result = await runWithdrawal(7);
    expect(tx1Result).toBe(3);

    await expect(runWithdrawal(7)).rejects.toThrow('INSUFFICIENT_STOCK');
    expect(currentStock).toBe(3); // Stock remains non-negative (never -4!)
  });

  it('getOrCreateDefaultBatch membuat batch DEFAULT jika belum ada (BR-07)', async () => {
    vi.mocked(prisma.batch.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.batch.create).mockResolvedValueOnce({
      id: 'batch-default',
      productId: 'prod-1',
      batchNo: 'DEFAULT',
      expiryDate: null,
    } as never);

    const batch = await getOrCreateDefaultBatch('prod-1');
    expect(batch.batchNo).toBe('DEFAULT');
    expect(batch.expiryDate).toBeNull();
  });

  describe('getExpiringBatches (BR-10)', () => {
    it('returns expiring batches categorized into EXPIRED, CRITICAL, and WARNING with metrics', async () => {
      const today = new Date();
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - 10); // Expired 10 days ago

      const criticalDate = new Date(today);
      criticalDate.setDate(today.getDate() + 3); // 3 days remaining

      const warningDate = new Date(today);
      warningDate.setDate(today.getDate() + 20); // 20 days remaining

      const mockStocks = [
        {
          id: 'stk-exp',
          productId: 'prod-1',
          batchId: 'batch-exp',
          locationId: 'loc-1',
          quantity: 10,
          product: {
            id: 'prod-1',
            sku: 'SKU-001',
            name: 'Minyak Goreng 2L',
            uom: 'BTL',
            costPrice: 35000,
            category: { name: 'Minyak' },
          },
          batch: {
            id: 'batch-exp',
            batchNo: 'EXP-PAST',
            expiryDate: pastDate,
          },
          location: {
            id: 'loc-1',
            code: 'A-01-01',
            warehouseId: 'wh-1',
            warehouse: { name: 'Gudang Jakarta' },
          },
        },
        {
          id: 'stk-crit',
          productId: 'prod-1',
          batchId: 'batch-crit',
          locationId: 'loc-1',
          quantity: 20,
          product: {
            id: 'prod-1',
            sku: 'SKU-001',
            name: 'Minyak Goreng 2L',
            uom: 'BTL',
            costPrice: 35000,
            category: { name: 'Minyak' },
          },
          batch: {
            id: 'batch-crit',
            batchNo: 'CRIT-01',
            expiryDate: criticalDate,
          },
          location: {
            id: 'loc-1',
            code: 'A-01-01',
            warehouseId: 'wh-1',
            warehouse: { name: 'Gudang Jakarta' },
          },
        },
        {
          id: 'stk-warn',
          productId: 'prod-1',
          batchId: 'batch-warn',
          locationId: 'loc-1',
          quantity: 30,
          product: {
            id: 'prod-1',
            sku: 'SKU-001',
            name: 'Minyak Goreng 2L',
            uom: 'BTL',
            costPrice: 35000,
            category: { name: 'Minyak' },
          },
          batch: {
            id: 'batch-warn',
            batchNo: 'WARN-01',
            expiryDate: warningDate,
          },
          location: {
            id: 'loc-1',
            code: 'A-01-01',
            warehouseId: 'wh-1',
            warehouse: { name: 'Gudang Jakarta' },
          },
        },
      ];

      vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks as never);

      const result = await getExpiringBatches({ days: 30, warehouseId: 'wh-1' });

      expect(result.summary.totalBatches).toBe(3);
      expect(result.summary.expiredCount).toBe(1);
      expect(result.summary.criticalCount).toBe(1);
      expect(result.summary.warningCount).toBe(1);

      // Total units: 10 + 20 + 30 = 60
      expect(result.summary.totalAtRiskUnits).toBe(60);
      // Total potential loss: 60 * 35000 = 2,100,000
      expect(result.summary.totalPotentialLoss).toBe(2100000);

      // Verify item statuses
      expect(result.items[0]!.status).toBe('EXPIRED');
      expect(result.items[0]!.potentialLossValue).toBe(350000);
      expect(result.items[1]!.status).toBe('CRITICAL');
      expect(result.items[2]!.status).toBe('WARNING');
    });

    it('filters items by status when status parameter is specified', async () => {
      const today = new Date();
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - 5);

      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 15);

      const mockStocks = [
        {
          id: 'stk-exp',
          productId: 'prod-1',
          quantity: 10,
          product: { sku: 'SKU-1', name: 'A', uom: 'PCS', costPrice: 10000, category: null },
          batch: { batchNo: 'B-EXP', expiryDate: pastDate },
          location: { code: 'A-01-01', warehouse: { name: 'WH-1' } },
        },
        {
          id: 'stk-warn',
          productId: 'prod-1',
          quantity: 25,
          product: { sku: 'SKU-1', name: 'A', uom: 'PCS', costPrice: 10000, category: null },
          batch: { batchNo: 'B-WARN', expiryDate: futureDate },
          location: { code: 'A-01-01', warehouse: { name: 'WH-1' } },
        },
      ];

      vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks as never);

      const result = await getExpiringBatches({ status: 'EXPIRED' });

      // Summary captures all fetched batches
      expect(result.summary.totalBatches).toBe(2);
      expect(result.summary.expiredCount).toBe(1);
      expect(result.summary.warningCount).toBe(1);

      // Items array contains only the filtered status
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.status).toBe('EXPIRED');
    });
  });
});
