import { cookies } from 'next/headers';
import type { Role } from '@prisma/client';
import { AppError } from '@/server/errors';
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionUser } from '@/server/auth/session';
import { getUserById } from '@/server/services/auth.service';

export const ALL_ROLES: Role[] = ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'];

export function isRoleAllowed(role: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(role);
}

/**
 * Validasi otorisasi server-side berdasarkan role pengguna.
 * Memeriksa token JWT dari cookie sesi, lalu memvalidasi status aktif
 * dan role terkini langsung dari database sesuai standar docs/SECURITY.md.
 */
export async function requireRole(
  allowedRoles: Role[],
  directTokenOrUser?: string | SessionUser,
): Promise<SessionUser> {
  let currentUser: SessionUser | null = null;

  if (typeof directTokenOrUser === 'object' && directTokenOrUser !== null) {
    currentUser = directTokenOrUser;
  } else if (typeof directTokenOrUser === 'string') {
    currentUser = await verifySessionToken(directTokenOrUser);
  } else {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      throw new AppError('UNAUTHENTICATED', 'Silakan login terlebih dahulu');
    }

    currentUser = await verifySessionToken(token);
  }

  if (!currentUser) {
    throw new AppError('UNAUTHENTICATED', 'Sesi tidak valid atau telah kedaluwarsa');
  }

  // Verifikasi status terkini (is_active dan role) dari database
  const freshUser = await getUserById(currentUser.id);

  if (!isRoleAllowed(freshUser.role, allowedRoles)) {
    throw new AppError(
      'FORBIDDEN',
      `Akses ditolak: peran ${freshUser.role} tidak memiliki izin untuk tindakan ini`,
    );
  }

  return freshUser;
}

export async function requireAuth(directTokenOrUser?: string | SessionUser): Promise<SessionUser> {
  return requireRole(ALL_ROLES, directTokenOrUser);
}

/**
 * Mengambil sesi pengguna secara opsional tanpa melempar error.
 * Digunakan pada komponen publik (seperti landing page) untuk mengenali pengguna yang sudah login.
 */
export async function getOptionalAuth(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}
