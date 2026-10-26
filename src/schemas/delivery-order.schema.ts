import { z } from 'zod';

export const deliveryOrderItemInputSchema = z.object({
  productId: z.string().min(1, 'ID Produk wajib dipilih'),
  locationId: z.string().min(1, 'ID Lokasi rak wajib dipilih'),
  quantity: z.coerce
    .number()
    .int('Jumlah harus bilangan bulat')
    .positive('Jumlah harus lebih besar dari 0 (BR-03)'),
  batchId: z.string().trim().optional().nullable(),
});

export const createDeliveryOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer wajib dipilih'),
  warehouseId: z.string().min(1, 'Gudang asal wajib dipilih'),
  shippedAt: z.union([z.string().trim(), z.date()]).optional().nullable(),
  notes: z.string().trim().max(255).optional().nullable(),
  items: z
    .array(deliveryOrderItemInputSchema)
    .min(1, 'Dokumen pengiriman wajib memiliki minimal 1 item barang'),
});

export const updateDeliveryOrderSchema = createDeliveryOrderSchema.partial().extend({
  items: z
    .array(deliveryOrderItemInputSchema)
    .min(1, 'Dokumen pengiriman wajib memiliki minimal 1 item barang')
    .optional(),
});

export type DeliveryOrderItemInput = z.infer<typeof deliveryOrderItemInputSchema>;
export type CreateDeliveryOrderInput = z.infer<typeof createDeliveryOrderSchema>;
export type UpdateDeliveryOrderInput = z.infer<typeof updateDeliveryOrderSchema>;
