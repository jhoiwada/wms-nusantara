import { z } from 'zod';

// Category Schema
export const createCategorySchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Kode kategori minimal 2 karakter')
    .max(20, 'Kode kategori maksimal 20 karakter')
    .toUpperCase(),
  name: z
    .string()
    .trim()
    .min(2, 'Nama kategori minimal 2 karakter')
    .max(100, 'Nama kategori maksimal 100 karakter'),
  description: z.string().trim().max(255).optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// Supplier Schema
export const createSupplierSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Kode supplier minimal 2 karakter')
    .max(20, 'Kode supplier maksimal 20 karakter')
    .toUpperCase(),
  name: z
    .string()
    .trim()
    .min(2, 'Nama supplier minimal 2 karakter')
    .max(150, 'Nama supplier maksimal 150 karakter'),
  contactName: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z
    .string()
    .trim()
    .email('Format email tidak valid')
    .optional()
    .nullable()
    .or(z.literal('')),
  address: z.string().trim().max(255).optional().nullable(),
});

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

// Customer Schema
export const createCustomerSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Kode customer minimal 2 karakter')
    .max(20, 'Kode customer maksimal 20 karakter')
    .toUpperCase(),
  name: z
    .string()
    .trim()
    .min(2, 'Nama customer minimal 2 karakter')
    .max(150, 'Nama customer maksimal 150 karakter'),
  contactName: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z
    .string()
    .trim()
    .email('Format email tidak valid')
    .optional()
    .nullable()
    .or(z.literal('')),
  address: z.string().trim().max(255).optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
