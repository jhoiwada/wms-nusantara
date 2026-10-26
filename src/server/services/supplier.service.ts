import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';
import type { CreateSupplierInput, UpdateSupplierInput } from '@/schemas/master.schema';
import type { Prisma } from '@prisma/client';

export interface ListOptions {
  page?: number;
  pageSize?: number;
  q?: string;
  activeOnly?: boolean;
}

export async function listSuppliers(options: ListOptions = {}) {
  const page = Math.max(Number(options.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 20, 1), 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.SupplierWhereInput = {};

  if (options.activeOnly) {
    where.isActive = true;
  }

  if (options.q?.trim()) {
    const query = options.q.trim();
    where.OR = [
      { code: { contains: query, mode: 'insensitive' } },
      { name: { contains: query, mode: 'insensitive' } },
      { contactName: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
      { phone: { contains: query, mode: 'insensitive' } },
    ];
  }

  const [total, data] = await Promise.all([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { goodsReceipts: true },
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

export async function getSupplierById(id: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      _count: {
        select: { goodsReceipts: true },
      },
    },
  });

  if (!supplier) {
    throw new AppError('NOT_FOUND', 'Supplier tidak ditemukan');
  }

  return supplier;
}

export async function createSupplier(input: CreateSupplierInput) {
  const existing = await prisma.supplier.findUnique({
    where: { code: input.code.toUpperCase() },
  });

  if (existing) {
    throw new AppError('DUPLICATE', `Kode supplier '${input.code}' sudah digunakan`);
  }

  return prisma.supplier.create({
    data: {
      code: input.code.toUpperCase(),
      name: input.name,
      contactName: input.contactName,
      phone: input.phone,
      email: input.email || null,
      address: input.address,
    },
  });
}

export async function updateSupplier(id: string, input: UpdateSupplierInput) {
  const existing = await getSupplierById(id);

  if (input.code && input.code.toUpperCase() !== existing.code) {
    const duplicate = await prisma.supplier.findUnique({
      where: { code: input.code.toUpperCase() },
    });
    if (duplicate) {
      throw new AppError('DUPLICATE', `Kode supplier '${input.code}' sudah digunakan`);
    }
  }

  return prisma.supplier.update({
    where: { id },
    data: {
      ...(input.code ? { code: input.code.toUpperCase() } : {}),
      ...(input.name ? { name: input.name } : {}),
      ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email || null } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function deactivateSupplier(id: string) {
  await getSupplierById(id);

  // BR-31: Master data tidak dihapus permanen, hanya dinonaktifkan
  return prisma.supplier.update({
    where: { id },
    data: { isActive: false },
  });
}
