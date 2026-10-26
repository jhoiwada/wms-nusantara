import { z } from 'zod';

export const goodsReceiptItemInputSchema = z.object({
  productId: z.string().min(1, 'ID Produk wajib dipilih'),
  locationId: z.string().min(1, 'ID Lokasi rak wajib dipilih'),
  quantity: z.coerce
    .number()
    .int('Jumlah harus bilangan bulat')
    .positive('Jumlah harus lebih besar dari 0 (BR-03)'),
  unitPrice: z.coerce.number().min(0, 'Harga satuan tidak boleh negatif').default(0).optional(),
  batchNo: z.string().trim().optional().nullable(),
  expiryDate: z.union([z.string().trim(), z.date()]).optional().nullable(),
});

export const createGoodsReceiptSchema = z.object({
  supplierId: z.string().min(1, 'Supplier wajib dipilih'),
  warehouseId: z.string().min(1, 'Gudang tujuan wajib dipilih'),
  receivedAt: z.union([z.string().trim(), z.date()]).optional().nullable(),
  notes: z.string().trim().max(255).optional().nullable(),
  items: z
    .array(goodsReceiptItemInputSchema)
    .min(1, 'Dokumen penerimaan wajib memiliki minimal 1 item barang'),
});

export const updateGoodsReceiptSchema = createGoodsReceiptSchema.partial().extend({
  items: z
    .array(goodsReceiptItemInputSchema)
    .min(1, 'Dokumen penerimaan wajib memiliki minimal 1 item barang')
    .optional(),
});

export type GoodsReceiptItemInput = z.infer<typeof goodsReceiptItemInputSchema>;
export type CreateGoodsReceiptInput = z.infer<typeof createGoodsReceiptSchema>;
export type UpdateGoodsReceiptInput = z.infer<typeof updateGoodsReceiptSchema>;
