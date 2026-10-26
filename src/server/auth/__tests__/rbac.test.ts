import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Role } from '@prisma/client';
import { requireRole, requireAuth } from '../rbac';
import { createSessionToken, verifySessionToken, type SessionUser } from '../session';
import {
  checkLoginRateLimit,
  recordLoginFailure,
  resetLoginRateLimit,
  clearAllRateLimits,
} from '../rate-limit';
import { AppError } from '@/server/errors';

// Mock auth service getUserById to simulate database status lookup
vi.mock('@/server/services/auth.service', () => ({
  getUserById: vi.fn(),
}));

import { getUserById } from '@/server/services/auth.service';

const mockGetUserById = vi.mocked(getUserById);

describe('RBAC Matrix (docs/SECURITY.md)', () => {
  const users: Record<Role, SessionUser> = {
    ADMIN: { id: 'user-admin', email: 'admin@wms.local', name: 'Admin User', role: 'ADMIN' },
    MANAGER: {
      id: 'user-manager',
      email: 'manager@wms.local',
      name: 'Manager User',
      role: 'MANAGER',
    },
    STAFF: { id: 'user-staff', email: 'staff@wms.local', name: 'Staff User', role: 'STAFF' },
    VIEWER: { id: 'user-viewer', email: 'viewer@wms.local', name: 'Viewer User', role: 'VIEWER' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Lihat stok, kartu stok, laporan (Admin: ✔, Manager: ✔, Staff: ✔, Viewer: ✔)', () => {
    const allowedRoles: Role[] = ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'];

    it.each(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'] as Role[])(
      'allows %s to access',
      async (role) => {
        const user = users[role];
        mockGetUserById.mockResolvedValueOnce(user);

        const result = await requireRole(allowedRoles, user);
        expect(result.role).toBe(role);
      },
    );
  });

  describe('2. Ubah master data (Admin: ✔, Manager: ✔, Staff: ✘, Viewer: ✘)', () => {
    const allowedRoles: Role[] = ['ADMIN', 'MANAGER'];

    it.each(['ADMIN', 'MANAGER'] as Role[])('allows %s', async (role) => {
      const user = users[role];
      mockGetUserById.mockResolvedValueOnce(user);

      const result = await requireRole(allowedRoles, user);
      expect(result.role).toBe(role);
    });

    it.each(['STAFF', 'VIEWER'] as Role[])('denies %s with FORBIDDEN', async (role) => {
      const user = users[role];
      mockGetUserById.mockResolvedValueOnce(user);

      await expect(requireRole(allowedRoles, user)).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });
  });

  describe('3. Buat dan posting GR/DO (Admin: ✔, Manager: ✔, Staff: ✔, Viewer: ✘)', () => {
    const allowedRoles: Role[] = ['ADMIN', 'MANAGER', 'STAFF'];

    it.each(['ADMIN', 'MANAGER', 'STAFF'] as Role[])('allows %s', async (role) => {
      const user = users[role];
      mockGetUserById.mockResolvedValueOnce(user);

      const result = await requireRole(allowedRoles, user);
      expect(result.role).toBe(role);
    });

    it('denies VIEWER with FORBIDDEN (403)', async () => {
      const user = users.VIEWER;
      mockGetUserById.mockResolvedValueOnce(user);

      await expect(requireRole(allowedRoles, user)).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });
  });

  describe('4. Batalkan dokumen (Admin: ✔, Manager: ✔, Staff: ✘, Viewer: ✘)', () => {
    const allowedRoles: Role[] = ['ADMIN', 'MANAGER'];

    it.each(['ADMIN', 'MANAGER'] as Role[])('allows %s', async (role) => {
      const user = users[role];
      mockGetUserById.mockResolvedValueOnce(user);

      const result = await requireRole(allowedRoles, user);
      expect(result.role).toBe(role);
    });

    it.each(['STAFF', 'VIEWER'] as Role[])('denies %s with FORBIDDEN (403)', async (role) => {
      const user = users[role];
      mockGetUserById.mockResolvedValueOnce(user);

      await expect(requireRole(allowedRoles, user)).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });
  });

  describe('5. Isi hitung opname (Admin: ✔, Manager: ✔, Staff: ✔, Viewer: ✘)', () => {
    const allowedRoles: Role[] = ['ADMIN', 'MANAGER', 'STAFF'];

    it.each(['ADMIN', 'MANAGER', 'STAFF'] as Role[])('allows %s', async (role) => {
      const user = users[role];
      mockGetUserById.mockResolvedValueOnce(user);

      const result = await requireRole(allowedRoles, user);
      expect(result.role).toBe(role);
    });

    it('denies VIEWER with FORBIDDEN (403)', async () => {
      const user = users.VIEWER;
      mockGetUserById.mockResolvedValueOnce(user);

      await expect(requireRole(allowedRoles, user)).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });
  });

  describe('6. Setujui penyesuaian opname (Admin: ✔, Manager: ✔, Staff: ✘, Viewer: ✘)', () => {
    const allowedRoles: Role[] = ['ADMIN', 'MANAGER'];

    it.each(['ADMIN', 'MANAGER'] as Role[])('allows %s', async (role) => {
      const user = users[role];
      mockGetUserById.mockResolvedValueOnce(user);

      const result = await requireRole(allowedRoles, user);
      expect(result.role).toBe(role);
    });

    it.each(['STAFF', 'VIEWER'] as Role[])('denies %s with FORBIDDEN', async (role) => {
      const user = users[role];
      mockGetUserById.mockResolvedValueOnce(user);

      await expect(requireRole(allowedRoles, user)).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });
  });

  describe('7. Export laporan (Admin: ✔, Manager: ✔, Staff: ✘, Viewer: ✘)', () => {
    const allowedRoles: Role[] = ['ADMIN', 'MANAGER'];

    it.each(['ADMIN', 'MANAGER'] as Role[])('allows %s', async (role) => {
      const user = users[role];
      mockGetUserById.mockResolvedValueOnce(user);

      const result = await requireRole(allowedRoles, user);
      expect(result.role).toBe(role);
    });

    it.each(['STAFF', 'VIEWER'] as Role[])('denies %s with FORBIDDEN', async (role) => {
      const user = users[role];
      mockGetUserById.mockResolvedValueOnce(user);

      await expect(requireRole(allowedRoles, user)).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });
  });

  describe('8. Kelola pengguna (Admin: ✔, Manager: ✘, Staff: ✘, Viewer: ✘)', () => {
    const allowedRoles: Role[] = ['ADMIN'];

    it('allows ADMIN', async () => {
      const user = users.ADMIN;
      mockGetUserById.mockResolvedValueOnce(user);

      const result = await requireRole(allowedRoles, user);
      expect(result.role).toBe('ADMIN');
    });

    it.each(['MANAGER', 'STAFF', 'VIEWER'] as Role[])(
      'denies %s with FORBIDDEN (403)',
      async (role) => {
        const user = users[role];
        mockGetUserById.mockResolvedValueOnce(user);

        await expect(requireRole(allowedRoles, user)).rejects.toMatchObject({
          code: 'FORBIDDEN',
          statusCode: 403,
        });
      },
    );
  });
});

