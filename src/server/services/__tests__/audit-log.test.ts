import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/server/db', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    product: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/server/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { prisma } from '@/server/db';
import { recordAuditLog, listAuditLogs, getAuditLogById } from '../audit-log.service';
import { createProduct, updateProduct, deactivateProduct } from '../product.service';

describe('Audit Log Service (T3.2: Audit Log Master Data & Sensitive Actions)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAuditLog = {
    id: 'log-1',
    userId: 'user-1',
    userName: 'Manager Operasional',
    userRole: 'MANAGER',
    action: 'UPDATE',
    entity: 'PRODUCT',
    entityId: 'prod-1',
    description: 'Memperbarui data master produk SKU-001',
    oldValues: { costPrice: 60000, name: 'Beras Ramos Lama' },
    newValues: { costPrice: 65000, name: 'Beras Ramos Baru' },
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date('2026-10-25T10:00:00Z'),
    user: {
      id: 'user-1',
      name: 'Manager Operasional',
      email: 'manager@wms.local',
      role: 'MANAGER',
    },
  };

  describe('recordAuditLog', () => {
    it('mencatat riwayat audit log dengan atribut lengkap (siapa, apa, kapan, nilai sebelum & sesudah)', async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue(mockAuditLog as never);

      const result = await recordAuditLog({
        userId: 'user-1',
        userName: 'Manager Operasional',
        userRole: 'MANAGER',
        action: 'UPDATE',
        entity: 'PRODUCT',
        entityId: 'prod-1',
        description: 'Memperbarui data master produk SKU-001',
        oldValues: { costPrice: 60000 },
        newValues: { costPrice: 65000 },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result).toBeDefined();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          userName: 'Manager Operasional',
          userRole: 'MANAGER',
          action: 'UPDATE',
          entity: 'PRODUCT',
          entityId: 'prod-1',
          description: 'Memperbarui data master produk SKU-001',
        }),
      });
    });

    it('tidak menggagalkan eksekusi utama jika database audit log mengalami error (failsafe)', async () => {
      vi.mocked(prisma.auditLog.create).mockRejectedValue(new Error('DB Connection Timeout'));

      const result = await recordAuditLog({
        action: 'DELETE',
        entity: 'PRODUCT',
        description: 'Penghapusan produk gagal log',
      });

      expect(result).toBeNull();
    });
  });

  describe('listAuditLogs', () => {
    it('mengembalikan daftar log dengan paginasi dan filter entitas & aksi', async () => {
      vi.mocked(prisma.auditLog.count).mockResolvedValue(1);
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([mockAuditLog as never]);

      const result = await listAuditLogs({
        entity: 'PRODUCT',
        action: 'UPDATE',
        page: 1,
        pageSize: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entity: 'PRODUCT',
            action: 'UPDATE',
          }),
        }),
      );
    });

    it('mendukung pencarian teks dan filter rentang tanggal', async () => {
      vi.mocked(prisma.auditLog.count).mockResolvedValue(1);
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([mockAuditLog as never]);

      await listAuditLogs({
        search: 'Beras',
        from: '2026-10-01',
        to: '2026-10-31',
        page: 1,
        pageSize: 20,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { description: { contains: 'Beras', mode: 'insensitive' } },
            ]),
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('getAuditLogById', () => {
    it('mengambil detail satu catatan audit log berdasarkan ID', async () => {
      vi.mocked(prisma.auditLog.findUnique).mockResolvedValue(mockAuditLog as never);

      const result = await getAuditLogById('log-1');

      expect(result).toEqual(mockAuditLog);
      expect(prisma.auditLog.findUnique).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
    });
  });

  describe('Integrasi Audit Log pada Mutasi Master Produk', () => {
    const mockExistingProduct = {
      id: 'prod-1',
      sku: 'SKU-001',
      barcode: '899123456',
      name: 'Beras Ramos 5kg',
      description: 'Beras premium',
      categoryId: 'cat-1',
      uom: 'BAG',
      minStock: 20,
      costPrice: 65000,
      trackExpiry: false,
      isActive: true,
      category: { id: 'cat-1', code: 'SMB', name: 'Sembako' },
    };

    it('createProduct otomatis mencatat audit log dengan action CREATE dan newValues', async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValue({
        id: 'cat-1',
        isActive: true,
      } as never);
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.product.create).mockResolvedValue(mockExistingProduct as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue(mockAuditLog as never);

      await createProduct(
        {
          sku: 'SKU-001',
          name: 'Beras Ramos 5kg',
          categoryId: 'cat-1',
          uom: 'BAG',
          minStock: 20,
          costPrice: 65000,
          trackExpiry: false,
        },
        {
          id: 'user-admin',
          name: 'Super Admin',
          role: 'ADMIN',
        },
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'CREATE',
          entity: 'PRODUCT',
          userName: 'Super Admin',
          userRole: 'ADMIN',
          newValues: expect.objectContaining({
            sku: 'SKU-001',
            name: 'Beras Ramos 5kg',
            costPrice: 65000,
          }),
        }),
      });
    });

    it('updateProduct otomatis mencatat audit log dengan action UPDATE, oldValues dan newValues', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockExistingProduct as never);
      vi.mocked(prisma.product.update).mockResolvedValue({
        ...mockExistingProduct,
        costPrice: 70000,
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue(mockAuditLog as never);

      await updateProduct(
        'prod-1',
        { costPrice: 70000 },
        { id: 'user-manager', name: 'Manager WMS', role: 'MANAGER' },
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'UPDATE',
          entity: 'PRODUCT',
          entityId: 'prod-1',
          userName: 'Manager WMS',
          userRole: 'MANAGER',
          oldValues: expect.objectContaining({ costPrice: 65000 }),
          newValues: expect.objectContaining({ costPrice: 70000 }),
        }),
      });
    });

    it('deactivateProduct otomatis mencatat audit log dengan action STATUS_CHANGE', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockExistingProduct as never);
      vi.mocked(prisma.product.update).mockResolvedValue({
        ...mockExistingProduct,
        isActive: false,
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue(mockAuditLog as never);

      await deactivateProduct('prod-1', {
        id: 'user-admin',
        name: 'Super Admin',
        role: 'ADMIN',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'STATUS_CHANGE',
          entity: 'PRODUCT',
          entityId: 'prod-1',
          oldValues: { isActive: true },
          newValues: { isActive: false },
        }),
      });
    });
  });
});
