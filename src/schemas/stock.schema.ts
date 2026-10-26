import { z } from 'zod';

export const MovementTypeEnum = z.enum([
  'IN',
  'OUT',
  'ADJUST_IN',
  'ADJUST_OUT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
]);

export const applyStockMovementSchema = z.object({
  productId: z.string().min(1, 'ID Produk wajib diisi'),
  locationId: z.string().min(1, 'ID Lokasi wajib diisi'),
  batchId: z.string().min(1, 'ID Batch wajib diisi'),
  movementType: MovementTypeEnum,
  quantity: z.coerce
    .number()
    .int('Jumlah mutasi stok harus bilangan bulat (BR-03)')
    .positive('Jumlah mutasi stok harus lebih dari 0 (BR-03)'),
  refType: z.string().min(1, 'Tipe referensi dokumen wajib diisi'),
  refId: z.string().min(1, 'ID referensi dokumen wajib diisi'),
  refNo: z.string().min(1, 'Nomor referensi dokumen wajib diisi'),
  userId: z.string().min(1, 'ID Pengguna wajib diisi'),
  notes: z.string().trim().max(255).optional().nullable(),
});

export type ApplyStockMovementInput = z.infer<typeof applyStockMovementSchema>;