describe('Authentication & Session Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated request with UNAUTHENTICATED (401)', async () => {
    await expect(requireRole(['ADMIN'], 'invalid-token-here')).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      statusCode: 401,
    });
  });

  it('denies deactivated user with FORBIDDEN (403)', async () => {
    const user: SessionUser = {
      id: 'user-deactivated',
      email: 'inactive@wms.local',
      name: 'Inactive User',
      role: 'STAFF',
    };

    mockGetUserById.mockRejectedValueOnce(
      new AppError('FORBIDDEN', 'Akun Anda telah dinonaktifkan. Hubungi administrator.'),
    );

    await expect(requireAuth(user)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  });

  it('creates and verifies valid JWT session token', async () => {
    const user: SessionUser = {
      id: 'uuid-1234',
      email: 'admin@wms.local',
      name: 'Administrator',
      role: 'ADMIN',
    };

    const token = await createSessionToken(user);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const decoded = await verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(user.id);
    expect(decoded?.email).toBe(user.email);
    expect(decoded?.role).toBe(user.role);
  });

  it('returns null on tampered JWT token', async () => {
    const decoded = await verifySessionToken('tampered.jwt.payload');
    expect(decoded).toBeNull();
  });
});

describe('Login Rate Limiter (docs/SECURITY.md)', () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  it('allows initial login attempts', () => {
    const result = checkLoginRateLimit('192.168.1.1:admin@wms.local');
    expect(result.allowed).toBe(true);
    expect(result.remainingAttempts).toBe(5);
  });

  it('decrements remaining attempts on failure and blocks after 5 failures', () => {
    const key = '192.168.1.1:admin@wms.local';

    for (let i = 1; i <= 4; i++) {
      recordLoginFailure(key);
      const check = checkLoginRateLimit(key);
      expect(check.allowed).toBe(true);
      expect(check.remainingAttempts).toBe(5 - i);
    }

    // 5th failure
    recordLoginFailure(key);
    const blocked = checkLoginRateLimit(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remainingAttempts).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('resets rate limit on successful login', () => {
    const key = '192.168.1.1:admin@wms.local';
    recordLoginFailure(key);
    recordLoginFailure(key);

    resetLoginRateLimit(key);
    const check = checkLoginRateLimit(key);
    expect(check.allowed).toBe(true);
    expect(check.remainingAttempts).toBe(5);
  });
});
