import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma singleton
vi.mock('@/server/db', () => ({
  prisma: {
    warehouse: {
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
  createWarehouse,
  updateWarehouse,
  deactivateWarehouse,
  listWarehouses,
} from '../warehouse.service';

describe('Warehouse Service (BR-31, BR-32)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('berhasil membuat gudang baru dengan kode uppercase', async () => {
    vi.mocked(prisma.warehouse.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.warehouse.create).mockResolvedValueOnce({
      id: 'wh-1',
      code: 'WH-JKT',
      name: 'Gudang Utama Jakarta',
      address: 'Jl. Rawa Gelam',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await createWarehouse({
      code: 'wh-jkt',
      name: 'Gudang Utama Jakarta',
      address: 'Jl. Rawa Gelam',
    });

    expect(prisma.warehouse.create).toHaveBeenCalledWith({
      data: {
        code: 'WH-JKT',
        name: 'Gudang Utama Jakarta',
        address: 'Jl. Rawa Gelam',
      },
    });
    expect(result.code).toBe('WH-JKT');
  });

  it('menolak pembuatan gudang jika kode sudah ada (DUPLICATE)', async () => {
    vi.mocked(prisma.warehouse.findUnique).mockResolvedValueOnce({
      id: 'existing-wh',
      code: 'WH-JKT',
      name: 'Existing',
      address: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      createWarehouse({
        code: 'WH-JKT',
        name: 'Gudang Lain',
      }),
    ).rejects.toMatchObject({
      code: 'DUPLICATE',
      statusCode: 409,
    });
  });

  it('menonaktifkan gudang sesuai BR-31 tanpa menghapus dari database', async () => {
    vi.mocked(prisma.warehouse.findUnique).mockResolvedValueOnce({
      id: 'wh-1',
      code: 'WH-JKT',
      name: 'Gudang Jakarta',
      address: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.warehouse.update).mockResolvedValueOnce({
      id: 'wh-1',
      code: 'WH-JKT',
      name: 'Gudang Jakarta',
      address: null,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await deactivateWarehouse('wh-1');

    expect(prisma.warehouse.update).toHaveBeenCalledWith({
      where: { id: 'wh-1' },
      data: { isActive: false },
    });
    expect(result.isActive).toBe(false);
  });

  it('berhasil memperbarui data gudang', async () => {
    vi.mocked(prisma.warehouse.findUnique).mockResolvedValueOnce({
      id: 'wh-1',
      code: 'WH-JKT',
      name: 'Nama Lama',
      address: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.warehouse.update).mockResolvedValueOnce({
      id: 'wh-1',
      code: 'WH-JKT',
      name: 'Nama Baru',
      address: 'Alamat Baru',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const updated = await updateWarehouse('wh-1', {
      name: 'Nama Baru',
      address: 'Alamat Baru',
    });

    expect(updated.name).toBe('Nama Baru');
  });

  it('menolak penonaktifan gudang utama perusahaan (WH-PLG-01 / WH-MM2-01) di server publik', async () => {
    vi.mocked(prisma.warehouse.findUnique).mockResolvedValueOnce({
      id: 'wh-plg',
      code: 'WH-PLG-01',
      name: 'DC Pulogadung',
      address: 'Kawasan Industri Pulogadung',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { locations: 10 },
    } as never);

    await expect(deactivateWarehouse('wh-plg')).rejects.toThrow(
      /tidak dapat dinonaktifkan di server publik/,
    );
  });

  it('berhasil memuat daftar gudang terpaginasi', async () => {
    vi.mocked(prisma.warehouse.count).mockResolvedValueOnce(1);
    vi.mocked(prisma.warehouse.findMany).mockResolvedValueOnce([
      {
        id: 'wh-1',
        code: 'WH-JKT',
        name: 'Gudang Jakarta',
        address: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { locations: 5 },
      },
    ] as never);

    const res = await listWarehouses({ q: 'Jakarta', activeOnly: true });

    expect(res.data).toHaveLength(1);
    expect(res.meta.total).toBe(1);
  });
});
