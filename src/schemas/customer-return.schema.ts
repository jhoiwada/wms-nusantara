import { z } from 'zod';

export const CustomerReturnReason = z.enum([
  'DAMAGED',
  'WRONG_ITEM',
  'OVER_DELIVERY',
  'EXPIRING_SOON',
  'CUSTOMER_CANCELLED',
  'OTHER',
]);

export type CustomerReturnReasonType = z.infer<typeof CustomerReturnReason>;

export const CustomerReturnReasonLabels: Record<CustomerReturnReasonType, string> = {
  DAMAGED: 'Barang Rusak / Cacat Fisik',
  WRONG_ITEM: 'Salah Kirim Barang (Tidak Sesuai DO)',
  OVER_DELIVERY: 'Kelebihan Kirim (Kuantitas Lebih)',
  EXPIRING_SOON: 'Mendekati Kedaluwarsa (Ditolak Customer)',
  CUSTOMER_CANCELLED: 'Pembatalan Sepihak oleh Customer',
  OTHER: 'Lainnya',
};

export const customerReturnItemSchema = z.object({
  productId: z.string().uuid({ message: 'ID produk tidak valid' }),
  batchId: z.string().uuid({ message: 'ID batch tidak valid' }),
  locationId: z.string().uuid({ message: 'ID lokasi rak tujuan tidak valid' }),
  quantity: z
    .number()
    .int({ message: 'Kuantitas retur harus berupa bilangan bulat' })
    .positive({ message: 'Kuantitas retur harus lebih besar dari 0' }),
  itemNotes: z.string().max(255).optional(),
});

export const createCustomerReturnSchema = z.object({
  deliveryOrderId: z.string().uuid({ message: 'ID dokumen DO tidak valid' }),
  reasonCategory: CustomerReturnReason,
  notes: z
    .string()
    .min(5, { message: 'Alasan dan keterangan retur wajib diisi minimal 5 karakter' })
    .max(500, { message: 'Keterangan retur maksimal 500 karakter' }),
  items: z
    .array(customerReturnItemSchema)
    .min(1, { message: 'Minimal harus ada 1 item barang yang diretur' }),
});

export type CustomerReturnItemInput = z.infer<typeof customerReturnItemSchema>;
export type CreateCustomerReturnInput = z.infer<typeof createCustomerReturnSchema>;
