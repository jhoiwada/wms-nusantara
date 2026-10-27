import { prisma } from '@/server/db';
import {
  Prisma,
  Role,
  MovementType,
  GoodsReceiptStatus,
  DeliveryOrderStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

export interface DemoResetResult {
  success: boolean;
  message: string;
  timestamp: string;
  counts: {
    users: number;
    warehouses: number;
    locations: number;
    categories: number;
    products: number;
    suppliers: number;
    customers: number;
    stocks: number;
    movements: number;
    goodsReceipts: number;
    deliveryOrders: number;
  };
}

/**
 * Reset dan inisialisasi database WMS dengan data demo yang kaya dan terstruktur.
 * Mendukung demonstrasi seluruh alur operasional:
 * - 4 Role Pengguna (Admin, Manager, Staff, Viewer)
 * - Multi-Gudang (Jakarta & Bekasi) dengan lokasi rak hierarkis
 * - Stok awal per rak dengan pelacakan batch dan tanggal kedaluwarsa (termasuk batch mendekati expiry)
 * - Riwayat transaksi Goods Receipt (GR-2026-0001) dan Delivery Order (DO-2026-0001)
 * - Konsistensi saldo kartu stok (balanceAfter) dan counter dokumen atomik
 */
export async function resetDemoDatabase(): Promise<DemoResetResult> {
  const timestamp = new Date().toISOString();
  const rawPassword = process.env.SEED_DEMO_PASSWORD || 'Password123!';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  return await prisma.$transaction(
    async (tx) => {
      // 1. Bersihkan transaksi dan mutasi dalam urutan integritas referensial (FK-safe)
      await tx.auditLog.deleteMany();
      await tx.stockMovement.deleteMany();
      await tx.stockOpnameItem.deleteMany();
      await tx.stockOpname.deleteMany();
      await tx.deliveryOrderItem.deleteMany();
      await tx.deliveryOrder.deleteMany();
      await tx.goodsReceiptItem.deleteMany();
      await tx.goodsReceipt.deleteMany();
      await tx.stock.deleteMany();
      await tx.batch.deleteMany();
      await tx.product.deleteMany();
      await tx.category.deleteMany();
      await tx.location.deleteMany();
      await tx.warehouse.deleteMany();
      await tx.supplier.deleteMany();
      await tx.customer.deleteMany();
      await tx.documentCounter.deleteMany();
      await tx.user.deleteMany();

      // 2. Pengguna Demo (4 Role RBAC)
      const usersData = [
        {
          id: 'usr-admin-01',
          name: 'Administrator WMS',
          email: 'admin@demo.test',
          role: Role.ADMIN,
          passwordHash,
        },
        {
          id: 'usr-mgr-01',
          name: 'Budi Santoso (Manager)',
          email: 'manager@demo.test',
          role: Role.MANAGER,
          passwordHash,
        },
        {
          id: 'usr-stf-01',
          name: 'Siti Rahma (Staff Gudang)',
          email: 'staff@demo.test',
          role: Role.STAFF,
          passwordHash,
        },
        {
          id: 'usr-viw-01',
          name: 'Andi Pratama (Viewer)',
          email: 'viewer@demo.test',
          role: Role.VIEWER,
          passwordHash,
        },
      ];
      await tx.user.createMany({ data: usersData });

      // 3. Multi-Gudang (Jakarta & Bekasi)
      const warehousesData = [
        {
          id: 'wh-jkt',
          code: 'WH-JKT',
          name: 'Gudang Utama Jakarta',
          address: 'Kawasan Industri Pulogadung, Jakarta Timur',
          isActive: true,
        },
        {
          id: 'wh-bks',
          code: 'WH-BKS',
          name: 'Gudang Distribusi Bekasi',
          address: 'Kawasan Industri MM2100, Cikarang Barat, Bekasi',
          isActive: true,
        },
      ];
      await tx.warehouse.createMany({ data: warehousesData });

      // 4. Lokasi Rak per Gudang (Format: Zona-Rak-Level e.g. A-01-01)
      const locationsData = [
        {
          id: 'loc-jkt-a0101',
          warehouseId: 'wh-jkt',
          code: 'A-01-01',
          zone: 'A',
          rack: '01',
          level: '01',
          isFrozen: false,
          isActive: true,
        },
        {
          id: 'loc-jkt-a0102',
          warehouseId: 'wh-jkt',
          code: 'A-01-02',
          zone: 'A',
          rack: '01',
          level: '02',
          isFrozen: false,
          isActive: true,
        },
        {
          id: 'loc-jkt-a0103',
          warehouseId: 'wh-jkt',
          code: 'A-01-03',
          zone: 'A',
          rack: '01',
          level: '03',
          isFrozen: false,
          isActive: true,
        },
        {
          id: 'loc-jkt-b0101',
          warehouseId: 'wh-jkt',
          code: 'B-01-01',
          zone: 'B',
          rack: '01',
          level: '01',
          isFrozen: false,
          isActive: true,
        },
        {
          id: 'loc-jkt-b0102',
          warehouseId: 'wh-jkt',
          code: 'B-01-02',
          zone: 'B',
          rack: '01',
          level: '02',
          isFrozen: false,
          isActive: true,
        },
        {
          id: 'loc-bks-a0101',
          warehouseId: 'wh-bks',
          code: 'A-01-01',
          zone: 'A',
          rack: '01',
          level: '01',
          isFrozen: false,
          isActive: true,
        },
        {
          id: 'loc-bks-a0102',
          warehouseId: 'wh-bks',
          code: 'A-01-02',
          zone: 'A',
          rack: '01',
          level: '02',
          isFrozen: false,
          isActive: true,
        },
        {
          id: 'loc-bks-b0101',
          warehouseId: 'wh-bks',
          code: 'B-01-01',
          zone: 'B',
          rack: '01',
          level: '01',
          isFrozen: false,
          isActive: true,
        },
      ];
      await tx.location.createMany({ data: locationsData });

      // 5. Kategori Barang
      const categoriesData = [
        {
          id: 'cat-fnb',
          code: 'FNB',
          name: 'Makanan & Minuman',
          description: 'Produk konsumsi dengan batch dan expired date',
          isActive: true,
        },
        {
          id: 'cat-elc',
          code: 'ELC',
          name: 'Elektronik Kecil',
          description: 'Aksesoris komputer, gadget, dan kabel',
          isActive: true,
        },
        {
          id: 'cat-atk',
          code: 'ATK',
          name: 'Alat Tulis Kantor',
          description: 'Kebutuhan kantor dan kertas',
          isActive: true,
        },
        {
          id: 'cat-hld',
          code: 'HLD',
          name: 'Perlengkapan Rumah',
          description: 'Produk kebersihan rumah tangga',
          isActive: true,
        },
      ];
      await tx.category.createMany({ data: categoriesData });

      // 6. Master Produk
      const productsData = [
        {
          id: 'prd-susu-uht',
          categoryId: 'cat-fnb',
          sku: 'SKU-FNB-001',
          barcode: '8992345678901',
          name: 'Susu UHT Cokelat 1L',
          description: 'Susu steril siap minum rasa cokelat',
          uom: 'KARTON',
          minStock: 20,
          costPrice: new Prisma.Decimal(180000.0),
          trackExpiry: true,
          isActive: true,
        },
        {
          id: 'prd-kopi-inst',
          categoryId: 'cat-fnb',
          sku: 'SKU-FNB-002',
          barcode: '8992345678902',
          name: 'Kopi Arabika Sachet 20g (Pack 30)',
          description: 'Kopi bubuk premium dalam sachet praktis',
          uom: 'PACK',
          minStock: 15,
          costPrice: new Prisma.Decimal(65000.0),
          trackExpiry: true,
          isActive: true,
        },
        {
          id: 'prd-mouse-wrl',
          categoryId: 'cat-elc',
          sku: 'SKU-ELC-001',
          barcode: '8993456789012',
          name: 'Wireless Optical Mouse 2.4GHz',
          description: 'Mouse nirkabel hemat daya dengan klik hening',
          uom: 'PCS',
          minStock: 10,
          costPrice: new Prisma.Decimal(85000.0),
          trackExpiry: false,
          isActive: true,
        },
        {
          id: 'prd-kabel-typec',
          categoryId: 'cat-elc',
          sku: 'SKU-ELC-002',
          barcode: '8993456789029',
          name: 'Kabel Data USB-C to USB-C 100W 1.2m',
          description: 'Kabel nylon braided fast charging PD 100W',
          uom: 'PCS',
          minStock: 25,
          costPrice: new Prisma.Decimal(45000.0),
          trackExpiry: false,
          isActive: true,
        },
        {
          id: 'prd-kertas-a4',
          categoryId: 'cat-atk',
          sku: 'SKU-ATK-001',
          barcode: '8994567890234',
          name: 'Kertas HVS A4 80gsm (Dus 5 Rim)',
          description: 'Kertas fotokopi putih berkualitas tinggi',
          uom: 'DUS',
          minStock: 30,
          costPrice: new Prisma.Decimal(210000.0),
          trackExpiry: false,
          isActive: true,
        },
        {
          id: 'prd-sabun-cair',
          categoryId: 'cat-hld',
          sku: 'SKU-HLD-001',
          barcode: '8995678903456',
          name: 'Sabun Cuci Piring Ekstrak Jeruk Nipis 800ml',
          description: 'Pembersih lemak ampuh dengan wangi segar',
          uom: 'KARTON',
          minStock: 12,
          costPrice: new Prisma.Decimal(115000.0),
          trackExpiry: true,
          isActive: true,
        },
      ];
      await tx.product.createMany({ data: productsData });

      // 7. Batches (Default & Expiry Batches)
      const now = new Date();
      const nearExpiryDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 hari lagi
      const safeExpiryDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 6 bulan lagi
      const longExpiryDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 tahun lagi

      const batchesData = [
        { id: 'btc-susu-def', productId: 'prd-susu-uht', batchNo: 'DEFAULT', expiryDate: null },
        {
          id: 'btc-susu-safe',
          productId: 'prd-susu-uht',
          batchNo: 'BATCH-SMR-2026',
          expiryDate: safeExpiryDate,
        },
        {
          id: 'btc-susu-near',
          productId: 'prd-susu-uht',
          batchNo: 'BATCH-SMR-EXP',
          expiryDate: nearExpiryDate,
        },
        { id: 'btc-kopi-def', productId: 'prd-kopi-inst', batchNo: 'DEFAULT', expiryDate: null },
        {
          id: 'btc-kopi-safe',
          productId: 'prd-kopi-inst',
          batchNo: 'BATCH-KPI-2026',
          expiryDate: longExpiryDate,
        },
        { id: 'btc-mouse-def', productId: 'prd-mouse-wrl', batchNo: 'DEFAULT', expiryDate: null },
        { id: 'btc-kabel-def', productId: 'prd-kabel-typec', batchNo: 'DEFAULT', expiryDate: null },
        { id: 'btc-kertas-def', productId: 'prd-kertas-a4', batchNo: 'DEFAULT', expiryDate: null },
        { id: 'btc-sabun-def', productId: 'prd-sabun-cair', batchNo: 'DEFAULT', expiryDate: null },
        {
          id: 'btc-sabun-safe',
          productId: 'prd-sabun-cair',
          batchNo: 'BATCH-SBN-2026',
          expiryDate: safeExpiryDate,
        },
      ];
      await tx.batch.createMany({ data: batchesData });

      // 8. Suppliers & Customers
      const suppliersData = [
        {
          id: 'sup-indofood',
          code: 'SUP-001',
          name: 'PT Sumber Pangan Sejahtera',
          contactName: 'Hendro Wijaya',
          phone: '021-5551234',
          email: 'sales@sumberpangan.co.id',
          address: 'Jl. Industri Raya No. 45, Jakarta',
          isActive: true,
        },
        {
          id: 'sup-gadget',
          code: 'SUP-002',
          name: 'PT Global Solusi Digital',
          contactName: 'Denny Kurniawan',
          phone: '021-8884321',
          email: 'order@globalsolusi.id',
          address: 'Komp. Ruko Mangga Dua Mall Blok B-12, Jakarta',
          isActive: true,
        },
        {
          id: 'sup-atk',
          code: 'SUP-003',
          name: 'PT Paperindo Nusantara',
          contactName: 'Rian Hidayat',
          phone: '021-7776543',
          email: 'info@paperindo.com',
          address: 'Kawasan Pergudangan Marunda Center Blok C-3, Bekasi',
          isActive: true,
        },
      ];
      await tx.supplier.createMany({ data: suppliersData });

      const customersData = [
        {
          id: 'cst-mart-01',
          code: 'CST-001',
          name: 'Toko Berkah Mart Kelapa Gading',
          contactName: 'Haji Syamsul',
          phone: '0812-9988-7766',
          email: 'berkahmart@gmail.com',
          address: 'Jl. Boulevard Raya Blok TA-2 No. 10, Jakarta Utara',
          isActive: true,
        },
        {
          id: 'cst-tech-01',
          code: 'CST-002',
          name: 'Cybertech Store Bekasi Cyber Park',
          contactName: 'Agus Salim',
          phone: '0813-8877-6655',
          email: 'cybertech.bcp@gmail.com',
          address: 'BCP Lt. 1 No. 45, Jl. KH Noer Ali, Bekasi Selatan',
          isActive: true,
        },
      ];
      await tx.customer.createMany({ data: customersData });

      // 9. Stok Awal Fisik (Stok per Rak)
      const initialStocks = [
        // WH-JKT: Susu UHT (Safe batch 100 karton - 10 shipped = 90, Near Expiry batch 15 karton)
        {
          id: 'stk-susu-safe',
          locationId: 'loc-jkt-a0101',
          productId: 'prd-susu-uht',
          batchId: 'btc-susu-safe',
          quantity: 90,
        },
        {
          id: 'stk-susu-near',
          locationId: 'loc-jkt-a0101',
          productId: 'prd-susu-uht',
          batchId: 'btc-susu-near',
          quantity: 15,
        },
        // WH-JKT: Kopi Arabika
        {
          id: 'stk-kopi-safe',
          locationId: 'loc-jkt-a0102',
          productId: 'prd-kopi-inst',
          batchId: 'btc-kopi-safe',
          quantity: 80,
        },
        // WH-JKT: Wireless Mouse
        {
          id: 'stk-mouse-def',
          locationId: 'loc-jkt-b0101',
          productId: 'prd-mouse-wrl',
          batchId: 'btc-mouse-def',
          quantity: 40,
        },
        // WH-JKT: Kabel Data Type-C
        {
          id: 'stk-kabel-def',
          locationId: 'loc-jkt-b0102',
          productId: 'prd-kabel-typec',
          batchId: 'btc-kabel-def',
          quantity: 50,
        },
        // WH-BKS: Kertas HVS A4
        {
          id: 'stk-kertas-def',
          locationId: 'loc-bks-a0101',
          productId: 'prd-kertas-a4',
          batchId: 'btc-kertas-def',
          quantity: 60,
        },
        // WH-BKS: Sabun Cuci Piring
        {
          id: 'stk-sabun-safe',
          locationId: 'loc-bks-b0101',
          productId: 'prd-sabun-cair',
          batchId: 'btc-sabun-safe',
          quantity: 30,
        },
      ];
      await tx.stock.createMany({ data: initialStocks });

      // 10. Dokumen Mutasi Riwayat (GR & DO Terverifikasi)
      // GR-2026-0001 (Penerimaan Susu UHT)
      const gr1 = await tx.goodsReceipt.create({
        data: {
          id: 'gr-2026-0001',
          receiptNo: 'GR-2026-0001',
          supplierId: 'sup-indofood',
          warehouseId: 'wh-jkt',
          status: GoodsReceiptStatus.RECEIVED,
          receivedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          createdById: 'usr-stf-01',
          notes: 'Penerimaan rutin pasokan Susu UHT batch promo',
          items: {
            create: [
              {
                id: 'gri-001',
                productId: 'prd-susu-uht',
                quantity: 100,
                unitPrice: new Prisma.Decimal(180000.0),
                locationId: 'loc-jkt-a0101',
                batchNo: 'BATCH-SMR-2026',
                expiryDate: safeExpiryDate,
              },
            ],
          },
        },
      });

      // DO-2026-0001 (Pengiriman ke Toko Berkah Mart - 10 karton)
      const do1 = await tx.deliveryOrder.create({
        data: {
          id: 'do-2026-0001',
          orderNo: 'DO-2026-0001',
          customerId: 'cst-mart-01',
          warehouseId: 'wh-jkt',
          status: DeliveryOrderStatus.SHIPPED,
          shippedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          createdById: 'usr-stf-01',
          notes: 'Pengiriman pesanan mingguan Toko Berkah Mart',
          items: {
            create: [
              {
                id: 'doi-001',
                productId: 'prd-susu-uht',
                quantity: 10,
                locationId: 'loc-jkt-a0101',
                batchId: 'btc-susu-safe',
              },
            ],
          },
        },
      });

      // 11. Buku Besar Kartu Stok (Stock Movements dengan Running Balance)
      const movementsData = [
        // Susu UHT Safe Batch: GR +100
        {
          id: 'mov-gr-susu',
          productId: 'prd-susu-uht',
          locationId: 'loc-jkt-a0101',
          batchId: 'btc-susu-safe',
          movementType: MovementType.IN,
          quantity: 100,
          balanceAfter: 100,
          refType: 'GOODS_RECEIPT',
          refId: gr1.id,
          refNo: gr1.receiptNo,
          notes: 'Penerimaan GR-2026-0001',
          userId: 'usr-stf-01',
          createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        },
        // Susu UHT Safe Batch: DO -10 => Balance 90
        {
          id: 'mov-do-susu',
          productId: 'prd-susu-uht',
          locationId: 'loc-jkt-a0101',
          batchId: 'btc-susu-safe',
          movementType: MovementType.OUT,
          quantity: 10,
          balanceAfter: 90,
          refType: 'DELIVERY_ORDER',
          refId: do1.id,
          refNo: do1.orderNo,
          notes: 'Pengiriman DO-2026-0001',
          userId: 'usr-stf-01',
          createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        },
        // Susu UHT Near Expiry Batch: Saldo Awal 15
        {
          id: 'mov-init-susu-near',
          productId: 'prd-susu-uht',
          locationId: 'loc-jkt-a0101',
          batchId: 'btc-susu-near',
          movementType: MovementType.IN,
          quantity: 15,
          balanceAfter: 15,
          refType: 'INITIAL_STOCK',
          refId: 'init',
          refNo: 'INIT-2026',
          notes: 'Saldo awal migrasi sistem',
          userId: 'usr-admin-01',
          createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
        // Kopi Arabika: Saldo Awal 80
        {
          id: 'mov-init-kopi',
          productId: 'prd-kopi-inst',
          locationId: 'loc-jkt-a0102',
          batchId: 'btc-kopi-safe',
          movementType: MovementType.IN,
          quantity: 80,
          balanceAfter: 80,
          refType: 'INITIAL_STOCK',
          refId: 'init',
          refNo: 'INIT-2026',
          notes: 'Saldo awal migrasi sistem',
          userId: 'usr-admin-01',
          createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
        // Wireless Mouse: Saldo Awal 40
        {
          id: 'mov-init-mouse',
          productId: 'prd-mouse-wrl',
          locationId: 'loc-jkt-b0101',
          batchId: 'btc-mouse-def',
          movementType: MovementType.IN,
          quantity: 40,
          balanceAfter: 40,
          refType: 'INITIAL_STOCK',
          refId: 'init',
          refNo: 'INIT-2026',
          notes: 'Saldo awal migrasi sistem',
          userId: 'usr-admin-01',
          createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
        // Kabel Data Type-C: Saldo Awal 50
        {
          id: 'mov-init-kabel',
          productId: 'prd-kabel-typec',
          locationId: 'loc-jkt-b0102',
          batchId: 'btc-kabel-def',
          movementType: MovementType.IN,
          quantity: 50,
          balanceAfter: 50,
          refType: 'INITIAL_STOCK',
          refId: 'init',
          refNo: 'INIT-2026',
          notes: 'Saldo awal migrasi sistem',
          userId: 'usr-admin-01',
          createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
        // Kertas HVS A4: Saldo Awal 60
        {
          id: 'mov-init-kertas',
          productId: 'prd-kertas-a4',
          locationId: 'loc-bks-a0101',
          batchId: 'btc-kertas-def',
          movementType: MovementType.IN,
          quantity: 60,
          balanceAfter: 60,
          refType: 'INITIAL_STOCK',
          refId: 'init',
          refNo: 'INIT-2026',
          notes: 'Saldo awal migrasi sistem',
          userId: 'usr-admin-01',
          createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
        // Sabun Cuci Piring: Saldo Awal 30
        {
          id: 'mov-init-sabun',
          productId: 'prd-sabun-cair',
          locationId: 'loc-bks-b0101',
          batchId: 'btc-sabun-safe',
          movementType: MovementType.IN,
          quantity: 30,
          balanceAfter: 30,
          refType: 'INITIAL_STOCK',
          refId: 'init',
          refNo: 'INIT-2026',
          notes: 'Saldo awal migrasi sistem',
          userId: 'usr-admin-01',
          createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
      ];
      await tx.stockMovement.createMany({ data: movementsData });

      // 12. Document Counters (BR-15)
      const currentYear = new Date().getFullYear();
      const countersData = [
        { name: `GR-${currentYear}`, currentValue: 1 },
        { name: `DO-${currentYear}`, currentValue: 1 },
        { name: `SO-${currentYear}`, currentValue: 0 },
        { name: `ADJ-${currentYear}`, currentValue: 0 },
        { name: `TR-${currentYear}`, currentValue: 0 },
        { name: `RET-${currentYear}`, currentValue: 0 },
      ];
      await tx.documentCounter.createMany({ data: countersData });

      // 13. Audit Log Inisialisasi
      await tx.auditLog.create({
        data: {
          action: 'DEMO_RESET',
          entity: 'SYSTEM',
          entityId: 'global',
          userId: 'usr-admin-01',
          userName: 'Administrator WMS',
          userRole: 'ADMIN',
          description: 'Database demo reset & seeded with clean demo dataset',
          newValues: {
            reason: 'Database demo reset & seeded with clean demo dataset',
            timestamp,
          },
          createdAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Database demo berhasil di-reset dan di-seed dengan data realistis',
        timestamp,
        counts: {
          users: usersData.length,
          warehouses: warehousesData.length,
          locations: locationsData.length,
          categories: categoriesData.length,
          products: productsData.length,
          suppliers: suppliersData.length,
          customers: customersData.length,
          stocks: initialStocks.length,
          movements: movementsData.length,
          goodsReceipts: 1,
          deliveryOrders: 1,
        },
      };
    },
    { timeout: 30000 },
  );
}
