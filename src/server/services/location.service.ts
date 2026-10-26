import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';
import {
  LOCATION_CODE_REGEX,
  type CreateLocationInput,
  type UpdateLocationInput,
} from '@/schemas/warehouse.schema';
import type { Prisma } from '@prisma/client';

export interface ListLocationsOptions {
  page?: number;
  pageSize?: number;
  q?: string;
  warehouseId?: string;
  activeOnly?: boolean;
  isFrozen?: boolean;
}

export function parseLocationCode(code: string): {
  code: string;
  zone: string;
  rack: string;
  level: string;
} {
  const normalized = code.trim().toUpperCase();
  const match = normalized.match(LOCATION_CODE_REGEX);

  if (!match) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Format kode lokasi tidak valid. Wajib mengikuti format Zona-Rak-Level, contoh: A-01-02 (BR-33)',
    );
  }

  const [zone, rack, level] = normalized.split('-');
  if (!zone || !rack || !level) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Format kode lokasi tidak valid. Wajib mengikuti format Zona-Rak-Level, contoh: A-01-02 (BR-33)',
    );
  }

  return {
    code: normalized,
    zone,
    rack,
    level,
  };
}

export async function listLocations(options: ListLocationsOptions = {}) {
  const page = Math.max(Number(options.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 20, 1), 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.LocationWhereInput = {};

  if (options.activeOnly) {
    where.isActive = true;
  }

  if (options.isFrozen !== undefined) {
    where.isFrozen = options.isFrozen;
  }

  if (options.warehouseId) {
    where.warehouseId = options.warehouseId;
  }

  if (options.q?.trim()) {
    const query = options.q.trim();
    where.OR = [
      { code: { contains: query, mode: 'insensitive' } },
      { zone: { contains: query, mode: 'insensitive' } },
      { rack: { contains: query, mode: 'insensitive' } },
      { level: { contains: query, mode: 'insensitive' } },
    ];
  }

  const [total, data] = await Promise.all([
    prisma.location.count({ where }),
    prisma.location.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ warehouseId: 'asc' }, { code: 'asc' }],
      include: {
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            stocks: true,
            movements: true,
          },
        },
      },
    }),
  ]);

  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

export async function getLocationById(id: string) {
  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      warehouse: {
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
        },
      },
      _count: {
        select: {
          stocks: true,
          movements: true,
        },
      },
    },
  });

  if (!location) {
    throw new AppError('NOT_FOUND', 'Lokasi rak tidak ditemukan');
  }

  return location;
}

export async function createLocation(input: CreateLocationInput) {
  // Validate Warehouse exists and is active (BR-32)
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: input.warehouseId },
  });

  if (!warehouse) {
    throw new AppError('NOT_FOUND', 'Gudang tidak ditemukan');
  }

  if (!warehouse.isActive) {
    throw new AppError('VALIDATION_ERROR', 'Gudang yang dipilih sedang nonaktif (BR-32)');
  }

  // Parse & validate code format (BR-33)
  const parsed = parseLocationCode(input.code);

  // Check unique code per warehouse (BR-33 & unique constraint)
  const existing = await prisma.location.findUnique({
    where: {
      warehouseId_code: {
        warehouseId: input.warehouseId,
        code: parsed.code,
      },
    },
  });

  if (existing) {
    throw new AppError(
      'DUPLICATE',
      `Kode lokasi '${parsed.code}' sudah digunakan di gudang ini (BR-33)`,
    );
  }

  return prisma.location.create({
    data: {
      warehouseId: input.warehouseId,
      code: parsed.code,
      zone: input.zone || parsed.zone,
      rack: input.rack || parsed.rack,
      level: input.level || parsed.level,
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
}

export async function updateLocation(id: string, input: UpdateLocationInput) {
  const existing = await getLocationById(id);

  let targetWarehouseId = existing.warehouseId;
  if (input.warehouseId && input.warehouseId !== existing.warehouseId) {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: input.warehouseId },
    });
    if (!warehouse) {
      throw new AppError('NOT_FOUND', 'Gudang tidak ditemukan');
    }
    if (!warehouse.isActive) {
      throw new AppError('VALIDATION_ERROR', 'Gudang yang dipilih sedang nonaktif (BR-32)');
    }
    targetWarehouseId = input.warehouseId;
  }

  let parsed = {
    code: existing.code,
    zone: existing.zone,
    rack: existing.rack,
    level: existing.level,
  };

  if (input.code) {
    parsed = parseLocationCode(input.code);
  }

  // If code or warehouse changed, check uniqueness
  if (parsed.code !== existing.code || targetWarehouseId !== existing.warehouseId) {
    const duplicate = await prisma.location.findUnique({
      where: {
        warehouseId_code: {
          warehouseId: targetWarehouseId,
          code: parsed.code,
        },
      },
    });

    if (duplicate) {
      throw new AppError(
        'DUPLICATE',
        `Kode lokasi '${parsed.code}' sudah digunakan di gudang ini (BR-33)`,
      );
    }
  }

  return prisma.location.update({
    where: { id },
    data: {
      ...(input.warehouseId !== undefined && { warehouseId: targetWarehouseId }),
      ...(input.code !== undefined && {
        code: parsed.code,
        zone: input.zone || parsed.zone,
        rack: input.rack || parsed.rack,
        level: input.level || parsed.level,
      }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.isFrozen !== undefined && { isFrozen: input.isFrozen }),
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
}

export async function deactivateLocation(id: string) {
  await getLocationById(id);

  return prisma.location.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function toggleFreezeLocation(id: string, isFrozen: boolean) {
  await getLocationById(id);

  return prisma.location.update({
    where: { id },
    data: { isFrozen },
  });
}
