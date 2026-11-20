import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listUsers,
  createUser,
  updateUser,
  resetUserPassword,
  PROTECTED_ADMIN_EMAIL,
} from '../user.service';
import { prisma } from '@/server/db';
import bcrypt from 'bcryptjs';
import { recordAuditLog } from '../audit-log.service';

vi.mock('@/server/db', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('mock_hashed_pw'),
  },
}));

vi.mock('../audit-log.service', () => ({
  recordAuditLog: vi.fn().mockResolvedValue({ id: 'log-1' }),
}));

describe('User Service (Kelola Pengguna & Anti-Lockout)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUsers', () => {
    it('mengembalikan daftar pengguna dan metadata paginasi', async () => {
      const mockUsers = [
        { id: 'u1', name: 'Admin', email: 'admin@demo.test', role: 'ADMIN', isActive: true },
        { id: 'u2', name: 'Staff', email: 'staff@demo.test', role: 'STAFF', isActive: true },
      ];
      vi.mocked(prisma.user.count).mockResolvedValue(2);
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as never);

      const result = await listUsers({ page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('createUser', () => {
    it('berhasil membuat pengguna baru dengan password hash default dan mencatat audit log', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'u-new',
        name: 'Operator Baru',
        email: 'operator@demo.test',
        role: 'STAFF',
        isActive: true,
        createdAt: new Date(),
      } as never);

      const result = await createUser(
        {
          name: 'Operator Baru',
          email: 'operator@demo.test',
          role: 'STAFF',
        },
        { id: 'admin-id', name: 'Admin', role: 'ADMIN' },
      );

      expect(result.email).toBe('operator@demo.test');
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entity: 'USER',
          entityId: 'u-new',
        }),
      );
    });

    it('menolak jika email sudah terdaftar (CONFLICT)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u-exist' } as never);

      await expect(
        createUser({
          name: 'Duplikat',
          email: 'admin@demo.test',
          role: 'STAFF',
        }),
      ).rejects.toThrow(/sudah terdaftar/);
    });
  });

  describe('updateUser & Anti-Lockout', () => {
    it('berhasil memperbarui data pengguna biasa', async () => {
      const existing = {
        id: 'u-staff',
        name: 'Staff Lapangan',
        email: 'operator-lapangan@custom.id',
        role: 'STAFF',
        isActive: true,
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...existing,
        name: 'Staff Diperbarui',
        role: 'MANAGER',
      } as never);

      const result = await updateUser('u-staff', { name: 'Staff Diperbarui', role: 'MANAGER' });

      expect(result.name).toBe('Staff Diperbarui');
      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          entity: 'USER',
        }),
      );
    });

    it('menolak menonaktifkan akun demo admin utama (Anti-Lockout Protection)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'admin-1',
        name: 'Administrator',
        email: PROTECTED_ADMIN_EMAIL,
        role: 'ADMIN',
        isActive: true,
      } as never);

      await expect(
        updateUser('admin-1', { isActive: false }, { id: 'admin-1', role: 'ADMIN' }),
      ).rejects.toThrow(/Anti-Lockout Protection/);
    });

    it('menolak menurunkan role akun demo admin utama (Anti-Lockout Protection)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'admin-1',
        name: 'Administrator',
        email: PROTECTED_ADMIN_EMAIL,
        role: 'ADMIN',
        isActive: true,
      } as never);

      await expect(
        updateUser('admin-1', { role: 'STAFF' }, { id: 'other-admin', role: 'ADMIN' }),
      ).rejects.toThrow(/tidak dapat diturunkan/);
    });

    it('menolak jika pengguna mencoba menonaktifkan akunnya sendiri', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-self',
        name: 'Staff Tamu',
        email: 'operator-tamu@custom.id',
        role: 'STAFF',
        isActive: true,
      } as never);

      await expect(
        updateUser('user-self', { isActive: false }, { id: 'user-self', role: 'ADMIN' }),
      ).rejects.toThrow(/tidak dapat menonaktifkan akun Anda sendiri/);
    });
  });

  describe('resetUserPassword', () => {
    it('menolak reset kata sandi pada akun pejabat resmi operasional perusahaan di server publik', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'u-admin',
        name: 'Ahmad Fauzi, S.Kom.',
        email: 'admin@nldlogistics.co.id',
      } as never);

      await expect(
        resetUserPassword('u-admin', 'NewPassword123!', {
          id: 'admin-1',
          name: 'Admin',
          role: 'ADMIN',
        }),
      ).rejects.toThrow(/tidak dapat diubah di server publik/);
    });

    it('berhasil mereset kata sandi akun non-resmi dan mencatat audit log SECURITY', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'u-target',
        name: 'Rudi Hermawan',
        email: 'rudi.hermawan@custom-client.id',
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      const result = await resetUserPassword('u-target', undefined, {
        id: 'admin-1',
        name: 'Admin',
        role: 'ADMIN',
      });

      expect(result.success).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
      expect(recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SECURITY',
          entity: 'USER',
        }),
      );
    });
  });
});
