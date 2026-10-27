import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTx = {
  auditLog: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    create: vi.fn().mockResolvedValue({ id: 'log-1' }),
  },
  stockMovement: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    createMany: vi.fn().mockResolvedValue({ count: 8 }),
  },
  stockOpnameItem: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
  stockOpname: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
  deliveryOrderItem: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
  deliveryOrder: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    create: vi.fn().mockResolvedValue({ id: 'do-2026-0001', orderNo: 'DO-2026-0001' }),
  },
  goodsReceiptItem: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
  goodsReceipt: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    create: vi.fn().mockResolvedValue({ id: 'gr-2026-0001', receiptNo: 'GR-2026-0001' }),
  },
  stock: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    createMany: vi.fn().mockResolvedValue({ count: 7 }),
  },
  batch: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    createMany: vi.fn().mockResolvedValue({ count: 10 }),
  },
  product: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    createMany: vi.fn().mockResolvedValue({ count: 6 }),
  },
  category: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    createMany: vi.fn().mockResolvedValue({ count: 4 }),
  },
  location: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    createMany: vi.fn().mockResolvedValue({ count: 8 }),
  },
  warehouse: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    createMany: vi.fn().mockResolvedValue({ count: 2 }),
  },
  supplier: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    createMany: vi.fn().mockResolvedValue({ count: 3 }),
  },
  customer: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    createMany: vi.fn().mockResolvedValue({ count: 2 }),
  },
  documentCounter: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    createMany: vi.fn().mockResolvedValue({ count: 6 }),
  },
  user: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    createMany: vi.fn().mockResolvedValue({ count: 4 }),
  },
};

vi.mock('@/server/db', () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(mockTx)),
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password_123'),
  },
}));

import { resetDemoDatabase } from '../demo-reset.service';

describe('Demo Reset Service (Penutup Portofolio)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('harus mereset semua tabel dan membuat data demo secara atomik', async () => {
    const result = await resetDemoDatabase();

    expect(result.success).toBe(true);
    expect(result.counts.users).toBe(4);
    expect(result.counts.warehouses).toBe(2);
    expect(result.counts.locations).toBe(8);
    expect(result.counts.categories).toBe(4);
    expect(result.counts.products).toBe(6);
    expect(result.counts.stocks).toBe(7);
    expect(result.counts.movements).toBe(8);
    expect(result.counts.goodsReceipts).toBe(1);
    expect(result.counts.deliveryOrders).toBe(1);

    // Pastikan deleteMany terpanggil untuk seluruh entitas
    expect(mockTx.auditLog.deleteMany).toHaveBeenCalled();
    expect(mockTx.stockMovement.deleteMany).toHaveBeenCalled();
    expect(mockTx.deliveryOrder.deleteMany).toHaveBeenCalled();
    expect(mockTx.goodsReceipt.deleteMany).toHaveBeenCalled();
    expect(mockTx.stock.deleteMany).toHaveBeenCalled();
    expect(mockTx.user.deleteMany).toHaveBeenCalled();

    // Pastikan data demo baru dibuat
    expect(mockTx.user.createMany).toHaveBeenCalled();
    expect(mockTx.warehouse.createMany).toHaveBeenCalled();
    expect(mockTx.location.createMany).toHaveBeenCalled();
    expect(mockTx.category.createMany).toHaveBeenCalled();
    expect(mockTx.product.createMany).toHaveBeenCalled();
    expect(mockTx.batch.createMany).toHaveBeenCalled();
    expect(mockTx.supplier.createMany).toHaveBeenCalled();
    expect(mockTx.customer.createMany).toHaveBeenCalled();
    expect(mockTx.stock.createMany).toHaveBeenCalled();
    expect(mockTx.goodsReceipt.create).toHaveBeenCalled();
    expect(mockTx.deliveryOrder.create).toHaveBeenCalled();
    expect(mockTx.stockMovement.createMany).toHaveBeenCalled();
    expect(mockTx.documentCounter.createMany).toHaveBeenCalled();
    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'DEMO_RESET',
          entity: 'SYSTEM',
        }),
      }),
    );
  });
});
