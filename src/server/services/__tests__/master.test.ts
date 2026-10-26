import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma singleton
vi.mock('@/server/db', () => ({
  prisma: {
    category: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    supplier: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '@/server/db';
import {
  createCategory,
  updateCategory,
  deactivateCategory,
  listCategories,
} from '../category.service';
import { createSupplier, deactivateSupplier } from '../supplier.service';
import { createCustomer, deactivateCustomer } from '../customer.service';

describe('Category Service (BR-31, BR-32)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('berhasil membuat kategori baru dengan kode uppercase', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.category.create).mockResolvedValueOnce({
      id: 'cat-1',
      code: 'FNB',
      name: 'Makanan & Minuman',
      description: 'Produk F&B',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await createCategory({
      code: 'fnb',
      name: 'Makanan & Minuman',
      description: 'Produk F&B',
    });

    expect(prisma.category.create).toHaveBeenCalledWith({
      data: {
        code: 'FNB',
        name: 'Makanan & Minuman',
        description: 'Produk F&B',
      },
    });
    expect(result.code).toBe('FNB');
  });

  it('menolak pembuatan kategori jika kode sudah ada (DUPLICATE)', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
      id: 'cat-existing',
      code: 'FNB',
      name: 'Existing',
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      createCategory({
        code: 'FNB',
        name: 'Kategori Lain',
      }),
    ).rejects.toMatchObject({
      code: 'DUPLICATE',
      statusCode: 409,
    });
  });

  it('menonaktifkan kategori sesuai BR-31 tanpa menghapus dari database', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
      id: 'cat-1',
      code: 'FNB',
      name: 'F&B',
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.category.update).mockResolvedValueOnce({
      id: 'cat-1',
      code: 'FNB',
      name: 'F&B',
      description: null,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await deactivateCategory('cat-1');
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 'cat-1' },
      data: { isActive: false },
    });
    expect(result.isActive).toBe(false);
  });

  it('melempar NOT_FOUND jika kategori yang dicari tidak ada', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(null);

    await expect(updateCategory('cat-non-existent', { name: 'Baru' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    });
  });

  it('mengambil daftar kategori dengan paginasi dan filter pencarian', async () => {
    vi.mocked(prisma.category.count).mockResolvedValueOnce(1);
    vi.mocked(prisma.category.findMany).mockResolvedValueOnce([
      {
        id: 'cat-1',
        code: 'FNB',
        name: 'Makanan & Minuman',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { products: 5 },
      },
    ] as never);

    const result = await listCategories({ page: 1, pageSize: 10, q: 'makanan', activeOnly: true });

    expect(result.data.length).toBe(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
  });
});

describe('Supplier Service (BR-31, BR-32)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('berhasil membuat supplier baru dan menolak kode duplikat', async () => {
    vi.mocked(prisma.supplier.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.supplier.create).mockResolvedValueOnce({
      id: 'sup-1',
      code: 'SUP-001',
      name: 'PT Sumber Pangan',
      contactName: 'Pak Hendra',
      phone: '08123456789',
      email: 'sales@sumberpangan.com',
      address: 'Jakarta Barat',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const created = await createSupplier({
      code: 'SUP-001',
      name: 'PT Sumber Pangan',
      contactName: 'Pak Hendra',
    });

    expect(created.code).toBe('SUP-001');

    // Coba buat lagi dengan kode yang sama
    vi.mocked(prisma.supplier.findUnique).mockResolvedValueOnce({
      id: 'sup-1',
      code: 'SUP-001',
      name: 'PT Sumber Pangan',
      contactName: 'Pak Hendra',
      phone: null,
      email: null,
      address: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      createSupplier({
        code: 'SUP-001',
        name: 'Supplier Duplikat',
      }),
    ).rejects.toMatchObject({
      code: 'DUPLICATE',
      statusCode: 409,
    });
  });

  it('menonaktifkan supplier sesuai BR-31 (soft delete)', async () => {
    vi.mocked(prisma.supplier.findUnique).mockResolvedValueOnce({
      id: 'sup-1',
      code: 'SUP-001',
      name: 'PT Sumber Pangan',
      contactName: null,
      phone: null,
      email: null,
      address: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.supplier.update).mockResolvedValueOnce({
      id: 'sup-1',
      code: 'SUP-001',
      name: 'PT Sumber Pangan',
      contactName: null,
      phone: null,
      email: null,
      address: null,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await deactivateSupplier('sup-1');
    expect(result.isActive).toBe(false);
  });
});

describe('Customer Service (BR-31, BR-32)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('berhasil membuat customer baru dan menonaktifkannya', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.customer.create).mockResolvedValueOnce({
      id: 'cust-1',
      code: 'CUST-001',
      name: 'Toko Makmur Jaya',
      contactName: 'Ibu Ratna',
      phone: '08129876543',
      email: 'makmur@jaya.com',
      address: 'Bekasi',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const created = await createCustomer({
      code: 'CUST-001',
      name: 'Toko Makmur Jaya',
    });

    expect(created.code).toBe('CUST-001');

    vi.mocked(prisma.customer.findUnique).mockResolvedValueOnce({
      id: 'cust-1',
      code: 'CUST-001',
      name: 'Toko Makmur Jaya',
      contactName: null,
      phone: null,
      email: null,
      address: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.customer.update).mockResolvedValueOnce({
      id: 'cust-1',
      code: 'CUST-001',
      name: 'Toko Makmur Jaya',
      contactName: null,
      phone: null,
      email: null,
      address: null,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const deactivated = await deactivateCustomer('cust-1');
    expect(deactivated.isActive).toBe(false);
  });
});
