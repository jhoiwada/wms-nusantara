import bcrypt from 'bcryptjs';
import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';
import type { LoginInput } from '@/schemas/auth.schema';
import {
  checkLoginRateLimit,
  getRateLimitKey,
  recordLoginFailure,
  resetLoginRateLimit,
} from '@/server/auth/rate-limit';
import { createSessionToken, type SessionUser } from '@/server/auth/session';

export async function loginUser(
  input: LoginInput,
  ip = '127.0.0.1',
): Promise<{ token: string; user: SessionUser }> {
  const rateLimitKey = getRateLimitKey(ip, input.email);
  const rateLimit = checkLoginRateLimit(rateLimitKey);

  if (!rateLimit.allowed) {
    throw new AppError(
      'FORBIDDEN',
      `Terlalu banyak percobaan login yang gagal. Silakan coba lagi dalam ${rateLimit.retryAfterSeconds ?? 900} detik.`,
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase().trim() },
  });

  if (!user) {
    recordLoginFailure(rateLimitKey);
    throw new AppError('UNAUTHENTICATED', 'Email atau password salah');
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordValid) {
    recordLoginFailure(rateLimitKey);
    throw new AppError('UNAUTHENTICATED', 'Email atau password salah');
  }

  if (!user.isActive) {
    throw new AppError('FORBIDDEN', 'Akun Anda telah dinonaktifkan. Hubungi administrator.');
  }

  // Berhasil login: reset rate limiter
  resetLoginRateLimit(rateLimitKey);

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  const token = await createSessionToken(sessionUser);

  return { token, user: sessionUser };
}

export async function getUserById(id: string): Promise<SessionUser> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new AppError('UNAUTHENTICATED', 'Pengguna tidak ditemukan atau sesi tidak valid');
  }

  if (!user.isActive) {
    throw new AppError('FORBIDDEN', 'Akun Anda telah dinonaktifkan. Hubungi administrator.');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
