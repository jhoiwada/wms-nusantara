import { z } from 'zod';

export const StockOpnameStatusEnum = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']);

export const createStockOpnameSchema = z.object({
  warehouseId: z.string().min(1, 'Gudang wajib dipilih'),
  locationIds: z.array(z.string().min(1)).optional().default([]),
  notes: z.string().trim().max(255).optional().nullable(),
});

export const updateStockOpnameItemCountSchema = z.object({
  id: z.string().min(1, 'ID item opname wajib diisi'),
  physicalQty: z.coerce
    .number()
    .int('Hitung fisik harus bilangan bulat (BR-03)')
    .min(0, 'Hitung fisik tidak boleh negatif (BR-01)'),
  notes: z.string().trim().max(255).optional().nullable(),
});

export const updateStockOpnameCountsSchema = z.object({
  items: z.array(updateStockOpnameItemCountSchema).min(1, 'Minimal satu item harus diperbarui'),
});

export const rejectStockOpnameSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(3, 'Alasan penolakan wajib diisi minimal 3 karakter (BR-25)')
    .max(500, 'Alasan penolakan maksimal 500 karakter'),
});

export type CreateStockOpnameInput = z.infer<typeof createStockOpnameSchema>;
export type UpdateStockOpnameItemCountInput = z.infer<typeof updateStockOpnameItemCountSchema>;
export type UpdateStockOpnameCountsInput = z.infer<typeof updateStockOpnameCountsSchema>;
export type RejectStockOpnameInput = z.infer<typeof rejectStockOpnameSchema>;
