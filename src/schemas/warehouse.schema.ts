import { z } from 'zod';

// Warehouse Schemas
export const createWarehouseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Kode gudang minimal 2 karakter')
    .max(20, 'Kode gudang maksimal 20 karakter')
    .toUpperCase(),
  name: z
    .string()
    .trim()
    .min(2, 'Nama gudang minimal 2 karakter')
    .max(100, 'Nama gudang maksimal 100 karakter'),
  address: z.string().trim().max(255).optional().nullable(),
});

export const updateWarehouseSchema = createWarehouseSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;

// Location Regex per BR-33: Zona (A-Z) - Rak (2 digit) - Level (2 digit), e.g. A-01-02
export const LOCATION_CODE_REGEX = /^[A-Z]-\d{2}-\d{2}$/;

// Location Schemas
export const createLocationSchema = z.object({
  warehouseId: z.string().min(1, 'ID Gudang wajib diisi'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      LOCATION_CODE_REGEX,
      'Format kode lokasi tidak valid. Wajib mengikuti format Zona-Rak-Level, contoh: A-01-02 (BR-33)',
    ),
  zone: z.string().trim().optional(),
  rack: z.string().trim().optional(),
  level: z.string().trim().optional(),
});

export const updateLocationSchema = createLocationSchema.partial().extend({
  isActive: z.boolean().optional(),
  isFrozen: z.boolean().optional(),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
