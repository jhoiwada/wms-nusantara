import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';
import bcrypt from 'bcryptjs';
import { recordAuditLog, type AuditUserContext } from './audit-log.service';
import type { CreateUserInput, UpdateUserInput, ListUsersQuery } from '@/schemas/user.schema';
import type { Prisma } from '@prisma/client';

export const PROTECTED_ADMIN_EMAILS = ['admin@nldlogistics.co.id', 'admin@demo.test'];
export const PROTECTED_ADMIN_EMAIL = 'admin@demo.test';

export const PROTECTED_CORE_EMAILS = [
  'admin@nldlogistics.co.id',
  'admin@demo.test',
  'manager@nldlogistics.co.id',
  'manager@demo.test',
  'staff@nldlogistics.co.id',
  'staff@demo.test',
  'auditor@nldlogistics.co.id',
  'viewer@demo.test',
];

export async function listUsers(query: Partial<ListUsersQuery> = {}) {
  const page = Math.max(1, query.page || 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.UserWhereInput = {};

  if (query.role) {
    where.role = query.role;
  }

  if (typeof query.isActive === 'boolean') {
    where.isActive = query.isActive;
  }

  if (query.q?.trim()) {
    const search = query.q.trim();
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            stockMovements: true,
            auditLogs: true,
          },
        },
      },
    }),
  ]);

  return {
    data: users,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          stockMovements: true,
          createdGoodsReceipts: true,
          createdDeliveryOrders: true,
          createdStockOpnames: true,
          auditLogs: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('NOT_FOUND', 'Pengguna tidak ditemukan');
  }

  return user;
}

export async function createUser(input: CreateUserInput, actor?: AuditUserContext) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new AppError('DUPLICATE', `Pengguna dengan email '${input.email}' sudah terdaftar`);
  }

  const rawPassword = input.password?.trim() || 'Password123!';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  // Catat jejak audit
  await recordAuditLog({
    userId: actor?.id,
    userName: actor?.name,
    userRole: actor?.role,
    action: 'CREATE',
    entity: 'USER',
    entityId: user.id,
    description: `Menambahkan pengguna baru '${user.name}' (${user.email}) dengan role ${user.role}`,
    newValues: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
    ipAddress: actor?.ipAddress,
    userAgent: actor?.userAgent,
  });

  return user;
}

export async function updateUser(id: string, input: UpdateUserInput, actor?: AuditUserContext) {
  const existing = await prisma.user.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError('NOT_FOUND', 'Pengguna tidak ditemukan');
  }

  // Proteksi Immutabilitas Akun Resmi Operasional Perusahaan (Server Publik & Anti-Lockout)
  const isProtectedCore = PROTECTED_CORE_EMAILS.includes(existing.email.toLowerCase().trim());
  if (isProtectedCore) {
    if (input.isActive === false) {
      throw new AppError(
        'FORBIDDEN',
        `Akun resmi operasional perusahaan (${existing.email}) tidak dapat dinonaktifkan di server publik (Anti-Lockout Protection)`,
      );
    }
    if (input.role && input.role !== existing.role) {
      throw new AppError(
        'FORBIDDEN',
        `Role resmi operasional perusahaan (${existing.email}) tidak dapat diturunkan atau diubah di server publik (Anti-Lockout Protection)`,
      );
    }
  }

  if (actor?.id === id && input.isActive === false) {
    throw new AppError(
      'FORBIDDEN',
      'Anda tidak dapat menonaktifkan akun Anda sendiri yang sedang aktif digunakan',
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  // Catat jejak audit
  await recordAuditLog({
    userId: actor?.id,
    userName: actor?.name,
    userRole: actor?.role,
    action: 'UPDATE',
    entity: 'USER',
    entityId: updated.id,
    description: `Memperbarui data pengguna '${updated.name}' (${updated.email})`,
    oldValues: {
      name: existing.name,
      role: existing.role,
      isActive: existing.isActive,
    },
    newValues: {
      name: updated.name,
      role: updated.role,
      isActive: updated.isActive,
    },
    ipAddress: actor?.ipAddress,
    userAgent: actor?.userAgent,
  });

  return updated;
}

export async function resetUserPassword(
  id: string,
  newPassword?: string,
  actor?: AuditUserContext,
) {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new AppError('NOT_FOUND', 'Pengguna tidak ditemukan');
  }

  // Proteksi Immutabilitas Kredensial Akun Resmi di Server Publik
  if (PROTECTED_CORE_EMAILS.includes(user.email.toLowerCase().trim())) {
    throw new AppError(
      'FORBIDDEN',
      'Untuk menjaga aksesibilitas pengujian bagi pengunjung lain, kata sandi akun pejabat resmi perusahaan tidak dapat diubah di server publik.',
    );
  }

  const targetPassword = newPassword?.trim() || 'Password123!';
  const passwordHash = await bcrypt.hash(targetPassword, 10);

  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  // Catat jejak audit keamanan
  await recordAuditLog({
    userId: actor?.id,
    userName: actor?.name,
    userRole: actor?.role,
    action: 'SECURITY',
    entity: 'USER',
    entityId: user.id,
    description: `Mereset kata sandi akun pengguna '${user.name}' (${user.email})`,
    ipAddress: actor?.ipAddress,
    userAgent: actor?.userAgent,
  });

  return { success: true, message: `Kata sandi untuk '${user.email}' berhasil direset` };
}
