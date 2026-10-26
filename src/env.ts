import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL wajib diisi'),
  DIRECT_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET minimal 16 karakter'),
  AUTH_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  SEED_DEMO_PASSWORD: z.string().default('Password123!'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(rawEnv: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const errorDetails = result.error.flatten().fieldErrors;
    throw new Error(
      `Konfigurasi Environment tidak valid atau belum diisi: ${Object.keys(errorDetails).join(', ')}`,
    );
  }
  return result.data;
}

export const env = validateEnv(process.env);
