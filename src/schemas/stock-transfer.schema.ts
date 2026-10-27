import { z } from 'zod';

export const stockTransferItemSchema = z
  .object({
    productId: z.string().min(1, 'Produk wajib dipilih'),
    sourceLocationId: z.string().min(1, 'Lokasi rak asal wajib dipilih'),
    targetLocationId: z.string().min(1, 'Lokasi rak tujuan wajib dipilih'),
    batchId: z.string().min(1, 'Batch wajib dipilih'),
    quantity: z.coerce
      .number()
      .int('Jumlah transfer harus bilangan bulat (BR-03)')
      .positive('Jumlah transfer harus lebih dari 0 (BR-03)'),
    itemNotes: z.string().trim().max(255).optional().nullable(),
  })
  .refine((data) => data.sourceLocationId !== data.targetLocationId, {
    message: 'Lokasi rak asal dan tujuan tidak boleh sama (BR-28)',
    path: ['targetLocationId'],
  });

export const createStockTransferSchema = z.object({
  notes: z.string().trim().max(255).optional().nullable(),
  items: z.array(stockTransferItemSchema).min(1, 'Minimal satu item harus dipindahkan'),
});

export type StockTransferItemInput = z.infer<typeof stockTransferItemSchema>;
export type CreateStockTransferInput = z.infer<typeof createStockTransferSchema>;
