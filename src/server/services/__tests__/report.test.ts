import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/server/db', () => ({
  prisma: {
    stockMovement: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    product: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    warehouse: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/server/db';
import {
  getMovementsReportData,
  getInventoryValueReportData,
  generateMovementsExcel,
  generateMovementsPdf,
  generateInventoryValueExcel,
  generateInventoryValuePdf,
} from '../report.service';

describe('Report Service (T3.1: Export Excel/PDF Laporan Pergerakan & Nilai Persediaan)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockMovements = [
    {
      id: 'mov-1',
      productId: 'prod-1',
      locationId: 'loc-1',
      batchId: 'batch-1',
      movementType: 'IN',
      quantity: 50,
      balanceAfter: 50,
      refType: 'GOODS_RECEIPT',
      refId: 'gr-1',
      refNo: 'GR-2026-0001',
      userId: 'user-1',
      notes: 'Penerimaan supplier',
      createdAt: new Date('2026-10-20T10:00:00Z'),
      product: {
        id: 'prod-1',
        sku: 'SKU-001',
        name: 'Beras Ramos 5kg',
        uom: 'BAG',
        category: { name: 'Sembako' },
      },
      location: {
        id: 'loc-1',
        code: 'A-01-01',
        warehouse: {
          id: 'wh-1',
          code: 'GUD-JKT',
          name: 'Gudang Utama Jakarta',
        },
      },
      batch: {
        id: 'batch-1',
        batchNo: 'BATCH-2026-01',
        expiryDate: new Date('2027-01-01'),
      },
      user: {
        id: 'user-1',
        name: 'Budi Santoso',
        email: 'budi@wms.local',
      },
    },
    {
      id: 'mov-2',
      productId: 'prod-1',
      locationId: 'loc-1',
      batchId: 'batch-1',
      movementType: 'OUT',
      quantity: 15,
      balanceAfter: 35,
      refType: 'DELIVERY_ORDER',
      refId: 'do-1',
      refNo: 'DO-2026-0001',
      userId: 'user-2',
      notes: 'Pengiriman toko',
      createdAt: new Date('2026-10-22T14:30:00Z'),
      product: {
        id: 'prod-1',
        sku: 'SKU-001',
        name: 'Beras Ramos 5kg',
        uom: 'BAG',
        category: { name: 'Sembako' },
      },
      location: {
        id: 'loc-1',
        code: 'A-01-01',
        warehouse: {
          id: 'wh-1',
          code: 'GUD-JKT',
          name: 'Gudang Utama Jakarta',
        },
      },
      batch: {
        id: 'batch-1',
        batchNo: 'BATCH-2026-01',
        expiryDate: new Date('2027-01-01'),
      },
      user: {
        id: 'user-2',
        name: 'Ani Wijaya',
        email: 'ani@wms.local',
      },
    },
  ];

  describe('getMovementsReportData', () => {
    it('mengambil daftar mutasi dengan agregasi kuantitas masuk dan keluar yang akurat', async () => {
      vi.mocked(prisma.stockMovement.count).mockResolvedValue(2);
      vi.mocked(prisma.stockMovement.findMany)
        .mockResolvedValueOnce([
          { movementType: 'IN', quantity: 50 },
          { movementType: 'OUT', quantity: 15 },
        ] as never)
        .mockResolvedValueOnce(mockMovements as never);

      const result = await getMovementsReportData({
        from: '2026-10-01',
        to: '2026-10-31',
        format: 'json',
        page: 1,
        pageSize: 50,
      });

      expect(result.summary.totalMovements).toBe(2);
      expect(result.summary.totalInQty).toBe(50);
      expect(result.summary.totalOutQty).toBe(15);
      expect(result.summary.netQty).toBe(35);
      expect(result.items).toHaveLength(2);

      const first = result.items[0]!;
      expect(first.refNo).toBe('GR-2026-0001');
      expect(first.signedQuantity).toBe(50);

      const second = result.items[1]!;
      expect(second.refNo).toBe('DO-2026-0001');
      expect(second.signedQuantity).toBe(-15);
    });

    it('mendukung filter per warehouse dan tipe pergerakan', async () => {
      vi.mocked(prisma.stockMovement.count).mockResolvedValue(1);
      vi.mocked(prisma.stockMovement.findMany)
        .mockResolvedValueOnce([{ movementType: 'IN', quantity: 50 }] as never)
        .mockResolvedValueOnce([mockMovements[0]] as never);

      const result = await getMovementsReportData({
        warehouseId: 'wh-1',
        type: 'IN',
        format: 'json',
        page: 1,
        pageSize: 50,
      });

      expect(result.summary.totalMovements).toBe(1);
      expect(result.summary.totalInQty).toBe(50);
      expect(result.summary.totalOutQty).toBe(0);
      expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            movementType: 'IN',
            location: { warehouseId: 'wh-1' },
          }),
        }),
      );
    });
  });

  describe('getInventoryValueReportData', () => {
    it('menghitung nilai total persediaan barang dan breakdown per gudang', async () => {
      vi.mocked(prisma.product.count).mockResolvedValue(2);
      vi.mocked(prisma.warehouse.findMany).mockResolvedValue([
        { id: 'wh-1', code: 'GUD-JKT', name: 'Gudang Utama Jakarta' },
        { id: 'wh-2', code: 'GUD-BKS', name: 'Gudang Cabang Bekasi' },
      ] as never);

      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: 'prod-1',
          sku: 'SKU-001',
          name: 'Beras Ramos 5kg',
          uom: 'BAG',
          minStock: 10,
          costPrice: 65000,
          category: { name: 'Sembako' },
          stocks: [
            {
              quantity: 100,
              batch: { expiryDate: new Date('2027-01-01') },
              location: {
                warehouse: { id: 'wh-1', code: 'GUD-JKT', name: 'Gudang Utama Jakarta' },
              },
            },
            {
              quantity: 50,
              batch: { expiryDate: new Date('2027-01-01') },
              location: {
                warehouse: { id: 'wh-2', code: 'GUD-BKS', name: 'Gudang Cabang Bekasi' },
              },
            },
          ],
        },
        {
          id: 'prod-2',
          sku: 'SKU-002',
          name: 'Minyak Goreng 2L',
          uom: 'POUCH',
          minStock: 20,
          costPrice: 32000,
          category: { name: 'Minyak' },
          stocks: [
            {
              quantity: 5, // Low stock: 5 <= 20
              batch: { expiryDate: new Date('2027-01-01') },
              location: {
                warehouse: { id: 'wh-1', code: 'GUD-JKT', name: 'Gudang Utama Jakarta' },
              },
            },
          ],
        },
      ] as never);

      const result = await getInventoryValueReportData({
        format: 'json',
        page: 1,
        pageSize: 50,
      });

      // Total units: (100 + 50) + 5 = 155
      // Total value: (150 * 65000) + (5 * 32000) = 9,750,000 + 160,000 = 9,910,000
      expect(result.summary.totalPhysicalUnits).toBe(155);
      expect(result.summary.totalInventoryValue).toBe(9910000);
      expect(result.summary.totalSkus).toBe(2);
      expect(result.summary.lowStockSkus).toBe(1);
      expect(result.summary.warehouseBreakdown).toHaveLength(2);

      const jkt = result.summary.warehouseBreakdown.find((w) => w.code === 'GUD-JKT');
      expect(jkt?.totalUnits).toBe(105);
      expect(jkt?.totalValue).toBe(100 * 65000 + 5 * 32000);
    });
  });

  describe('generateMovementsExcel & generateMovementsPdf', () => {
    const mockReportData = {
      items: [
        {
          id: 'mov-1',
          createdAt: '2026-10-20T10:00:00.000Z',
          refNo: 'GR-2026-0001',
          refType: 'GOODS_RECEIPT',
          movementType: 'IN' as const,
          product: {
            id: 'prod-1',
            sku: 'SKU-001',
            name: 'Beras Ramos 5kg',
            uom: 'BAG',
            categoryName: 'Sembako',
          },
          location: {
            id: 'loc-1',
            code: 'A-01-01',
            warehouse: { id: 'wh-1', code: 'GUD-JKT', name: 'Gudang Utama Jakarta' },
          },
          batch: {
            id: 'batch-1',
            batchNo: 'BATCH-2026-01',
            expiryDate: '2027-01-01T00:00:00.000Z',
          },
          quantity: 50,
          signedQuantity: 50,
          balanceAfter: 50,
          user: { id: 'user-1', name: 'Budi Santoso', email: 'budi@wms.local' },
          notes: 'Penerimaan masuk',
        },
      ],
      summary: {
        totalMovements: 1,
        totalInQty: 50,
        totalOutQty: 0,
        netQty: 50,
      },
      meta: {
        page: 1,
        pageSize: 50,
        total: 1,
        totalPages: 1,
      },
    };

    it('menghasilkan buffer file Excel (.xlsx) mutasi stok yang valid', async () => {
      const buffer = await generateMovementsExcel(mockReportData, {
        warehouseName: 'Gudang Utama Jakarta',
        dateRangeText: '2026-10-01 s.d. 2026-10-31',
      });

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(1000);
      // Signature PK (zip container untuk xlsx)
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    });

    it('menghasilkan buffer file PDF (.pdf) mutasi stok yang valid', async () => {
      const buffer = await generateMovementsPdf(mockReportData, {
        warehouseName: 'Gudang Utama Jakarta',
        dateRangeText: '2026-10-01 s.d. 2026-10-31',
      });

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(500);
      // Signature %PDF
      const header = buffer.subarray(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');
    });
  });

  describe('generateInventoryValueExcel & generateInventoryValuePdf', () => {
    const mockInventoryData = {
      items: [
        {
          productId: 'prod-1',
          sku: 'SKU-001',
          name: 'Beras Ramos 5kg',
          uom: 'BAG',
          categoryName: 'Sembako',
          minStock: 20,
          costPrice: 65000,
          totalQuantity: 100,
          availableQuantity: 100,
          expiredQuantity: 0,
          totalValue: 6500000,
          isLowStock: false,
          warehouses: [
            {
              id: 'wh-1',
              code: 'GUD-JKT',
              name: 'Gudang Utama Jakarta',
              quantity: 100,
              value: 6500000,
            },
          ],
        },
      ],
      summary: {
        totalInventoryValue: 6500000,
        totalPhysicalUnits: 100,
        totalSkus: 1,
        lowStockSkus: 0,
        outOfStockSkus: 0,
        warehouseBreakdown: [
          {
            id: 'wh-1',
            code: 'GUD-JKT',
            name: 'Gudang Utama Jakarta',
            totalUnits: 100,
            totalValue: 6500000,
          },
        ],
      },
      meta: {
        page: 1,
        pageSize: 50,
        total: 1,
        totalPages: 1,
      },
    };

    it('menghasilkan buffer file Excel (.xlsx) nilai persediaan yang valid', async () => {
      const buffer = await generateInventoryValueExcel(mockInventoryData, {
        warehouseName: 'Konsolidasi',
      });

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(1000);
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    });

    it('menghasilkan buffer file PDF (.pdf) nilai persediaan yang valid', async () => {
      const buffer = await generateInventoryValuePdf(mockInventoryData, {
        warehouseName: 'Konsolidasi',
      });

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(500);
      const header = buffer.subarray(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');
    });
  });
});
