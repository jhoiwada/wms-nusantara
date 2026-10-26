import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';
import type { CreateCategoryInput, UpdateCategoryInput } from '@/schemas/master.schema';
import type { Prisma } from '@prisma/client';

export interface ListOptions {
  page?: number;
  pageSize?: number;
  q?: string;
  activeOnly?: boolean;
}

export async function listCategories(options: ListOptions = {}) {
  const page = Math.max(Number(options.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 20, 1), 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.CategoryWhereInput = {};

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
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { products: true },
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

export async function getCategoryById(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!category) {
    throw new AppError('NOT_FOUND', 'Kategori tidak ditemukan');
  }

  return category;
}

export async function createCategory(input: CreateCategoryInput) {
  const existing = await prisma.category.findUnique({
    where: { code: input.code.toUpperCase() },
  });

  if (existing) {
    throw new AppError('DUPLICATE', `Kode kategori '${input.code}' sudah digunakan`);
  }

  return prisma.category.create({
    data: {
      code: input.code.toUpperCase(),
      name: input.name,
      description: input.description,
    },
  });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const existing = await getCategoryById(id);

  if (input.code && input.code.toUpperCase() !== existing.code) {
    const duplicate = await prisma.category.findUnique({
      where: { code: input.code.toUpperCase() },
    });
    if (duplicate) {
      throw new AppError('DUPLICATE', `Kode kategori '${input.code}' sudah digunakan`);
    }
  }

  return prisma.category.update({
    where: { id },
    data: {
      ...(input.code ? { code: input.code.toUpperCase() } : {}),
      ...(input.name ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function deactivateCategory(id: string) {
  await getCategoryById(id);

  // BR-31: Master data tidak dihapus permanen, hanya dinonaktifkan
  return prisma.category.update({
    where: { id },
    data: { isActive: false },
  });
}
