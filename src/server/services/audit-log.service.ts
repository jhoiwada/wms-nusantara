import { prisma } from '@/server/db';
import type { Prisma } from '@prisma/client';
import type { CreateAuditLogInput, ListAuditLogsQuery } from '@/schemas/audit-log.schema';
import { logger } from '@/server/logger';

export interface AuditUserContext {
  id?: string;
  name?: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Mencatat audit log baru secara atomik atau asynchronous.
 * Kesalahan pencatatan audit log tidak akan menggagalkan aksi pengguna (failsafe).
 */
export async function recordAuditLog(input: CreateAuditLogInput, tx?: Prisma.TransactionClient) {
  const client = tx || prisma;
  if (!client?.auditLog?.create) {
    return null;
  }
  try {
    return await client.auditLog.create({
      data: {
        userId: input.userId || null,
        userName: input.userName || null,
        userRole: input.userRole || null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId || null,
        description: input.description,
        oldValues: input.oldValues ? (input.oldValues as Prisma.InputJsonValue) : undefined,
        newValues: input.newValues ? (input.newValues as Prisma.InputJsonValue) : undefined,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
    });
  } catch (error) {
    logger.error({ err: error, input }, 'Gagal mencatat audit log (audit trail failsafe)');
    return null;
  }
}

/**
 * Mengambil daftar riwayat audit log dengan pagination dan filter
 */
export async function listAuditLogs(query: ListAuditLogsQuery) {
  const where: Prisma.AuditLogWhereInput = {};

  if (query.entity) {
    where.entity = query.entity;
  }

  if (query.action) {
    where.action = query.action;
  }

  if (query.userId) {
    where.userId = query.userId;
  }

  if (query.search?.trim()) {
    const s = query.search.trim();
    where.OR = [
      { description: { contains: s, mode: 'insensitive' } },
      { userName: { contains: s, mode: 'insensitive' } },
      { entityId: { contains: s, mode: 'insensitive' } },
    ];
  }

  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) {
      const fromDate = new Date(query.from);
      fromDate.setHours(0, 0, 0, 0);
      where.createdAt.gte = fromDate;
    }
    if (query.to) {
      const toDate = new Date(query.to);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  }

  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
  const skip = (page - 1) * pageSize;

  const [total, data] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
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

/**
 * Mengambil rincian detail satu entri audit log berdasarkan ID
 */
export async function getAuditLogById(id: string) {
  return prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}
