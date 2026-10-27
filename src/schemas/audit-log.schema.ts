import { z } from 'zod';

export const auditActionSchema = z.enum([
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGIN_FAILED',
  'PASSWORD_RESET',
  'APPROVE',
  'REJECT',
  'STATUS_CHANGE',
  'ADJUSTMENT',
  'TRANSFER',
]);

export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditEntitySchema = z.enum([
  'PRODUCT',
  'CATEGORY',
  'SUPPLIER',
  'CUSTOMER',
  'WAREHOUSE',
  'LOCATION',
  'USER',
  'STOCK_OPNAME',
  'STOCK_ADJUSTMENT',
  'STOCK_TRANSFER',
  'AUTH',
]);

export type AuditEntity = z.infer<typeof auditEntitySchema>;

export const createAuditLogSchema = z.object({
  userId: z.string().optional().nullable(),
  userName: z.string().optional().nullable(),
  userRole: z.string().optional().nullable(),
  action: z.string().min(1),
  entity: z.string().min(1),
  entityId: z.string().optional().nullable(),
  description: z.string().min(3),
  oldValues: z.record(z.string(), z.unknown()).optional().nullable(),
  newValues: z.record(z.string(), z.unknown()).optional().nullable(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
});

export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;

export const listAuditLogsQuerySchema = z.object({
  entity: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
