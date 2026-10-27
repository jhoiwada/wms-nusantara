import { z } from 'zod';

export const reportFormatSchema = z.enum(['json', 'xlsx', 'pdf']).default('json');
export type ReportFormat = z.infer<typeof reportFormatSchema>;

export const movementTypeFilterSchema = z.enum([
  'IN',
  'OUT',
  'ADJUST_IN',
  'ADJUST_OUT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
]);

export const movementsReportQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  warehouseId: z.string().optional(),
  productId: z.string().optional(),
  type: movementTypeFilterSchema.optional(),
  format: reportFormatSchema.default('json'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(50),
});

export type MovementsReportQuery = z.infer<typeof movementsReportQuerySchema>;

export const inventoryValueReportQuerySchema = z.object({
  warehouseId: z.string().optional(),
  categoryId: z.string().optional(),
  search: z.string().optional(),
  format: reportFormatSchema.default('json'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(50),
});

export type InventoryValueReportQuery = z.infer<typeof inventoryValueReportQuerySchema>;
