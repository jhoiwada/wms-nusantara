import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

// Mock prisma singleton
vi.mock('@/server/db', () => ({
  prisma: {
    category: {
      findUnique: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '@/server/db';
import { createProduct, updateProduct, deactivateProduct, listProducts } from '../product.service';

describe('Product Service (BR-06, BR-07, BR-31, BR-32)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockActiveCategory = {
    id: 'cat-1',
    code: 'FNB',
    name: 'Makanan & Minuman',
    description: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('berhasil membuat produk baru dengan SKU uppercase dan trackExpiry', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockActiveCategory);
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null); // SKU check
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null); // Barcode check
    vi.mocked(prisma.product.create).mockResolvedValueOnce({
      id: 'prod-1',
      categoryId: 'cat-1',
      sku: 'INDOMIE-GORENG',
      barcode: '8998866200112',
      name: 'Indomie Goreng 85g',
      description: 'Mi instan goreng favorit',
      uom: 'PCS',
      minStock: 50,
      costPrice: new Prisma.Decimal(2800),
      trackExpiry: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await createProduct({
      categoryId: 'cat-1',
      sku: 'indomie-goreng',
      barcode: '8998866200112',
      name: 'Indomie Goreng 85g',
      description: 'Mi instan goreng favorit',
      uom: 'pcs',
      minStock: 50,
      costPrice: 2800,
      trackExpiry: true,
    });

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        sku: 'INDOMIE-GORENG',
        barcode: '8998866200112',
        name: 'Indomie Goreng 85g',
        description: 'Mi instan goreng favorit',
        categoryId: 'cat-1',
        uom: 'PCS',
        minStock: 50,
        costPrice: new Prisma.Decimal(2800),
        trackExpiry: true,
      },
      include: {
        category: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
    expect(result.sku).toBe('INDOMIE-GORENG');
    expect(result.trackExpiry).toBe(true);
  });

  it('menolak produk jika SKU sudah digunakan (BR-31 DUPLICATE)', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockActiveCategory);
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
      id: 'existing-prod',
      sku: 'INDOMIE-GORENG',
    } as never);

    await expect(
      createProduct({
        categoryId: 'cat-1',
        sku: 'INDOMIE-GORENG',
        name: 'Indomie Goreng Lain',
        uom: 'PCS',
        minStock: 10,
        costPrice: 2500,
        trackExpiry: false,
      }),
    ).rejects.toMatchObject({
      code: 'DUPLICATE',
      statusCode: 409,
    });
  });

  it('menolak produk jika Barcode sudah digunakan (BR-31 DUPLICATE)', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce(mockActiveCategory);
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null); // SKU check ok
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
      id: 'existing-prod',
      barcode: '8998866200112',
    } as never); // Barcode exists

    await expect(
      createProduct({
        categoryId: 'cat-1',
        sku: 'INDOMIE-KUAH',
        barcode: '8998866200112',
        name: 'Indomie Kuah',
        uom: 'PCS',
        minStock: 10,
        costPrice: 2500,
        trackExpiry: false,
      }),
    ).rejects.toMatchObject({
      code: 'DUPLICATE',
      statusCode: 409,
    });
  });

  it('menolak produk jika kategori yang dipilih nonaktif (BR-32)', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
      ...mockActiveCategory,
      isActive: false,
    });

    await expect(
      createProduct({
        categoryId: 'cat-1',
        sku: 'NEW-SKU',
        name: 'Produk Baru',
        uom: 'PCS',
        minStock: 0,
        costPrice: 1000,
        trackExpiry: false,
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  });

  it('menonaktifkan produk sesuai BR-31 tanpa menghapus dari database', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
      id: 'prod-1',
      sku: 'INDOMIE-GORENG',
      name: 'Indomie Goreng',
      isActive: true,
    } as never);

    vi.mocked(prisma.product.update).mockResolvedValueOnce({
      id: 'prod-1',
      sku: 'INDOMIE-GORENG',
      name: 'Indomie Goreng',
      isActive: false,
    } as never);

    const result = await deactivateProduct('prod-1');

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { isActive: false },
    });
    expect(result.isActive).toBe(false);
  });

  it('berhasil memperbarui data produk dan memeriksa duplikasi SKU', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
      id: 'prod-1',
      sku: 'OLD-SKU',
      barcode: null,
      name: 'Old Name',
      categoryId: 'cat-1',
    } as never); // getProductById check

    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null); // uniqueness check for new SKU

    vi.mocked(prisma.product.update).mockResolvedValueOnce({
      id: 'prod-1',
      sku: 'NEW-SKU',
      name: 'New Name',
    } as never);

    const updated = await updateProduct('prod-1', {
      sku: 'NEW-SKU',
      name: 'New Name',
    });

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prod-1' },
        data: expect.objectContaining({
          sku: 'NEW-SKU',
          name: 'New Name',
        }),
      }),
    );
    expect(updated.sku).toBe('NEW-SKU');
  });

  it('berhasil memfilter produk berdasarkan kata kunci pencarian dan kategori', async () => {
    vi.mocked(prisma.product.count).mockResolvedValueOnce(1);
    vi.mocked(prisma.product.findMany).mockResolvedValueOnce([
      {
        id: 'prod-1',
        sku: 'INDOMIE-GORENG',
        name: 'Indomie Goreng',
        categoryId: 'cat-1',
        isActive: true,
      },
    ] as never);

    const res = await listProducts({
      q: 'indomie',
      categoryId: 'cat-1',
      activeOnly: true,
    });

    expect(res.data).toHaveLength(1);
    expect(res.meta.total).toBe(1);
  });
});
