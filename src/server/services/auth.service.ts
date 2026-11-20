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
import { recordAuditLog } from './audit-log.service';

export async function loginUser(
  input: LoginInput,
  ip = '127.0.0.1',
  userAgent?: string,
): Promise<{ token: string; user: SessionUser }> {
  const rateLimitKey = getRateLimitKey(ip, input.email);
  const rateLimit = checkLoginRateLimit(rateLimitKey);

  if (!rateLimit.allowed) {
    throw new AppError(
      'FORBIDDEN',
      `Terlalu banyak percobaan login yang gagal. Silakan coba lagi dalam ${rateLimit.retryAfterSeconds ?? 900} detik.`,
    );
  }

  const normalizedEmail = input.email.toLowerCase().trim();
  const aliasMap: Record<string, string> = {
    'admin@demo.test': 'admin@nldlogistics.co.id',
    'manager@demo.test': 'manager@nldlogistics.co.id',
    'staff@demo.test': 'staff@nldlogistics.co.id',
    'viewer@demo.test': 'auditor@nldlogistics.co.id',
  };

  const targetEmail = aliasMap[normalizedEmail] || normalizedEmail;

  let user = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  if (!user && targetEmail !== normalizedEmail) {
    user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
  }

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

  // Rekam aktivitas login ke Audit Log sentral
  void recordAuditLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'LOGIN',
    entity: 'AUTH',
    entityId: user.id,
    description: `Pengguna '${user.name}' (${user.email}) berhasil masuk ke portal WMS`,
    ipAddress: ip,
    userAgent: userAgent || null,
  });

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
