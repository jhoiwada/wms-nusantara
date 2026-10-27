import { z } from 'zod';

export const AdjustmentReasonCategoryEnum = z.enum([
  'EXPIRED_DISPOSAL', // Pemusnahan Barang Kedaluwarsa (BR-09)
  'DAMAGED_GOODS', // Barang Rusak / Pecah di Gudang
  'GR_CORRECTION', // Koreksi Kesalahan Penerimaan GR (BR-14)
  'DO_CORRECTION', // Koreksi Kesalahan Pengiriman DO (BR-18)
  'LOST_INVENTORY', // Kehilangan Stok
  'FOUND_INVENTORY', // Penemuan Stok di Luar Opname
  'PROMO_SAMPLE', // Pengambilan Sample / Promosi
  'OTHER', // Alasan Lainnya
]);

export const AdjustmentReasonLabels: Record<
  z.infer<typeof AdjustmentReasonCategoryEnum>,
  string
> = {
  EXPIRED_DISPOSAL: 'Pemusnahan Barang Kedaluwarsa (BR-09)',
  DAMAGED_GOODS: 'Barang Rusak / Pecah di Gudang',
  GR_CORRECTION: 'Koreksi Penerimaan Barang (GR)',
  DO_CORRECTION: 'Koreksi Pengiriman Barang (DO)',
  LOST_INVENTORY: 'Kehilangan Stok',
  FOUND_INVENTORY: 'Penemuan Stok Fisik',
  PROMO_SAMPLE: 'Pengambilan Sample / Promosi',
  OTHER: 'Lainnya',
};

export const stockAdjustmentItemSchema = z.object({
  productId: z.string().min(1, 'Produk wajib dipilih'),
  locationId: z.string().min(1, 'Lokasi rak wajib dipilih'),
  batchId: z.string().min(1, 'Batch wajib dipilih'),
  movementType: z.enum(['ADJUST_IN', 'ADJUST_OUT']),
  quantity: z.coerce
    .number()
    .int('Jumlah mutasi harus bilangan bulat (BR-03)')
    .positive('Jumlah mutasi harus lebih dari 0 (BR-03)'),
  itemNotes: z.string().trim().max(255).optional().nullable(),
});

export const createStockAdjustmentSchema = z.object({
  reasonCategory: AdjustmentReasonCategoryEnum,
  notes: z
    .string()
    .trim()
    .min(5, 'Alasan penyesuaian wajib diisi minimal 5 karakter (BR-26)')
    .max(500, 'Alasan penyesuaian maksimal 500 karakter'),
  items: z.array(stockAdjustmentItemSchema).min(1, 'Minimal satu item harus disesuaikan'),
});

export type AdjustmentReasonCategory = z.infer<typeof AdjustmentReasonCategoryEnum>;
export type StockAdjustmentItemInput = z.infer<typeof stockAdjustmentItemSchema>;
export type CreateStockAdjustmentInput = z.infer<typeof createStockAdjustmentSchema>;
