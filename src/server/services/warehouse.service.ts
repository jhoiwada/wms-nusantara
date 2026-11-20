import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';
import type { CreateWarehouseInput, UpdateWarehouseInput } from '@/schemas/warehouse.schema';
import type { Prisma } from '@prisma/client';

export interface ListWarehousesOptions {
  page?: number;
  pageSize?: number;
  q?: string;
  activeOnly?: boolean;
}

export async function listWarehouses(options: ListWarehousesOptions = {}) {
  const page = Math.max(Number(options.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 20, 1), 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.WarehouseWhereInput = {};

  if (options.activeOnly) {
    where.isActive = true;
  }

  if (options.q?.trim()) {
    const query = options.q.trim();
    where.OR = [
      { code: { contains: query, mode: 'insensitive' } },
      { name: { contains: query, mode: 'insensitive' } },
    ];
  }

  const [total, data] = await Promise.all([
    prisma.warehouse.count({ where }),
    prisma.warehouse.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            locations: true,
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

export async function getWarehouseById(id: string) {
  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          locations: true,
        },
      },
    },
  });

  if (!warehouse) {
    throw new AppError('NOT_FOUND', 'Gudang tidak ditemukan');
  }

  return warehouse;
}

export async function createWarehouse(input: CreateWarehouseInput) {
  const existing = await prisma.warehouse.findUnique({
    where: { code: input.code.toUpperCase() },
  });

  if (existing) {
    throw new AppError('DUPLICATE', `Kode gudang '${input.code}' sudah digunakan (BR-31)`);
  }

  return prisma.warehouse.create({
    data: {
      code: input.code.toUpperCase(),
      name: input.name,
      address: input.address || null,
    },
  });
}

export const PROTECTED_WAREHOUSE_CODES = ['WH-PLG-01', 'WH-MM2-01'];

export async function updateWarehouse(id: string, input: UpdateWarehouseInput) {
  const existing = await getWarehouseById(id);

  if (PROTECTED_WAREHOUSE_CODES.includes(existing.code) && input.isActive === false) {
    throw new AppError(
      'FORBIDDEN',
      `Fasilitas gudang utama perusahaan (${existing.name}) tidak dapat dinonaktifkan di server publik untuk menjaga integritas denah dan tata letak rak.`,
    );
  }

  if (input.code && input.code.toUpperCase() !== existing.code) {
    const duplicate = await prisma.warehouse.findUnique({
      where: { code: input.code.toUpperCase() },
    });
    if (duplicate) {
      throw new AppError('DUPLICATE', `Kode gudang '${input.code}' sudah digunakan (BR-31)`);
    }
  }

  return prisma.warehouse.update({
    where: { id },
    data: {
      ...(input.code !== undefined && { code: input.code.toUpperCase() }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.address !== undefined && { address: input.address || null }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

export async function deactivateWarehouse(id: string) {
  const existing = await getWarehouseById(id);

  if (PROTECTED_WAREHOUSE_CODES.includes(existing.code)) {
    throw new AppError(
      'FORBIDDEN',
      `Fasilitas gudang utama perusahaan (${existing.name}) tidak dapat dinonaktifkan di server publik untuk menjaga integritas denah dan tata letak rak.`,
    );
  }

  return prisma.warehouse.update({
    where: { id },
    data: { isActive: false },
  });
}
