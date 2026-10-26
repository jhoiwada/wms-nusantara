import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(2, 'SKU minimal 2 karakter')
    .max(50, 'SKU maksimal 50 karakter')
    .toUpperCase(),
  barcode: z
    .string()
    .trim()
    .max(50, 'Barcode maksimal 50 karakter')
    .optional()
    .nullable()
    .or(z.literal('')),
  name: z
    .string()
    .trim()
    .min(2, 'Nama produk minimal 2 karakter')
    .max(150, 'Nama produk maksimal 150 karakter'),
  description: z.string().trim().max(255).optional().nullable(),
  categoryId: z.string().uuid('ID Kategori harus berupa UUID yang valid'),
  uom: z
    .string()
    .trim()
    .min(1, 'Satuan minimal 1 karakter')
    .max(20, 'Satuan maksimal 20 karakter')
    .toUpperCase()
    .default('PCS'),
  minStock: z.coerce
    .number()
    .int('Min stok harus bilangan bulat')
    .min(0, 'Min stok tidak boleh negatif')
    .default(0),
  costPrice: z.coerce.number().min(0, 'Harga beli tidak boleh negatif').default(0),
  trackExpiry: z.boolean().default(false),
});

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
