import { z } from 'zod';
import { Role } from '@prisma/client';

export const userRoleEnum = z.nativeEnum(Role);

const passwordComplexityRegex = /^(?=.*[A-Za-z])(?=.*\d)/;

export const passwordComplexitySchema = z
  .string()
  .min(8, 'Kata sandi minimal 8 karakter')
  .max(100, 'Kata sandi maksimal 100 karakter')
  .regex(passwordComplexityRegex, 'Kata sandi wajib mengandung kombinasi huruf dan angka');

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter').trim(),
  email: z.string().email('Format email tidak valid').toLowerCase().trim(),
  role: userRoleEnum.default(Role.STAFF),
  password: passwordComplexitySchema.optional(),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Nama minimal 2 karakter')
    .max(100, 'Nama maksimal 100 karakter')
    .trim()
    .optional(),
  role: userRoleEnum.optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: passwordComplexitySchema.optional(),
});

export const listUsersQuerySchema = z.object({
  q: z.string().optional(),
  role: userRoleEnum.optional(),
  isActive: z
    .enum(['true', 'false', 'all'])
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    })
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
