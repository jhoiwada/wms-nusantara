import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma singleton
vi.mock('@/server/db', () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    $queryRaw: vi.fn(),
    supplier: {
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
      create: vi.fn(),
      update: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    documentCounter: {
      upsert: vi.fn(),
    },
    goodsReceipt: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    goodsReceiptItem: {
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/server/db';
import {
  createGoodsReceipt,
  updateGoodsReceipt,
  receiveGoodsReceipt,
  cancelGoodsReceipt,
} from '../goods-receipt.service';

describe('Goods Receipt Service (BR-06, BR-07, BR-11, BR-12, BR-13, BR-14, BR-15, BR-32)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSupplier = {
    id: 'sup-1',
    code: 'SUP-IND',
    name: 'PT Indofood Sukses',
    isActive: true,
  };

  const mockWarehouse = {
    id: 'wh-1',
    code: 'WH-JKT',
    name: 'Gudang Utama Jakarta',
    isActive: true,
  };

  const mockStandardProduct = {
    id: 'prod-std',
    sku: 'STD-001',
    name: 'Beras Ramos 5kg',
    trackExpiry: false,
    isActive: true,
  };

  const mockExpiryProduct = {
    id: 'prod-exp',
    sku: 'EXP-001',
    name: 'Susu UHT 1L',
    trackExpiry: true,
    isActive: true,
  };

  const mockLocation = {
    id: 'loc-1',
    warehouseId: 'wh-1',
    code: 'A-01-01',
    isFrozen: false,
    isActive: true,
  };

  it('berhasil membuat draft GR dengan nomor dokumen urut otomatis (BR-11, BR-15)', async () => {
    vi.mocked(prisma.supplier.findUnique).mockResolvedValueOnce(mockSupplier as never);
    vi.mocked(prisma.warehouse.findUnique).mockResolvedValueOnce(mockWarehouse as never);
    vi.mocked(prisma.product.findMany).mockResolvedValueOnce([mockStandardProduct] as never);
    vi.mocked(prisma.location.findMany).mockResolvedValueOnce([mockLocation] as never);

    vi.mocked(prisma.documentCounter.upsert).mockResolvedValueOnce({
      id: 'dc-1',
      name: `GR-${new Date().getFullYear()}`,
      currentValue: 1,
      updatedAt: new Date(),
    });

    vi.mocked(prisma.goodsReceipt.create).mockResolvedValueOnce({
      id: 'gr-1',
      receiptNo: `GR-${new Date().getFullYear()}-0001`,
      status: 'DRAFT',
      supplierId: 'sup-1',
      warehouseId: 'wh-1',
      items: [],
    } as never);

    const result = await createGoodsReceipt(
      {
        supplierId: 'sup-1',
        warehouseId: 'wh-1',
        items: [
          {
            productId: 'prod-std',
            locationId: 'loc-1',
            quantity: 100,
            unitPrice: 50000,
          },
        ],
      },
      'user-1',
    );

    expect(result.receiptNo).toBe(`GR-${new Date().getFullYear()}-0001`);
    expect(result.status).toBe('DRAFT');
  });

  it('menolak item jika lokasi tidak berada di gudang yang dipilih (BR-13)', async () => {
    vi.mocked(prisma.supplier.findUnique).mockResolvedValueOnce(mockSupplier as never);
    vi.mocked(prisma.warehouse.findUnique).mockResolvedValueOnce(mockWarehouse as never);
    vi.mocked(prisma.product.findMany).mockResolvedValueOnce([mockStandardProduct] as never);
    // Location belongs to wh-other, not wh-1!
    vi.mocked(prisma.location.findMany).mockResolvedValueOnce([
      { ...mockLocation, warehouseId: 'wh-bekasi' },
    ] as never);

    await expect(
      createGoodsReceipt(
        {
          supplierId: 'sup-1',
          warehouseId: 'wh-1',
          items: [
            {
              productId: 'prod-std',
              locationId: 'loc-1',
              quantity: 50,
            },
          ],
        },
        'user-1',
      ),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  });

  it('menolak produk trackExpiry jika tidak menyertakan batch dan expired (BR-06)', async () => {
    vi.mocked(prisma.supplier.findUnique).mockResolvedValueOnce(mockSupplier as never);
    vi.mocked(prisma.warehouse.findUnique).mockResolvedValueOnce(mockWarehouse as never);
    vi.mocked(prisma.product.findMany).mockResolvedValueOnce([mockExpiryProduct] as never);
    vi.mocked(prisma.location.findMany).mockResolvedValueOnce([mockLocation] as never);

    await expect(
      createGoodsReceipt(
        {
          supplierId: 'sup-1',
          warehouseId: 'wh-1',
          items: [
            {
              productId: 'prod-exp',
              locationId: 'loc-1',
              quantity: 20,
              // batchNo and expiryDate omitted!
            },
          ],
        },
        'user-1',
      ),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  });

  it('menolak produk trackExpiry jika tanggal kedaluwarsa sebelum tanggal terima atau di masa lalu (BR-06)', async () => {
    vi.mocked(prisma.supplier.findUnique).mockResolvedValueOnce(mockSupplier as never);
    vi.mocked(prisma.warehouse.findUnique).mockResolvedValueOnce(mockWarehouse as never);
    vi.mocked(prisma.product.findMany).mockResolvedValueOnce([mockExpiryProduct] as never);
    vi.mocked(prisma.location.findMany).mockResolvedValueOnce([mockLocation] as never);

    await expect(
      createGoodsReceipt(
        {
          supplierId: 'sup-1',
          warehouseId: 'wh-1',
          receivedAt: '2026-10-27',
          items: [
            {
              productId: 'prod-exp',
              locationId: 'loc-1',
              quantity: 20,
              batchNo: 'BATCH-PAST',
              expiryDate: '2026-10-20', // Earlier than receivedDate!
            },
          ],
        },
        'user-1',
      ),
    ).rejects.toThrow(
      /Tanggal kedaluwarsa tidak boleh lebih awal dari tanggal penerimaan barang.*BR-06/,
    );
  });

  it('menolak penerimaan barang (RECEIVE) jika tanggal kedaluwarsa telah terlewati (BR-06)', async () => {
    const mockGrWithExpiredItem = {
      id: 'gr-exp',
      receiptNo: 'GR-2026-0002',
      status: 'DRAFT',
      supplier: mockSupplier,
      warehouse: mockWarehouse,
      items: [
        {
          id: 'item-exp',
          productId: 'prod-exp',
          locationId: 'loc-1',
          quantity: 20,
          batchNo: 'EXP-PAST',
          expiryDate: new Date('2020-01-01'), // Already passed!
          product: mockExpiryProduct,
          location: mockLocation,
        },
      ],
    };

    vi.mocked(prisma.goodsReceipt.findUnique).mockResolvedValueOnce(mockGrWithExpiredItem as never);

    await expect(receiveGoodsReceipt('gr-exp', 'user-1')).rejects.toThrow(
      /memiliki tanggal kedaluwarsa.*yang sudah terlewati saat penerimaan barang.*BR-06/,
    );
  });

  it('menerima barang (RECEIVE) secara atomik: stok bertambah dan status menjadi RECEIVED (BR-12)', async () => {
    const mockGrDetail = {
      id: 'gr-1',
      receiptNo: 'GR-2026-0001',
      status: 'DRAFT',
      supplier: mockSupplier,
      warehouse: mockWarehouse,
      items: [
        {
          id: 'item-1',
          productId: 'prod-std',
          locationId: 'loc-1',
          quantity: 50,
          batchNo: 'DEFAULT',
          expiryDate: null,
        },
      ],
    };

    vi.mocked(prisma.goodsReceipt.findUnique).mockResolvedValueOnce(mockGrDetail as never);

    // Mock stock service dependencies
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(mockStandardProduct as never);
    vi.mocked(prisma.location.findUnique).mockResolvedValueOnce(mockLocation as never);
    vi.mocked(prisma.batch.findUnique).mockResolvedValue({
      id: 'batch-def',
      productId: 'prod-std',
      batchNo: 'DEFAULT',
      expiryDate: null,
    } as never);

    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]); // no initial stock
    vi.mocked(prisma.stock.create).mockResolvedValueOnce({ id: 'stk-1', quantity: 50 } as never);
    vi.mocked(prisma.stockMovement.create).mockResolvedValueOnce({ id: 'mov-1' } as never);

    vi.mocked(prisma.goodsReceipt.update).mockResolvedValueOnce({
      ...mockGrDetail,
      status: 'RECEIVED',
      receivedAt: new Date(),
    } as never);

    const received = await receiveGoodsReceipt('gr-1', 'user-1');

    expect(received.status).toBe('RECEIVED');
    expect(prisma.goodsReceipt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'gr-1' },
        data: expect.objectContaining({ status: 'RECEIVED' }),
      }),
    );
  });

  it('menolak penerimaan jika dokumen sudah RECEIVED sebelumnya (BR-14)', async () => {
    vi.mocked(prisma.goodsReceipt.findUnique).mockResolvedValueOnce({
      id: 'gr-1',
      receiptNo: 'GR-2026-0001',
      status: 'RECEIVED', // Already received!
      items: [],
    } as never);

    await expect(receiveGoodsReceipt('gr-1', 'user-1')).rejects.toMatchObject({
      code: 'INVALID_STATE',
      statusCode: 409,
    });
  });

  it('menolak pengeditan dokumen yang sudah RECEIVED (BR-11)', async () => {
    vi.mocked(prisma.goodsReceipt.findUnique).mockResolvedValueOnce({
      id: 'gr-1',
      receiptNo: 'GR-2026-0001',
      status: 'RECEIVED',
      items: [],
    } as never);

    await expect(
      updateGoodsReceipt('gr-1', { notes: 'Edit catatan' }, 'user-1'),
    ).rejects.toMatchObject({
      code: 'INVALID_STATE',
      statusCode: 409,
    });
  });

  it('membatalkan draft GR dan mempertahankan nomor dokumen (BR-11, BR-14, BR-15)', async () => {
    vi.mocked(prisma.goodsReceipt.findUnique).mockResolvedValueOnce({
      id: 'gr-1',
      receiptNo: 'GR-2026-0001',
      status: 'DRAFT',
      items: [],
    } as never);

    vi.mocked(prisma.goodsReceipt.update).mockResolvedValueOnce({
      id: 'gr-1',
      receiptNo: 'GR-2026-0001',
      status: 'CANCELLED',
      items: [],
    } as never);

    const cancelled = await cancelGoodsReceipt('gr-1', 'user-1');
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.receiptNo).toBe('GR-2026-0001'); // Nomor tetap bertahan (BR-15)
  });

  it('menolak pembatalan dokumen yang sudah RECEIVED (BR-14)', async () => {
    vi.mocked(prisma.goodsReceipt.findUnique).mockResolvedValueOnce({
      id: 'gr-1',
      receiptNo: 'GR-2026-0001',
      status: 'RECEIVED', // Cannot cancel received GR!
      items: [],
    } as never);

    await expect(cancelGoodsReceipt('gr-1', 'user-1')).rejects.toMatchObject({
      code: 'INVALID_STATE',
      statusCode: 409,
    });
  });
});
