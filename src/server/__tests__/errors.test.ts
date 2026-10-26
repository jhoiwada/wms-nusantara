import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError, handleError } from '../errors';
import { validateEnv } from '@/env';

describe('AppError', () => {
  it('harus membuat instance AppError dengan default statusCode yang sesuai', () => {
    const errNotFound = new AppError('NOT_FOUND', 'Barang tidak ditemukan');
    expect(errNotFound.statusCode).toBe(404);
    expect(errNotFound.code).toBe('NOT_FOUND');
    expect(errNotFound.message).toBe('Barang tidak ditemukan');

    const errStock = new AppError('INSUFFICIENT_STOCK', 'Stok kurang');
    expect(errStock.statusCode).toBe(409);

    const errForbidden = new AppError('FORBIDDEN', 'Akses ditolak');
    expect(errForbidden.statusCode).toBe(403);
  });

  it('harus mengizinkan override statusCode khusus jika disediakan', () => {
    const customErr = new AppError('VALIDATION_ERROR', 'Field salah', 422, { field: 'sku' });
    expect(customErr.statusCode).toBe(422);
    expect(customErr.details).toEqual({ field: 'sku' });
  });
});

describe('handleError', () => {
  it('harus memformat AppError dengan format JSON standar', () => {
    const appErr = new AppError(
      'INSUFFICIENT_STOCK',
      'Stok SKU-FNB-001 di A-01-01 tidak cukup',
      409,
      {
        sku: 'SKU-FNB-001',
        requested: 10,
        available: 2,
      },
    );

    const result = handleError(appErr);
    expect(result.statusCode).toBe(409);
    expect(result.response).toEqual({
      error: {
        code: 'INSUFFICIENT_STOCK',
        message: 'Stok SKU-FNB-001 di A-01-01 tidak cukup',
        details: {
          sku: 'SKU-FNB-001',
          requested: 10,
          available: 2,
        },
      },
    });
  });

  it('harus menangani ZodError dan mengembalikan status 400 VALIDATION_ERROR', () => {
    const schema = z.object({ sku: z.string().min(3) });
    const parseResult = schema.safeParse({ sku: 'a' });
    expect(parseResult.success).toBe(false);

    if (!parseResult.success) {
      const result = handleError(parseResult.error);
      expect(result.statusCode).toBe(400);
      expect(result.response.error.code).toBe('VALIDATION_ERROR');
      expect(result.response.error.details).toBeDefined();
    }
  });

  it('harus menangani Prisma P2002 (Unique constraint failed) sebagai 409 DUPLICATE', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['sku'] },
    });

    const result = handleError(prismaError);
    expect(result.statusCode).toBe(409);
    expect(result.response.error.code).toBe('DUPLICATE');
    expect(result.response.error.message).toContain('sku');
  });

  it('harus menangani Prisma P2025 (Record not found) sebagai 404 NOT_FOUND', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '6.19.3',
    });

    const result = handleError(prismaError);
    expect(result.statusCode).toBe(404);
    expect(result.response.error.code).toBe('NOT_FOUND');
  });

  it('harus menangani unexpected error sebagai 500 INTERNAL_ERROR tanpa bocor informasi internal', () => {
    const unexpected = new Error('Database network socket closed unexpectedly');
    const result = handleError(unexpected);

    expect(result.statusCode).toBe(500);
    expect(result.response.error.code).toBe('INTERNAL_ERROR');
    expect(result.response.error.message).toBe('Terjadi kesalahan internal pada server');
  });
});

describe('validateEnv (src/env.ts)', () => {
  it('harus berhasil memvalidasi ketika semua variabel penting tersedia', () => {
    const validEnv = {
      DATABASE_URL: 'postgresql://wms:wms@localhost:5432/wms',
      AUTH_SECRET: 'secret-key-that-is-at-least-16-characters-long',
      AUTH_URL: 'http://localhost:3000',
      NODE_ENV: 'test',
      LOG_LEVEL: 'info',
    };

    const parsed = validateEnv(validEnv);
    expect(parsed.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(parsed.AUTH_SECRET).toBe(validEnv.AUTH_SECRET);
    expect(parsed.NODE_ENV).toBe('test');
  });

  it('harus melempar error dan gagal start ketika DATABASE_URL hilang', () => {
    const invalidEnv = {
      AUTH_SECRET: 'secret-key-that-is-at-least-16-characters-long',
      AUTH_URL: 'http://localhost:3000',
    };

    expect(() => validateEnv(invalidEnv)).toThrowError(/DATABASE_URL/);
  });

  it('harus melempar error ketika AUTH_SECRET terlalu pendek atau hilang', () => {
    const invalidEnv = {
      DATABASE_URL: 'postgresql://wms:wms@localhost:5432/wms',
      AUTH_SECRET: 'short',
    };

    expect(() => validateEnv(invalidEnv)).toThrowError(/AUTH_SECRET/);
  });
});
