import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';
import type { CreateProductInput, UpdateProductInput } from '@/schemas/product.schema';
import { Prisma } from '@prisma/client';
import { recordAuditLog, type AuditUserContext } from './audit-log.service';

export interface ListProductsOptions {
  page?: number;
  pageSize?: number;
  q?: string;
  categoryId?: string;
  activeOnly?: boolean;
}

export async function listProducts(options: ListProductsOptions = {}) {
  const page = Math.max(Number(options.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 20, 1), 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.ProductWhereInput = {};

  if (options.activeOnly) {
    where.isActive = true;
  }

  if (options.categoryId) {
    where.categoryId = options.categoryId;
  }

  if (options.q?.trim()) {
    const query = options.q.trim();
    where.OR = [
      { sku: { contains: query, mode: 'insensitive' } },
      { barcode: { contains: query, mode: 'insensitive' } },
      { name: { contains: query, mode: 'insensitive' } },
    ];
  }

  const [total, data] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        category: {
          select: {
            id: true,
            code: true,
            name: true,
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

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          code: true,
          name: true,
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

  if (!product) {
    throw new AppError('NOT_FOUND', 'Produk tidak ditemukan');
  }

  return product;
}

export async function createProduct(input: CreateProductInput, user?: AuditUserContext) {
  // Validate Category exists and is active (BR-32)
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
  });

  if (!category) {
    throw new AppError('NOT_FOUND', 'Kategori produk tidak ditemukan');
  }

  if (!category.isActive) {
    throw new AppError('VALIDATION_ERROR', 'Kategori yang dipilih sudah nonaktif (BR-32)');
  }

  // Check unique SKU (BR-31)
  const existingSku = await prisma.product.findUnique({
    where: { sku: input.sku.toUpperCase() },
  });

  if (existingSku) {
    throw new AppError('DUPLICATE', `SKU '${input.sku}' sudah digunakan (BR-31)`);
  }

  // Check unique Barcode if provided (BR-31)
  if (input.barcode) {
    const existingBarcode = await prisma.product.findUnique({
      where: { barcode: input.barcode },
    });

    if (existingBarcode) {
      throw new AppError('DUPLICATE', `Barcode '${input.barcode}' sudah digunakan (BR-31)`);
    }
  }

  const created = await prisma.product.create({
    data: {
      sku: input.sku.toUpperCase(),
      barcode: input.barcode || null,
      name: input.name,
      description: input.description || null,
      categoryId: input.categoryId,
      uom: (input.uom || 'PCS').toUpperCase(),
      minStock: input.minStock ?? 0,
      costPrice: new Prisma.Decimal(input.costPrice ?? 0),
      trackExpiry: Boolean(input.trackExpiry),
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

  await recordAuditLog({
    userId: user?.id,
    userName: user?.name,
    userRole: user?.role,
    action: 'CREATE',
    entity: 'PRODUCT',
    entityId: created.id,
    description: `Menambahkan master produk baru ${created.sku} (${created.name})`,
    newValues: {
      sku: created.sku,
      barcode: created.barcode,
      name: created.name,
      uom: created.uom,
      costPrice: Number(created.costPrice),
      minStock: created.minStock,
      categoryId: created.categoryId,
    },
    ipAddress: user?.ipAddress,
    userAgent: user?.userAgent,
  });

  return created;
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  user?: AuditUserContext,
) {
  const existing = await getProductById(id);

  // Check SKU uniqueness if changed
  if (input.sku && input.sku.toUpperCase() !== existing.sku) {
    const duplicateSku = await prisma.product.findUnique({
      where: { sku: input.sku.toUpperCase() },
    });
    if (duplicateSku) {
      throw new AppError('DUPLICATE', `SKU '${input.sku}' sudah digunakan (BR-31)`);
    }
  }

  // Check Barcode uniqueness if changed
  if (input.barcode && input.barcode !== existing.barcode) {
    const duplicateBarcode = await prisma.product.findUnique({
      where: { barcode: input.barcode },
    });
    if (duplicateBarcode) {
      throw new AppError('DUPLICATE', `Barcode '${input.barcode}' sudah digunakan (BR-31)`);
    }
  }

  // Check Category if changed
  if (input.categoryId && input.categoryId !== existing.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
    });
    if (!category) {
      throw new AppError('NOT_FOUND', 'Kategori produk tidak ditemukan');
    }
    if (!category.isActive) {
      throw new AppError('VALIDATION_ERROR', 'Kategori yang dipilih sudah nonaktif (BR-32)');
    }
  }

  const oldValues = {
    sku: existing.sku,
    barcode: existing.barcode,
    name: existing.name,
    description: existing.description,
    categoryId: existing.categoryId,
    uom: existing.uom,
    minStock: existing.minStock,
    costPrice: Number(existing.costPrice),
    trackExpiry: existing.trackExpiry,
    isActive: existing.isActive,
  };

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(input.sku !== undefined && { sku: input.sku.toUpperCase() }),
      ...(input.barcode !== undefined && { barcode: input.barcode || null }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description || null }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      ...(input.uom !== undefined && { uom: input.uom.toUpperCase() }),
      ...(input.minStock !== undefined && { minStock: input.minStock }),
      ...(input.costPrice !== undefined && { costPrice: new Prisma.Decimal(input.costPrice) }),
      ...(input.trackExpiry !== undefined && { trackExpiry: input.trackExpiry }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
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

  const newValues = {
    sku: updated.sku,
    barcode: updated.barcode,
    name: updated.name,
    description: updated.description,
    categoryId: updated.categoryId,
    uom: updated.uom,
    minStock: updated.minStock,
    costPrice: Number(updated.costPrice),
    trackExpiry: updated.trackExpiry,
    isActive: updated.isActive,
  };

  await recordAuditLog({
    userId: user?.id,
    userName: user?.name,
    userRole: user?.role,
    action: 'UPDATE',
    entity: 'PRODUCT',
    entityId: updated.id,
    description: `Memperbarui data master produk ${updated.sku} (${updated.name})`,
    oldValues,
    newValues,
    ipAddress: user?.ipAddress,
    userAgent: user?.userAgent,
  });

  return updated;
}

export async function deactivateProduct(id: string, user?: AuditUserContext) {
  const existing = await getProductById(id);

  const updated = await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  await recordAuditLog({
    userId: user?.id,
    userName: user?.name,
    userRole: user?.role,
    action: 'STATUS_CHANGE',
    entity: 'PRODUCT',
    entityId: id,
    description: `Menonaktifkan master produk ${existing.sku} (${existing.name})`,
    oldValues: { isActive: existing.isActive },
    newValues: { isActive: false },
    ipAddress: user?.ipAddress,
    userAgent: user?.userAgent,
  });

  return updated;
}
