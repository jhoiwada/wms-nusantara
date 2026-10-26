import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma singleton
vi.mock('@/server/db', () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    $queryRaw: vi.fn(),
    customer: {
      findUnique: vi.fn(),
    },
    warehouse: {
      findUnique: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    location: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    batch: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    stock: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    documentCounter: {
      upsert: vi.fn(),
    },
    deliveryOrder: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    deliveryOrderItem: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '@/server/db';
import {
  createDeliveryOrder,
  updateDeliveryOrder,
  shipDeliveryOrder,
  cancelDeliveryOrder,
} from '../delivery-order.service';

describe('Delivery Order Service (BR-08, BR-09, BR-15, BR-16, BR-17, BR-18, BR-22, BR-32)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCustomer = {
    id: 'cust-1',
    code: 'CUST-001',
    name: 'Toko Berkah Abadi',
    isActive: true,
  };

  const mockWarehouse = {
    id: 'wh-1',
    code: 'WH-JKT',
    name: 'Gudang Utama Jakarta',
    isActive: true,
  };

  const mockProduct = {
    id: 'prod-1',
    sku: 'SKU-001',
    name: 'Minyak Goreng 2L',
    trackExpiry: true,
    isActive: true,
  };

  const mockLocation = {
    id: 'loc-1',
    code: 'A-01-01',
    warehouseId: 'wh-1',
    isActive: true,
    isFrozen: false,
  };

  const mockBatch = {
    id: 'batch-1',
    productId: 'prod-1',
    batchNo: 'B2601',
    expiryDate: new Date('2027-01-01'),
  };

  describe('createDeliveryOrder', () => {
    it('creates DO draft with sequential number DO-YYYY-XXXX and status DRAFT', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never);
      vi.mocked(prisma.warehouse.findUnique).mockResolvedValue(mockWarehouse as never);
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as never);
      vi.mocked(prisma.location.findUnique).mockResolvedValue(mockLocation as never);
      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch as never);

      vi.mocked(prisma.documentCounter.upsert).mockResolvedValue({
        id: 'c-1',
        name: 'DO-2026',
        currentValue: 1,
        updatedAt: new Date(),
      } as never);

      const createdDO = {
        id: 'do-1',
        orderNo: 'DO-2026-0001',
        customerId: 'cust-1',
        warehouseId: 'wh-1',
        status: 'DRAFT',
      };
      vi.mocked(prisma.deliveryOrder.create).mockResolvedValue(createdDO as never);

      const result = await createDeliveryOrder(
        {
          customerId: 'cust-1',
          warehouseId: 'wh-1',
          items: [
            {
              productId: 'prod-1',
              locationId: 'loc-1',
              batchId: 'batch-1',
              quantity: 10,
            },
          ],
        },
        'user-1',
      );

      expect(result.orderNo).toBe('DO-2026-0001');
      expect(result.status).toBe('DRAFT');
    });

    it('rejects creation if customer is inactive (BR-32)', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        ...mockCustomer,
        isActive: false,
      } as never);

      await expect(
        createDeliveryOrder(
          {
            customerId: 'cust-1',
            warehouseId: 'wh-1',
            items: [
              {
                productId: 'prod-1',
                locationId: 'loc-1',
                quantity: 5,
              },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow(/tidak aktif.*BR-32/);
    });

    it('rejects creation if location belongs to a different warehouse (BR-13)', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never);
      vi.mocked(prisma.warehouse.findUnique).mockResolvedValue(mockWarehouse as never);
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as never);
      vi.mocked(prisma.location.findUnique).mockResolvedValue({
        ...mockLocation,
        warehouseId: 'wh-other',
      } as never);

      await expect(
        createDeliveryOrder(
          {
            customerId: 'cust-1',
            warehouseId: 'wh-1',
            items: [
              {
                productId: 'prod-1',
                locationId: 'loc-1',
                quantity: 5,
              },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow(/tidak berada dalam gudang yang dipilih.*BR-13/);
    });
  });

  describe('updateDeliveryOrder', () => {
    it('updates draft successfully', async () => {
      vi.mocked(prisma.deliveryOrder.findUnique).mockResolvedValue({
        id: 'do-1',
        status: 'DRAFT',
        warehouseId: 'wh-1',
        customerId: 'cust-1',
      } as never);
      vi.mocked(prisma.deliveryOrder.update).mockResolvedValue({
        id: 'do-1',
        notes: 'Catatan diperbarui',
      } as never);

      const result = await updateDeliveryOrder('do-1', { notes: 'Catatan diperbarui' }, 'user-1');
      expect(result.notes).toBe('Catatan diperbarui');
    });

    it('rejects update if DO is already SHIPPED (BR-18)', async () => {
      vi.mocked(prisma.deliveryOrder.findUnique).mockResolvedValue({
        id: 'do-1',
        status: 'SHIPPED',
        orderNo: 'DO-2026-0001',
      } as never);

      await expect(updateDeliveryOrder('do-1', { notes: 'Ubah data' }, 'user-1')).rejects.toThrow(
        /Hanya dokumen berstatus DRAFT yang dapat diedit.*BR-18/,
      );
    });
  });

  describe('cancelDeliveryOrder', () => {
    it('cancels draft successfully and preserves document number (BR-15, BR-16)', async () => {
      vi.mocked(prisma.deliveryOrder.findUnique).mockResolvedValue({
        id: 'do-1',
        orderNo: 'DO-2026-0001',
        status: 'DRAFT',
      } as never);
      vi.mocked(prisma.deliveryOrder.update).mockResolvedValue({
        id: 'do-1',
        orderNo: 'DO-2026-0001',
        status: 'CANCELLED',
      } as never);

      const result = await cancelDeliveryOrder('do-1', 'user-1');
      expect(result.status).toBe('CANCELLED');
      expect(result.orderNo).toBe('DO-2026-0001');
    });

    it('rejects cancellation if DO is already SHIPPED (BR-18)', async () => {
      vi.mocked(prisma.deliveryOrder.findUnique).mockResolvedValue({
        id: 'do-1',
        orderNo: 'DO-2026-0001',
        status: 'SHIPPED',
      } as never);

      await expect(cancelDeliveryOrder('do-1', 'user-1')).rejects.toThrow(
        /sudah berstatus SHIPPED dan tidak dapat dibatalkan.*BR-18/,
      );
    });
  });

  describe('shipDeliveryOrder (Atomic Outflow & FEFO)', () => {
    it('allocates batch via FEFO when item has no batch specified (BR-08)', async () => {
      const mockDO = {
        id: 'do-1',
        orderNo: 'DO-2026-0001',
        status: 'DRAFT',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            locationId: 'loc-1',
            batchId: null, // No batch specified -> FEFO auto
            quantity: 5,
            product: mockProduct,
            location: mockLocation,
          },
        ],
      };

      vi.mocked(prisma.deliveryOrder.findUnique).mockResolvedValue(mockDO as never);

      // Available stocks ordered by FEFO: batch-fefo (2026-12) comes before batch-later (2027-06)
      const mockCandidateStocks = [
        {
          id: 'stock-fefo',
          productId: 'prod-1',
          locationId: 'loc-1',
          batchId: 'batch-fefo',
          quantity: 20,
          batch: {
            id: 'batch-fefo',
            productId: 'prod-1',
            batchNo: 'FEFO-01',
            expiryDate: new Date('2026-12-01'),
          },
        },
      ];
      vi.mocked(prisma.stock.findMany).mockResolvedValue(mockCandidateStocks as never);

      // Mocks for applyStockMovement
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as never);
      vi.mocked(prisma.location.findUnique).mockResolvedValue(mockLocation as never);
      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockCandidateStocks[0]!.batch as never);
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: 'stock-fefo', quantity: 20 }] as never);

      vi.mocked(prisma.deliveryOrder.update).mockResolvedValue({
        ...mockDO,
        status: 'SHIPPED',
        shippedAt: new Date(),
      } as never);

      const result = await shipDeliveryOrder('do-1', 'user-1');

      expect(result.status).toBe('SHIPPED');
      // Assert that FEFO batch was assigned to item
      expect(prisma.deliveryOrderItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: { batchId: 'batch-fefo' },
        }),
      );
      // Assert stock was reduced and movement recorded
      expect(prisma.stock.update).toHaveBeenCalled();
      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            movementType: 'OUT',
            quantity: 5,
            balanceAfter: 15,
          }),
        }),
      );
    });

    it('rejects shipping with INSUFFICIENT_STOCK if requested quantity exceeds available stock (BR-17)', async () => {
      const mockDO = {
        id: 'do-1',
        orderNo: 'DO-2026-0001',
        status: 'DRAFT',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            locationId: 'loc-1',
            batchId: null,
            quantity: 50, // Demands 50
            product: mockProduct,
            location: mockLocation,
          },
        ],
      };

      vi.mocked(prisma.deliveryOrder.findUnique).mockResolvedValue(mockDO as never);
      // Available stock is only 10
      vi.mocked(prisma.stock.findMany).mockResolvedValue([
        {
          id: 'stock-1',
          productId: 'prod-1',
          locationId: 'loc-1',
          batchId: 'batch-1',
          quantity: 10,
          batch: mockBatch,
        },
      ] as never);

      await expect(shipDeliveryOrder('do-1', 'user-1')).rejects.toThrow(
        /Stok tidak mencukupi untuk produk 'Minyak Goreng 2L'.*di lokasi 'A-01-01'.*BR-17/,
      );
    });

    it('rejects shipping if an explicit batch is expired (BR-09)', async () => {
      const expiredDate = new Date('2020-01-01');
      const mockExpiredBatch = {
        id: 'batch-exp',
        productId: 'prod-1',
        batchNo: 'EXP-OLD',
        expiryDate: expiredDate,
      };

      const mockDO = {
        id: 'do-1',
        orderNo: 'DO-2026-0001',
        status: 'DRAFT',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            locationId: 'loc-1',
            batchId: 'batch-exp',
            quantity: 5,
            product: mockProduct,
            location: mockLocation,
          },
        ],
      };

      vi.mocked(prisma.deliveryOrder.findUnique).mockResolvedValue(mockDO as never);
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as never);
      vi.mocked(prisma.location.findUnique).mockResolvedValue(mockLocation as never);
      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockExpiredBatch as never);

      await expect(shipDeliveryOrder('do-1', 'user-1')).rejects.toThrow(
        /Batch 'EXP-OLD' sudah kedaluwarsa dan tidak boleh dikirim.*BR-09/,
      );
    });

    it('rejects shipping if location is frozen during stock opname (BR-22)', async () => {
      const mockFrozenLocation = {
        ...mockLocation,
        isFrozen: true,
      };

      const mockDO = {
        id: 'do-1',
        orderNo: 'DO-2026-0001',
        status: 'DRAFT',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            locationId: 'loc-1',
            batchId: 'batch-1',
            quantity: 5,
            product: mockProduct,
            location: mockFrozenLocation,
          },
        ],
      };

      vi.mocked(prisma.deliveryOrder.findUnique).mockResolvedValue(mockDO as never);
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as never);
      vi.mocked(prisma.location.findUnique).mockResolvedValue(mockFrozenLocation as never);
      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch as never);

      await expect(shipDeliveryOrder('do-1', 'user-1')).rejects.toThrow(
        /sedang dibekukan karena proses opname.*BR-22/,
      );
    });
  });
});
