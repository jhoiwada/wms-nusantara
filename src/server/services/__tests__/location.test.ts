import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma singleton
vi.mock('@/server/db', () => ({
  prisma: {
    warehouse: {
      findUnique: vi.fn(),
    },
    location: {
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
  parseLocationCode,
  createLocation,
  updateLocation,
  deactivateLocation,
  toggleFreezeLocation,
  listLocations,
} from '../location.service';

describe('Location Service (BR-22, BR-31, BR-32, BR-33)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockActiveWarehouse = {
    id: 'wh-1',
    code: 'WH-JKT',
    name: 'Gudang Utama Jakarta',
    address: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('parseLocationCode (BR-33 regex ^[A-Z]-\\d{2}-\\d{2}$)', () => {
    it('berhasil memparsing kode lokasi valid menjadi Zona, Rak, Level', () => {
      const res = parseLocationCode('a-01-02');
      expect(res).toEqual({
        code: 'A-01-02',
        zone: 'A',
        rack: '01',
        level: '02',
      });
    });

    it('menolak kode lokasi yang tidak sesuai pola format BR-33', () => {
      expect(() => parseLocationCode('A-1-2')).toThrowError();
      expect(() => parseLocationCode('AA-01-02')).toThrowError();
      expect(() => parseLocationCode('RAK-01')).toThrowError();
    });
  });

  it('berhasil membuat lokasi rak baru di gudang aktif', async () => {
    vi.mocked(prisma.warehouse.findUnique).mockResolvedValueOnce(mockActiveWarehouse);
    vi.mocked(prisma.location.findUnique).mockResolvedValueOnce(null); // Uniqueness check
    vi.mocked(prisma.location.create).mockResolvedValueOnce({
      id: 'loc-1',
      warehouseId: 'wh-1',
      code: 'A-01-01',
      zone: 'A',
      rack: '01',
      level: '01',
      isFrozen: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      warehouse: {
        id: 'wh-1',
        code: 'WH-JKT',
        name: 'Gudang Utama Jakarta',
      },
    } as never);

    const result = await createLocation({
      warehouseId: 'wh-1',
      code: 'A-01-01',
    });

    expect(prisma.location.create).toHaveBeenCalledWith({
      data: {
        warehouseId: 'wh-1',
        code: 'A-01-01',
        zone: 'A',
        rack: '01',
        level: '01',
      },
      include: {
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
    expect(result.code).toBe('A-01-01');
  });

  it('menolak pembuatan lokasi jika kode sudah ada di gudang yang sama (BR-33 DUPLICATE)', async () => {
    vi.mocked(prisma.warehouse.findUnique).mockResolvedValueOnce(mockActiveWarehouse);
    vi.mocked(prisma.location.findUnique).mockResolvedValueOnce({
      id: 'loc-existing',
      warehouseId: 'wh-1',
      code: 'A-01-01',
    } as never);

    await expect(
      createLocation({
        warehouseId: 'wh-1',
        code: 'A-01-01',
      }),
    ).rejects.toMatchObject({
      code: 'DUPLICATE',
      statusCode: 409,
    });
  });

  it('menolak pembuatan lokasi jika gudang nonaktif (BR-32)', async () => {
    vi.mocked(prisma.warehouse.findUnique).mockResolvedValueOnce({
      ...mockActiveWarehouse,
      isActive: false,
    });

    await expect(
      createLocation({
        warehouseId: 'wh-1',
        code: 'A-01-01',
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  });

  it('menonaktifkan lokasi rak sesuai BR-31 tanpa menghapus dari database', async () => {
    vi.mocked(prisma.location.findUnique).mockResolvedValueOnce({
      id: 'loc-1',
      warehouseId: 'wh-1',
      code: 'A-01-01',
      isActive: true,
    } as never);

    vi.mocked(prisma.location.update).mockResolvedValueOnce({
      id: 'loc-1',
      warehouseId: 'wh-1',
      code: 'A-01-01',
      isActive: false,
    } as never);

    const result = await deactivateLocation('loc-1');
    expect(result.isActive).toBe(false);
  });

  it('dapat membekukan dan mencairkan lokasi rak (BR-22 isFrozen)', async () => {
    vi.mocked(prisma.location.findUnique).mockResolvedValueOnce({
      id: 'loc-1',
      code: 'A-01-01',
      isFrozen: false,
    } as never);

    vi.mocked(prisma.location.update).mockResolvedValueOnce({
      id: 'loc-1',
      code: 'A-01-01',
      isFrozen: true,
    } as never);

    const frozen = await toggleFreezeLocation('loc-1', true);
    expect(frozen.isFrozen).toBe(true);
  });

  it('berhasil memperbarui kode lokasi dan memvalidasi duplikasi', async () => {
    vi.mocked(prisma.location.findUnique).mockResolvedValueOnce({
      id: 'loc-1',
      warehouseId: 'wh-1',
      code: 'A-01-01',
      zone: 'A',
      rack: '01',
      level: '01',
    } as never); // getLocationById

    vi.mocked(prisma.location.findUnique).mockResolvedValueOnce(null); // uniqueness check

    vi.mocked(prisma.location.update).mockResolvedValueOnce({
      id: 'loc-1',
      warehouseId: 'wh-1',
      code: 'A-01-02',
      zone: 'A',
      rack: '01',
      level: '02',
    } as never);

    const updated = await updateLocation('loc-1', {
      code: 'A-01-02',
    });

    expect(updated.code).toBe('A-01-02');
  });

  it('berhasil memuat daftar lokasi dengan filter gudang dan status beku', async () => {
    vi.mocked(prisma.location.count).mockResolvedValueOnce(1);
    vi.mocked(prisma.location.findMany).mockResolvedValueOnce([
      {
        id: 'loc-1',
        warehouseId: 'wh-1',
        code: 'A-01-01',
        isFrozen: true,
        isActive: true,
      },
    ] as never);

    const res = await listLocations({
      warehouseId: 'wh-1',
      isFrozen: true,
    });

    expect(res.data).toHaveLength(1);
    expect(res.meta.total).toBe(1);
  });
});
