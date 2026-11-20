import { prisma } from '@/server/db';
import {
  Prisma,
  Role,
  MovementType,
  GoodsReceiptStatus,
  DeliveryOrderStatus,
  StockOpnameStatus,
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
    stockOpnames: number;
  };
}

/**
 * Reset dan inisialisasi ulang database WMS dengan dataset FMCG yang kaya.
 * Mendukung demonstrasi seluruh alur: GR → Stock → DO → Opname + FEFO + Expiry Alerts.
 */
export async function resetDemoDatabase(): Promise<DemoResetResult> {
  const timestamp = new Date().toISOString();
  const rawPassword = process.env.SEED_DEMO_PASSWORD || 'Juntak12345!';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  return await prisma.$transaction(
    async (tx) => {
      // Bersihkan semua data dalam urutan FK-safe
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

      // ── 1. USERS (4 role RBAC Korporat NLD Logistics) ───────────────────────
      const usersData = [
        {
          id: 'usr-admin-01',
          name: 'Jhoiwada Simanjuntak',
          email: 'admin@nldlogistics.co.id',
          role: Role.ADMIN,
          passwordHash,
        },
        {
          id: 'usr-mgr-01',
          name: 'Hendrawan Pratama, S.T.',
          email: 'manager@nldlogistics.co.id',
          role: Role.MANAGER,
          passwordHash,
        },
        {
          id: 'usr-stf-01',
          name: 'Dimas Wicaksono',
          email: 'staff@nldlogistics.co.id',
          role: Role.STAFF,
          passwordHash,
        },
        {
          id: 'usr-viw-01',
          name: 'Siti Nurhaliza Wardhani',
          email: 'auditor@nldlogistics.co.id',
          role: Role.VIEWER,
          passwordHash,
        },
        {
          id: 'usr-admin-demo',
          name: 'Jhoiwada Simanjuntak',
          email: 'admin@demo.test',
          role: Role.ADMIN,
          passwordHash,
        },
      ];
      await tx.user.createMany({ data: usersData });

      // ── 2. GUDANG ──────────────────────────────────────────────────────────
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

      // ── 3. LOKASI RAK (20 lokasi: 10 per gudang) ──────────────────────────
      const locationsData = [
        // WH-JKT Zona A (minuman & susu)
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
          id: 'loc-jkt-a0201',
          warehouseId: 'wh-jkt',
          code: 'A-02-01',
          zone: 'A',
          rack: '02',
          level: '01',
          isFrozen: false,
          isActive: true,
        },
        {
          id: 'loc-jkt-a0202',
          warehouseId: 'wh-jkt',
          code: 'A-02-02',
          zone: 'A',
          rack: '02',
          level: '02',
          isFrozen: false,
          isActive: true,
        },
        {
          id: 'loc-jkt-a0301',
          warehouseId: 'wh-jkt',
          code: 'A-03-01',
          zone: 'A',
          rack: '03',
          level: '01',
          isFrozen: false,
          isActive: true,
        },
        {
          id: 'loc-jkt-a0302',
          warehouseId: 'wh-jkt',
          code: 'A-03-02',
          zone: 'A',
          rack: '03',
          level: '02',
          isFrozen: false,
          isActive: true,
        },
        // WH-JKT Zona B (makanan kering & snack)
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
          id: 'loc-jkt-b0201',
          warehouseId: 'wh-jkt',
          code: 'B-02-01',
          zone: 'B',
          rack: '02',
          level: '01',
          isFrozen: false,
          isActive: true,
        },
        {
          id: 'loc-jkt-b0202',
          warehouseId: 'wh-jkt',
          code: 'B-02-02',
          zone: 'B',
          rack: '02',
          level: '02',
          isFrozen: false,
          isActive: true,
        },
        // WH-BKS Zona A (minuman & pokok)
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
          id: 'loc-bks-a0201',
          warehouseId: 'wh-bks',
          code: 'A-02-01',
          zone: 'A',
          rack: '02',
          level: '01',
          isFrozen: false,
          isActive: true,
        },
        {
          id: 'loc-bks-a0202',
          warehouseId: 'wh-bks',
          code: 'A-02-02',
          zone: 'A',
          rack: '02',
          level: '02',
          isFrozen: false,
          isActive: true,
        },
        // WH-BKS Zona B (household)
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
        {
          id: 'loc-bks-b0102',
          warehouseId: 'wh-bks',
          code: 'B-01-02',
          zone: 'B',
          rack: '01',
          level: '02',
          isFrozen: false,
          isActive: true,
        },
        {
          id: 'loc-bks-b0201',
          warehouseId: 'wh-bks',
          code: 'B-02-01',
          zone: 'B',
          rack: '02',
          level: '01',
          isFrozen: false,
          isActive: true,
        },
        {
          id: 'loc-bks-b0202',
          warehouseId: 'wh-bks',
          code: 'B-02-02',
          zone: 'B',
          rack: '02',
          level: '02',
          isFrozen: false,
          isActive: true,
        },
        // WH-BKS Zona C (snack & overflow)
        {
          id: 'loc-bks-c0101',
          warehouseId: 'wh-bks',
          code: 'C-01-01',
          zone: 'C',
          rack: '01',
          level: '01',
          isFrozen: false,
          isActive: true,
        },
        {
          id: 'loc-bks-c0102',
          warehouseId: 'wh-bks',
          code: 'C-01-02',
          zone: 'C',
          rack: '01',
          level: '02',
          isFrozen: false,
          isActive: true,
        },
      ];
      await tx.location.createMany({ data: locationsData });

      // ── 4. KATEGORI FMCG ──────────────────────────────────────────────────
      const categoriesData = [
        {
          id: 'cat-mnm',
          code: 'MNM',
          name: 'Minuman & Beverages',
          description: 'Air minum, minuman kemasan, dan minuman energi',
          isActive: true,
        },
        {
          id: 'cat-mkn',
          code: 'MKN',
          name: 'Makanan Kering & Pokok',
          description: 'Mie instan, minyak goreng, gula, dan beras',
          isActive: true,
        },
        {
          id: 'cat-snk',
          code: 'SNK',
          name: 'Snack & Camilan',
          description: 'Keripik, biskuit, cokelat, dan makanan ringan',
          isActive: true,
        },
        {
          id: 'cat-dsu',
          code: 'DSU',
          name: 'Produk Susu & Olahan',
          description: 'Susu UHT, yogurt, keju, dan produk olahan susu',
          isActive: true,
        },
        {
          id: 'cat-hld',
          code: 'HLD',
          name: 'Produk Rumah Tangga',
          description: 'Detergen, sabun, pembersih, dan sanitasi',
          isActive: true,
        },
      ];
      await tx.category.createMany({ data: categoriesData });

      // ── 5. PRODUK FMCG (15 produk) ────────────────────────────────────────
      const productsData = [
        // Minuman
        {
          id: 'prd-aqua-galon',
          categoryId: 'cat-mnm',
          sku: 'MNM-001',
          barcode: '8992761103108',
          name: 'Aqua Galon 19L',
          description: 'Air mineral dalam galon isi ulang siap pakai',
          uom: 'GALON',
          minStock: 50,
          costPrice: new Prisma.Decimal(18500),
          trackExpiry: false,
          isActive: true,
        },
        {
          id: 'prd-teh-botol',
          categoryId: 'cat-mnm',
          sku: 'MNM-002',
          barcode: '8992345610012',
          name: 'Teh Botol Sosro 450ml (Krat 24)',
          description: 'Teh manis dalam kemasan botol plastik, krat isi 24',
          uom: 'KRAT',
          minStock: 30,
          costPrice: new Prisma.Decimal(85000),
          trackExpiry: true,
          isActive: true,
        },
        {
          id: 'prd-pocari',
          categoryId: 'cat-mnm',
          sku: 'MNM-003',
          barcode: '4902116009225',
          name: 'Pocari Sweat 500ml (Krat 24)',
          description: 'Minuman elektrolit isotonis pemulih ion tubuh',
          uom: 'KRAT',
          minStock: 25,
          costPrice: new Prisma.Decimal(120000),
          trackExpiry: true,
          isActive: true,
        },
        {
          id: 'prd-aqua-600',
          categoryId: 'cat-mnm',
          sku: 'MNM-004',
          barcode: '8992761100022',
          name: 'Aqua 600ml (Krat 24)',
          description: 'Air mineral kemasan botol 600ml, krat isi 24',
          uom: 'KRAT',
          minStock: 80,
          costPrice: new Prisma.Decimal(48000),
          trackExpiry: false,
          isActive: true,
        },
        {
          id: 'prd-kopi-abc',
          categoryId: 'cat-mnm',
          sku: 'MNM-005',
          barcode: '8992761901027',
          name: 'Kopi ABC Susu 20g (Dus 10 Pack)',
          description: 'Kopi susu sachet 3-in-1, dus isi 10 pack (@ 30 sachet)',
          uom: 'DUS',
          minStock: 40,
          costPrice: new Prisma.Decimal(42000),
          trackExpiry: true,
          isActive: true,
        },
        // Makanan Kering
        {
          id: 'prd-indomie',
          categoryId: 'cat-mkn',
          sku: 'MKN-001',
          barcode: '8992388012010',
          name: 'Indomie Goreng Spesial (Dus 40)',
          description: 'Mi instan goreng bumbu spesial, dus isi 40 bungkus',
          uom: 'DUS',
          minStock: 60,
          costPrice: new Prisma.Decimal(85000),
          trackExpiry: true,
          isActive: true,
        },
        {
          id: 'prd-minyak',
          categoryId: 'cat-mkn',
          sku: 'MKN-002',
          barcode: '8992388801050',
          name: 'Minyak Goreng Fortune 2L (Krat 6)',
          description: 'Minyak goreng sawit premium, krat isi 6 jerigen',
          uom: 'KRAT',
          minStock: 35,
          costPrice: new Prisma.Decimal(95000),
          trackExpiry: false,
          isActive: true,
        },
        {
          id: 'prd-gula',
          categoryId: 'cat-mkn',
          sku: 'MKN-003',
          barcode: '8993560290015',
          name: 'Gula Pasir Gulaku 1Kg (Krat 10)',
          description: 'Gula pasir putih premium, krat isi 10 kemasan',
          uom: 'KRAT',
          minStock: 20,
          costPrice: new Prisma.Decimal(148000),
          trackExpiry: false,
          isActive: true,
        },
        // Snack
        {
          id: 'prd-chitato',
          categoryId: 'cat-snk',
          sku: 'SNK-001',
          barcode: '8992388111022',
          name: 'Chitato Sapi Panggang 68g (Dus 20)',
          description: 'Keripik kentang rasa sapi panggang, dus isi 20 bungkus',
          uom: 'DUS',
          minStock: 30,
          costPrice: new Prisma.Decimal(72000),
          trackExpiry: true,
          isActive: true,
        },
        {
          id: 'prd-goodtime',
          categoryId: 'cat-snk',
          sku: 'SNK-002',
          barcode: '8886006100011',
          name: 'Good Time Choc Cookies 216g (Krt 12)',
          description: 'Biskuit cokelat chip premium, karton isi 12',
          uom: 'KARTON',
          minStock: 25,
          costPrice: new Prisma.Decimal(68000),
          trackExpiry: true,
          isActive: true,
        },
        // Susu
        {
          id: 'prd-susu-uht',
          categoryId: 'cat-dsu',
          sku: 'DSU-001',
          barcode: '8992345678901',
          name: 'Susu UHT Full Cream 1L (Krat 12)',
          description: 'Susu steril Ultra High Temperature, krat isi 12',
          uom: 'KRAT',
          minStock: 40,
          costPrice: new Prisma.Decimal(155000),
          trackExpiry: true,
          isActive: true,
        },
        {
          id: 'prd-yakult',
          categoryId: 'cat-dsu',
          sku: 'DSU-002',
          barcode: '4902588000304',
          name: 'Yakult 65ml (Pack 5 Botol)',
          description: 'Minuman susu fermentasi probiotik, pack isi 5 botol',
          uom: 'PACK',
          minStock: 100,
          costPrice: new Prisma.Decimal(12500),
          trackExpiry: true,
          isActive: true,
        },
        // Household
        {
          id: 'prd-rinso',
          categoryId: 'cat-hld',
          sku: 'HLD-001',
          barcode: '8999999004018',
          name: 'Rinso Anti Noda Matic 1.8Kg (Krat 6)',
          description: 'Detergen bubuk mesin cuci formula aktif, krat isi 6',
          uom: 'KRAT',
          minStock: 20,
          costPrice: new Prisma.Decimal(165000),
          trackExpiry: false,
          isActive: true,
        },
        {
          id: 'prd-sunlight',
          categoryId: 'cat-hld',
          sku: 'HLD-002',
          barcode: '8999999110020',
          name: 'Sunlight Colek 300g (Krat 24)',
          description: 'Sabun cuci piring pasta jeruk nipis, krat isi 24',
          uom: 'KRAT',
          minStock: 15,
          costPrice: new Prisma.Decimal(78000),
          trackExpiry: false,
          isActive: true,
        },
        {
          id: 'prd-baygon',
          categoryId: 'cat-hld',
          sku: 'HLD-003',
          barcode: '8992388990016',
          name: 'Baygon Semprot Lavender 600ml (Krt 12)',
          description: 'Obat nyamuk aerosol wangi lavender, karton isi 12',
          uom: 'KARTON',
          minStock: 10,
          costPrice: new Prisma.Decimal(125000),
          trackExpiry: true,
          isActive: true,
        },
      ];
      await tx.product.createMany({ data: productsData });

      // ── 6. SUPPLIER ───────────────────────────────────────────────────────
      const suppliersData = [
        {
          id: 'sup-wings',
          code: 'SUP-001',
          name: 'PT Wings Surya Distribusi',
          contactName: 'Hendra Susanto',
          phone: '021-5551100',
          email: 'distribusi@wings.co.id',
          address: 'Jl. Jend. Ahmad Yani No. 101, Surabaya',
          isActive: true,
        },
        {
          id: 'sup-indofood',
          code: 'SUP-002',
          name: 'PT Indofood CBP Sukses Makmur',
          contactName: 'Rini Wijayanti',
          phone: '021-8884000',
          email: 'trade@indofood.co.id',
          address: 'Sudirman Plaza, Jl. Jend. Sudirman Kav. 76-78, Jakarta',
          isActive: true,
        },
        {
          id: 'sup-danone',
          code: 'SUP-003',
          name: 'PT Danone Aqua Indonesia',
          contactName: 'Bambang Purnomo',
          phone: '021-7773400',
          email: 'distribusi@danone.co.id',
          address: 'Perkantoran Hijau Arkadia Tower F, Jakarta Selatan',
          isActive: true,
        },
        {
          id: 'sup-unilever',
          code: 'SUP-004',
          name: 'PT Unilever Indonesia Tbk',
          contactName: 'Dewi Kartika',
          phone: '021-7272500',
          email: 'trade@unilever.co.id',
          address: 'BSD City, Tangerang Selatan',
          isActive: true,
        },
        {
          id: 'sup-mayora',
          code: 'SUP-005',
          name: 'PT Mayora Indah Tbk',
          contactName: 'Firman Hidayat',
          phone: '021-5557300',
          email: 'sales@mayora.co.id',
          address: 'Jl. Tomang Raya No. 21-23, Jakarta Barat',
          isActive: true,
        },
      ];
      await tx.supplier.createMany({ data: suppliersData });

      // ── 7. CUSTOMER ───────────────────────────────────────────────────────
      const customersData = [
        {
          id: 'cst-indomaret',
          code: 'CST-001',
          name: 'Indomaret KC Kelapa Gading',
          contactName: 'Surya Irawan',
          phone: '0812-1234-5678',
          email: 'kg.001@indomaret.co.id',
          address: 'Jl. Boulevard Raya No. 12, Kelapa Gading, Jakarta Utara',
          isActive: true,
        },
        {
          id: 'cst-alfamart',
          code: 'CST-002',
          name: 'Alfamart Cabang Pulogadung',
          contactName: 'Novi Susanti',
          phone: '0813-2345-6789',
          email: 'pulo001@alfamart.co.id',
          address: 'Jl. Raya Bekasi Km. 21, Pulogadung, Jakarta Timur',
          isActive: true,
        },
        {
          id: 'cst-berkah',
          code: 'CST-003',
          name: 'Toko Berkah Mart Rawamangun',
          contactName: 'Haji Syamsul',
          phone: '0812-9988-7766',
          email: 'berkahmart@gmail.com',
          address: 'Jl. Pemuda No. 55, Rawamangun, Jakarta Timur',
          isActive: true,
        },
        {
          id: 'cst-segar',
          code: 'CST-004',
          name: 'Segar Mart Supermarket Bekasi',
          contactName: 'Linda Puspita',
          phone: '0821-3344-5566',
          email: 'segarmart.bks@gmail.com',
          address: 'Jl. Ahmad Yani No. 100, Bekasi Selatan',
          isActive: true,
        },
        {
          id: 'cst-hero',
          code: 'CST-005',
          name: 'Hero Supermarket Senayan City',
          contactName: 'Agus Prasetyo',
          phone: '021-5793-4567',
          email: 'senayan@hero.co.id',
          address: 'Senayan City LG Floor, Jl. Asia Afrika, Jakarta Pusat',
          isActive: true,
        },
        {
          id: 'cst-galaxy',
          code: 'CST-006',
          name: 'Galaxy Supermarket Bekasi Timur',
          contactName: 'Mira Handayani',
          phone: '0819-7788-9900',
          email: 'galaxy.bkstmr@gmail.com',
          address: 'Jl. Kalimalang No. 8, Bekasi Timur',
          isActive: true,
        },
        {
          id: 'cst-madani',
          code: 'CST-007',
          name: 'Koperasi Madani Pusat Jakarta',
          contactName: 'Fauzi Rahmat',
          phone: '0815-6677-8899',
          email: 'kop.madani@gmail.com',
          address: 'Jl. Kramat Raya No. 44, Senen, Jakarta Pusat',
          isActive: true,
        },
        {
          id: 'cst-cahaya',
          code: 'CST-008',
          name: 'Cahaya Mart Cikarang',
          contactName: 'Dra. Rina Sulistiyani',
          phone: '0817-5566-7788',
          email: 'cahayamart.ckr@gmail.com',
          address: 'Jl. MH Thamrin No. 7, Cikarang Pusat, Bekasi',
          isActive: true,
        },
      ];
      await tx.customer.createMany({ data: customersData });

      // ── 8. BATCH (skenario expiry lengkap) ───────────────────────────────
      const now = new Date();
      const d = (days: number) => new Date(now.getTime() + days * 86400000);

      const batchesData = [
        // Produk tanpa trackExpiry: 1 batch DEFAULT
        {
          id: 'btc-aqua-galon-def',
          productId: 'prd-aqua-galon',
          batchNo: 'DEFAULT',
          expiryDate: null,
        },
        { id: 'btc-aqua-600-def', productId: 'prd-aqua-600', batchNo: 'DEFAULT', expiryDate: null },
        { id: 'btc-minyak-def', productId: 'prd-minyak', batchNo: 'DEFAULT', expiryDate: null },
        { id: 'btc-gula-def', productId: 'prd-gula', batchNo: 'DEFAULT', expiryDate: null },
        { id: 'btc-rinso-def', productId: 'prd-rinso', batchNo: 'DEFAULT', expiryDate: null },
        { id: 'btc-sunlight-def', productId: 'prd-sunlight', batchNo: 'DEFAULT', expiryDate: null },

        // Teh Botol: EXPIRED + CRITICAL + WARNING + SAFE
        {
          id: 'btc-teh-exp',
          productId: 'prd-teh-botol',
          batchNo: 'TBS-EXP-2601',
          expiryDate: d(-7),
        },
        { id: 'btc-teh-crit', productId: 'prd-teh-botol', batchNo: 'TBS-2601A', expiryDate: d(5) },
        { id: 'btc-teh-warn', productId: 'prd-teh-botol', batchNo: 'TBS-2601B', expiryDate: d(20) },
        {
          id: 'btc-teh-safe',
          productId: 'prd-teh-botol',
          batchNo: 'TBS-2602A',
          expiryDate: d(180),
        },

        // Pocari: CRITICAL + SAFE
        {
          id: 'btc-pocari-crit',
          productId: 'prd-pocari',
          batchNo: 'PSW-EXP-2601',
          expiryDate: d(3),
        },
        { id: 'btc-pocari-safe', productId: 'prd-pocari', batchNo: 'PSW-2602A', expiryDate: d(90) },

        // Susu UHT: EXPIRED + WARNING + SAFE
        {
          id: 'btc-susu-exp',
          productId: 'prd-susu-uht',
          batchNo: 'UHT-EXP-2601',
          expiryDate: d(-3),
        },
        { id: 'btc-susu-warn', productId: 'prd-susu-uht', batchNo: 'UHT-2601A', expiryDate: d(15) },
        {
          id: 'btc-susu-safe',
          productId: 'prd-susu-uht',
          batchNo: 'UHT-2602A',
          expiryDate: d(120),
        },

        // Yakult: CRITICAL + SAFE
        {
          id: 'btc-yakult-crit',
          productId: 'prd-yakult',
          batchNo: 'YKT-EXP-2601',
          expiryDate: d(6),
        },
        { id: 'btc-yakult-safe', productId: 'prd-yakult', batchNo: 'YKT-2602A', expiryDate: d(45) },

        // Indomie: WARNING + SAFE
        {
          id: 'btc-indomie-warn',
          productId: 'prd-indomie',
          batchNo: 'IMI-2601A',
          expiryDate: d(25),
        },
        {
          id: 'btc-indomie-safe',
          productId: 'prd-indomie',
          batchNo: 'IMI-2602A',
          expiryDate: d(200),
        },

        // Chitato: WARNING + SAFE
        {
          id: 'btc-chitato-warn',
          productId: 'prd-chitato',
          batchNo: 'CTO-2601A',
          expiryDate: d(28),
        },
        {
          id: 'btc-chitato-safe',
          productId: 'prd-chitato',
          batchNo: 'CTO-2602A',
          expiryDate: d(150),
        },

        // Good Time: SAFE
        {
          id: 'btc-goodtime-safe',
          productId: 'prd-goodtime',
          batchNo: 'GTC-2602A',
          expiryDate: d(180),
        },

        // Baygon: SAFE
        {
          id: 'btc-baygon-safe',
          productId: 'prd-baygon',
          batchNo: 'BGN-2602A',
          expiryDate: d(365),
        },

        // Kopi ABC: WARNING + SAFE
        { id: 'btc-kopi-warn', productId: 'prd-kopi-abc', batchNo: 'KPI-2601A', expiryDate: d(22) },
        {
          id: 'btc-kopi-safe',
          productId: 'prd-kopi-abc',
          batchNo: 'KPI-2602A',
          expiryDate: d(240),
        },
      ];
      await tx.batch.createMany({ data: batchesData });

      // ── 9. STOK FISIK (40 records) ────────────────────────────────────────
      // Beberapa produk sengaja di bawah minStock untuk trigger alert
      const initialStocks = [
        // Aqua Galon (JKT A-01-01): 120 galon
        {
          id: 'stk-aqua-galon-jkt',
          locationId: 'loc-jkt-a0101',
          productId: 'prd-aqua-galon',
          batchId: 'btc-aqua-galon-def',
          quantity: 120,
        },
        // Aqua Galon (BKS A-01-01): 85 galon
        {
          id: 'stk-aqua-galon-bks',
          locationId: 'loc-bks-a0101',
          productId: 'prd-aqua-galon',
          batchId: 'btc-aqua-galon-def',
          quantity: 85,
        },

        // Teh Botol (JKT A-01-02): batch expired=8, critical=12, warning=35, safe=60
        {
          id: 'stk-teh-exp',
          locationId: 'loc-jkt-a0102',
          productId: 'prd-teh-botol',
          batchId: 'btc-teh-exp',
          quantity: 8,
        },
        {
          id: 'stk-teh-crit',
          locationId: 'loc-jkt-a0102',
          productId: 'prd-teh-botol',
          batchId: 'btc-teh-crit',
          quantity: 12,
        },
        {
          id: 'stk-teh-warn',
          locationId: 'loc-jkt-a0201',
          productId: 'prd-teh-botol',
          batchId: 'btc-teh-warn',
          quantity: 35,
        },
        {
          id: 'stk-teh-safe',
          locationId: 'loc-jkt-a0201',
          productId: 'prd-teh-botol',
          batchId: 'btc-teh-safe',
          quantity: 60,
        },

        // Pocari (JKT A-02-02): CRITICAL=10, SAFE=15 — total 25 = tepat di minStock
        {
          id: 'stk-pocari-crit',
          locationId: 'loc-jkt-a0202',
          productId: 'prd-pocari',
          batchId: 'btc-pocari-crit',
          quantity: 10,
        },
        {
          id: 'stk-pocari-safe',
          locationId: 'loc-jkt-a0202',
          productId: 'prd-pocari',
          batchId: 'btc-pocari-safe',
          quantity: 15,
        },

        // Aqua 600ml (BKS A-01-02 + A-02-01): total 110 (di atas min 80)
        {
          id: 'stk-aqua600-bks1',
          locationId: 'loc-bks-a0102',
          productId: 'prd-aqua-600',
          batchId: 'btc-aqua-600-def',
          quantity: 65,
        },
        {
          id: 'stk-aqua600-bks2',
          locationId: 'loc-bks-a0201',
          productId: 'prd-aqua-600',
          batchId: 'btc-aqua-600-def',
          quantity: 45,
        },

        // Kopi ABC (JKT A-03-01): WARNING=18, SAFE=30
        {
          id: 'stk-kopi-warn',
          locationId: 'loc-jkt-a0301',
          productId: 'prd-kopi-abc',
          batchId: 'btc-kopi-warn',
          quantity: 18,
        },
        {
          id: 'stk-kopi-safe',
          locationId: 'loc-jkt-a0301',
          productId: 'prd-kopi-abc',
          batchId: 'btc-kopi-safe',
          quantity: 30,
        },

        // Indomie (JKT B-01-01): WARNING=20, SAFE=55
        {
          id: 'stk-indomie-warn',
          locationId: 'loc-jkt-b0101',
          productId: 'prd-indomie',
          batchId: 'btc-indomie-warn',
          quantity: 20,
        },
        {
          id: 'stk-indomie-safe',
          locationId: 'loc-jkt-b0101',
          productId: 'prd-indomie',
          batchId: 'btc-indomie-safe',
          quantity: 55,
        },

        // Minyak Goreng (JKT B-01-02 + BKS B-01-01): total 70 (di atas min 35)
        {
          id: 'stk-minyak-jkt',
          locationId: 'loc-jkt-b0102',
          productId: 'prd-minyak',
          batchId: 'btc-minyak-def',
          quantity: 42,
        },
        {
          id: 'stk-minyak-bks',
          locationId: 'loc-bks-b0101',
          productId: 'prd-minyak',
          batchId: 'btc-minyak-def',
          quantity: 28,
        },

        // Gula (BKS A-02-02): 35 krat (di atas min 20)
        {
          id: 'stk-gula-bks',
          locationId: 'loc-bks-a0202',
          productId: 'prd-gula',
          batchId: 'btc-gula-def',
          quantity: 35,
        },

        // Chitato (JKT B-02-01): WARN=10, SAFE=10 — total 20, min 30 → LOW STOCK ALERT
        {
          id: 'stk-chitato-warn',
          locationId: 'loc-jkt-b0201',
          productId: 'prd-chitato',
          batchId: 'btc-chitato-warn',
          quantity: 10,
        },
        {
          id: 'stk-chitato-safe',
          locationId: 'loc-jkt-b0201',
          productId: 'prd-chitato',
          batchId: 'btc-chitato-safe',
          quantity: 10,
        },

        // Good Time (BKS C-01-01): 22 (di bawah min 25) → LOW STOCK ALERT
        {
          id: 'stk-goodtime',
          locationId: 'loc-bks-c0101',
          productId: 'prd-goodtime',
          batchId: 'btc-goodtime-safe',
          quantity: 22,
        },

        // Susu UHT (JKT A-03-02): EXPIRED=5, WARNING=18, SAFE=45
        {
          id: 'stk-susu-exp',
          locationId: 'loc-jkt-a0302',
          productId: 'prd-susu-uht',
          batchId: 'btc-susu-exp',
          quantity: 5,
        },
        {
          id: 'stk-susu-warn',
          locationId: 'loc-jkt-a0302',
          productId: 'prd-susu-uht',
          batchId: 'btc-susu-warn',
          quantity: 18,
        },
        {
          id: 'stk-susu-safe',
          locationId: 'loc-jkt-a0302',
          productId: 'prd-susu-uht',
          batchId: 'btc-susu-safe',
          quantity: 45,
        },

        // Yakult (JKT B-02-02): CRITICAL=55, SAFE=20 — total 75, min 100 → LOW STOCK ALERT
        {
          id: 'stk-yakult-crit',
          locationId: 'loc-jkt-b0202',
          productId: 'prd-yakult',
          batchId: 'btc-yakult-crit',
          quantity: 55,
        },
        {
          id: 'stk-yakult-safe',
          locationId: 'loc-jkt-b0202',
          productId: 'prd-yakult',
          batchId: 'btc-yakult-safe',
          quantity: 20,
        },

        // Rinso (BKS B-01-02): 38 krat (di atas min 20)
        {
          id: 'stk-rinso-bks',
          locationId: 'loc-bks-b0102',
          productId: 'prd-rinso',
          batchId: 'btc-rinso-def',
          quantity: 38,
        },

        // Sunlight (BKS B-02-01): 42 krat (di atas min 15)
        {
          id: 'stk-sunlight-bks',
          locationId: 'loc-bks-b0201',
          productId: 'prd-sunlight',
          batchId: 'btc-sunlight-def',
          quantity: 42,
        },

        // Baygon (BKS B-02-02): 24 karton (di atas min 10)
        {
          id: 'stk-baygon-bks',
          locationId: 'loc-bks-b0202',
          productId: 'prd-baygon',
          batchId: 'btc-baygon-safe',
          quantity: 24,
        },

        // Baygon juga di BKS C-01-02
        {
          id: 'stk-baygon-bks2',
          locationId: 'loc-bks-c0102',
          productId: 'prd-baygon',
          batchId: 'btc-baygon-safe',
          quantity: 10,
        },
      ];
      await tx.stock.createMany({ data: initialStocks });

      // ── 10. GOODS RECEIPTS (8 dokumen) ────────────────────────────────────
      const gr1 = await tx.goodsReceipt.create({
        data: {
          id: 'gr-2026-0001',
          receiptNo: 'GR-2026-0001',
          supplierId: 'sup-danone',
          warehouseId: 'wh-jkt',
          status: GoodsReceiptStatus.RECEIVED,
          receivedAt: d(-28),
          createdById: 'usr-stf-01',
          notes: 'Penerimaan rutin Aqua Galon & 600ml Batch Nov',
          items: {
            create: [
              {
                productId: 'prd-aqua-galon',
                quantity: 150,
                unitPrice: new Prisma.Decimal(18500),
                locationId: 'loc-jkt-a0101',
                batchNo: 'DEFAULT',
              },
              {
                productId: 'prd-aqua-600',
                quantity: 100,
                unitPrice: new Prisma.Decimal(48000),
                locationId: 'loc-bks-a0102',
                batchNo: 'DEFAULT',
              },
            ],
          },
        },
      });
      const gr2 = await tx.goodsReceipt.create({
        data: {
          id: 'gr-2026-0002',
          receiptNo: 'GR-2026-0002',
          supplierId: 'sup-wings',
          warehouseId: 'wh-jkt',
          status: GoodsReceiptStatus.RECEIVED,
          receivedAt: d(-21),
          createdById: 'usr-stf-01',
          notes: 'Penerimaan Teh Botol & Yakult batch segar Nov-2026',
          items: {
            create: [
              {
                productId: 'prd-teh-botol',
                quantity: 80,
                unitPrice: new Prisma.Decimal(85000),
                locationId: 'loc-jkt-a0102',
                batchNo: 'TBS-2602A',
                expiryDate: d(180),
              },
              {
                productId: 'prd-yakult',
                quantity: 200,
                unitPrice: new Prisma.Decimal(12500),
                locationId: 'loc-jkt-b0202',
                batchNo: 'YKT-2602A',
                expiryDate: d(45),
              },
            ],
          },
        },
      });
      const gr3 = await tx.goodsReceipt.create({
        data: {
          id: 'gr-2026-0003',
          receiptNo: 'GR-2026-0003',
          supplierId: 'sup-indofood',
          warehouseId: 'wh-jkt',
          status: GoodsReceiptStatus.RECEIVED,
          receivedAt: d(-18),
          createdById: 'usr-stf-01',
          notes: 'Penerimaan Indomie & Minyak batch reguler',
          items: {
            create: [
              {
                productId: 'prd-indomie',
                quantity: 100,
                unitPrice: new Prisma.Decimal(85000),
                locationId: 'loc-jkt-b0101',
                batchNo: 'IMI-2602A',
                expiryDate: d(200),
              },
              {
                productId: 'prd-minyak',
                quantity: 60,
                unitPrice: new Prisma.Decimal(95000),
                locationId: 'loc-jkt-b0102',
                batchNo: 'DEFAULT',
              },
            ],
          },
        },
      });
      const gr4 = await tx.goodsReceipt.create({
        data: {
          id: 'gr-2026-0004',
          receiptNo: 'GR-2026-0004',
          supplierId: 'sup-mayora',
          warehouseId: 'wh-bks',
          status: GoodsReceiptStatus.RECEIVED,
          receivedAt: d(-14),
          createdById: 'usr-stf-01',
          notes: 'Penerimaan Chitato & Good Time batch Nov',
          items: {
            create: [
              {
                productId: 'prd-chitato',
                quantity: 50,
                unitPrice: new Prisma.Decimal(72000),
                locationId: 'loc-jkt-b0201',
                batchNo: 'CTO-2602A',
                expiryDate: d(150),
              },
              {
                productId: 'prd-goodtime',
                quantity: 40,
                unitPrice: new Prisma.Decimal(68000),
                locationId: 'loc-bks-c0101',
                batchNo: 'GTC-2602A',
                expiryDate: d(180),
              },
            ],
          },
        },
      });
      const gr5 = await tx.goodsReceipt.create({
        data: {
          id: 'gr-2026-0005',
          receiptNo: 'GR-2026-0005',
          supplierId: 'sup-unilever',
          warehouseId: 'wh-bks',
          status: GoodsReceiptStatus.RECEIVED,
          receivedAt: d(-10),
          createdById: 'usr-stf-01',
          notes: 'Penerimaan Rinso & Sunlight reguler bulanan',
          items: {
            create: [
              {
                productId: 'prd-rinso',
                quantity: 48,
                unitPrice: new Prisma.Decimal(165000),
                locationId: 'loc-bks-b0102',
                batchNo: 'DEFAULT',
              },
              {
                productId: 'prd-sunlight',
                quantity: 60,
                unitPrice: new Prisma.Decimal(78000),
                locationId: 'loc-bks-b0201',
                batchNo: 'DEFAULT',
              },
            ],
          },
        },
      });
      const gr6 = await tx.goodsReceipt.create({
        data: {
          id: 'gr-2026-0006',
          receiptNo: 'GR-2026-0006',
          supplierId: 'sup-wings',
          warehouseId: 'wh-jkt',
          status: GoodsReceiptStatus.RECEIVED,
          receivedAt: d(-5),
          createdById: 'usr-stf-01',
          notes: 'Penerimaan Susu UHT & Pocari Sweat restok',
          items: {
            create: [
              {
                productId: 'prd-susu-uht',
                quantity: 80,
                unitPrice: new Prisma.Decimal(155000),
                locationId: 'loc-jkt-a0302',
                batchNo: 'UHT-2602A',
                expiryDate: d(120),
              },
              {
                productId: 'prd-pocari',
                quantity: 40,
                unitPrice: new Prisma.Decimal(120000),
                locationId: 'loc-jkt-a0202',
                batchNo: 'PSW-2602A',
                expiryDate: d(90),
              },
            ],
          },
        },
      });
      // 2 GR masih DRAFT
      await tx.goodsReceipt.create({
        data: {
          id: 'gr-2026-0007',
          receiptNo: 'GR-2026-0007',
          supplierId: 'sup-danone',
          warehouseId: 'wh-bks',
          status: GoodsReceiptStatus.DRAFT,
          receivedAt: null,
          createdById: 'usr-stf-01',
          notes: 'PO Aqua 600ml restok Bekasi — menunggu kedatangan truk',
          items: {
            create: [
              {
                productId: 'prd-aqua-600',
                quantity: 120,
                unitPrice: new Prisma.Decimal(48000),
                locationId: 'loc-bks-a0201',
                batchNo: 'DEFAULT',
              },
            ],
          },
        },
      });
      await tx.goodsReceipt.create({
        data: {
          id: 'gr-2026-0008',
          receiptNo: 'GR-2026-0008',
          supplierId: 'sup-indofood',
          warehouseId: 'wh-jkt',
          status: GoodsReceiptStatus.DRAFT,
          receivedAt: null,
          createdById: 'usr-stf-01',
          notes: 'Restok Kopi ABC & Indomie reguler — draft diproses besok',
          items: {
            create: [
              {
                productId: 'prd-kopi-abc',
                quantity: 80,
                unitPrice: new Prisma.Decimal(42000),
                locationId: 'loc-jkt-a0301',
                batchNo: 'KPI-2602A',
                expiryDate: d(240),
              },
              {
                productId: 'prd-indomie',
                quantity: 60,
                unitPrice: new Prisma.Decimal(85000),
                locationId: 'loc-jkt-b0101',
                batchNo: 'IMI-2602A',
                expiryDate: d(200),
              },
            ],
          },
        },
      });

      // ── 11. DELIVERY ORDERS (10 dokumen) ─────────────────────────────────
      const do1 = await tx.deliveryOrder.create({
        data: {
          id: 'do-2026-0001',
          orderNo: 'DO-2026-0001',
          customerId: 'cst-indomaret',
          warehouseId: 'wh-jkt',
          status: DeliveryOrderStatus.SHIPPED,
          shippedAt: d(-25),
          createdById: 'usr-stf-01',
          notes: 'Pengiriman mingguan Indomaret Kelapa Gading',
          items: {
            create: [
              {
                productId: 'prd-aqua-galon',
                locationId: 'loc-jkt-a0101',
                batchId: 'btc-aqua-galon-def',
                quantity: 30,
              },
              {
                productId: 'prd-teh-botol',
                locationId: 'loc-jkt-a0102',
                batchId: 'btc-teh-safe',
                quantity: 20,
              },
            ],
          },
        },
      });
      const do2 = await tx.deliveryOrder.create({
        data: {
          id: 'do-2026-0002',
          orderNo: 'DO-2026-0002',
          customerId: 'cst-alfamart',
          warehouseId: 'wh-jkt',
          status: DeliveryOrderStatus.SHIPPED,
          shippedAt: d(-22),
          createdById: 'usr-stf-01',
          notes: 'Pengiriman reguler Alfamart Pulogadung',
          items: {
            create: [
              {
                productId: 'prd-indomie',
                locationId: 'loc-jkt-b0101',
                batchId: 'btc-indomie-safe',
                quantity: 25,
              },
              {
                productId: 'prd-minyak',
                locationId: 'loc-jkt-b0102',
                batchId: 'btc-minyak-def',
                quantity: 18,
              },
            ],
          },
        },
      });
      const do3 = await tx.deliveryOrder.create({
        data: {
          id: 'do-2026-0003',
          orderNo: 'DO-2026-0003',
          customerId: 'cst-berkah',
          warehouseId: 'wh-jkt',
          status: DeliveryOrderStatus.SHIPPED,
          shippedAt: d(-18),
          createdById: 'usr-stf-01',
          notes: 'Pengiriman ke Berkah Mart Rawamangun',
          items: {
            create: [
              {
                productId: 'prd-yakult',
                locationId: 'loc-jkt-b0202',
                batchId: 'btc-yakult-safe',
                quantity: 80,
              },
              {
                productId: 'prd-susu-uht',
                locationId: 'loc-jkt-a0302',
                batchId: 'btc-susu-safe',
                quantity: 15,
              },
            ],
          },
        },
      });
      const do4 = await tx.deliveryOrder.create({
        data: {
          id: 'do-2026-0004',
          orderNo: 'DO-2026-0004',
          customerId: 'cst-segar',
          warehouseId: 'wh-bks',
          status: DeliveryOrderStatus.SHIPPED,
          shippedAt: d(-15),
          createdById: 'usr-stf-01',
          notes: 'Pengiriman ke Segar Mart Bekasi',
          items: {
            create: [
              {
                productId: 'prd-aqua-600',
                locationId: 'loc-bks-a0102',
                batchId: 'btc-aqua-600-def',
                quantity: 40,
              },
              {
                productId: 'prd-rinso',
                locationId: 'loc-bks-b0102',
                batchId: 'btc-rinso-def',
                quantity: 10,
              },
            ],
          },
        },
      });
      const do5 = await tx.deliveryOrder.create({
        data: {
          id: 'do-2026-0005',
          orderNo: 'DO-2026-0005',
          customerId: 'cst-hero',
          warehouseId: 'wh-jkt',
          status: DeliveryOrderStatus.SHIPPED,
          shippedAt: d(-12),
          createdById: 'usr-stf-01',
          notes: 'Pengiriman premium Hero Senayan City',
          items: {
            create: [
              {
                productId: 'prd-pocari',
                locationId: 'loc-jkt-a0202',
                batchId: 'btc-pocari-safe',
                quantity: 15,
              },
              {
                productId: 'prd-goodtime',
                locationId: 'loc-bks-c0101',
                batchId: 'btc-goodtime-safe',
                quantity: 18,
              },
              {
                productId: 'prd-chitato',
                locationId: 'loc-jkt-b0201',
                batchId: 'btc-chitato-safe',
                quantity: 20,
              },
            ],
          },
        },
      });
      const do6 = await tx.deliveryOrder.create({
        data: {
          id: 'do-2026-0006',
          orderNo: 'DO-2026-0006',
          customerId: 'cst-galaxy',
          warehouseId: 'wh-bks',
          status: DeliveryOrderStatus.SHIPPED,
          shippedAt: d(-8),
          createdById: 'usr-stf-01',
          notes: 'Pengiriman Galaxy Supermarket Bekasi Timur',
          items: {
            create: [
              {
                productId: 'prd-sunlight',
                locationId: 'loc-bks-b0201',
                batchId: 'btc-sunlight-def',
                quantity: 18,
              },
              {
                productId: 'prd-baygon',
                locationId: 'loc-bks-b0202',
                batchId: 'btc-baygon-safe',
                quantity: 6,
              },
            ],
          },
        },
      });
      const do7 = await tx.deliveryOrder.create({
        data: {
          id: 'do-2026-0007',
          orderNo: 'DO-2026-0007',
          customerId: 'cst-madani',
          warehouseId: 'wh-jkt',
          status: DeliveryOrderStatus.SHIPPED,
          shippedAt: d(-3),
          createdById: 'usr-stf-01',
          notes: 'Pengiriman Koperasi Madani rutin bulanan',
          items: {
            create: [
              {
                productId: 'prd-kopi-abc',
                locationId: 'loc-jkt-a0301',
                batchId: 'btc-kopi-safe',
                quantity: 20,
              },
              {
                productId: 'prd-gula',
                locationId: 'loc-bks-a0202',
                batchId: 'btc-gula-def',
                quantity: 10,
              },
              {
                productId: 'prd-indomie',
                locationId: 'loc-jkt-b0101',
                batchId: 'btc-indomie-safe',
                quantity: 20,
              },
            ],
          },
        },
      });
      // 3 DO masih DRAFT
      await tx.deliveryOrder.create({
        data: {
          id: 'do-2026-0008',
          orderNo: 'DO-2026-0008',
          customerId: 'cst-cahaya',
          warehouseId: 'wh-bks',
          status: DeliveryOrderStatus.DRAFT,
          createdById: 'usr-stf-01',
          notes: 'Draft pengiriman Cahaya Mart Cikarang — menunggu konfirmasi',
          items: {
            create: [
              {
                productId: 'prd-aqua-600',
                locationId: 'loc-bks-a0102',
                batchId: 'btc-aqua-600-def',
                quantity: 25,
              },
              {
                productId: 'prd-rinso',
                locationId: 'loc-bks-b0102',
                batchId: 'btc-rinso-def',
                quantity: 8,
              },
            ],
          },
        },
      });
      await tx.deliveryOrder.create({
        data: {
          id: 'do-2026-0009',
          orderNo: 'DO-2026-0009',
          customerId: 'cst-indomaret',
          warehouseId: 'wh-jkt',
          status: DeliveryOrderStatus.DRAFT,
          createdById: 'usr-stf-01',
          notes: 'Draft restok Indomaret Kelapa Gading minggu depan',
          items: {
            create: [
              {
                productId: 'prd-teh-botol',
                locationId: 'loc-jkt-a0201',
                batchId: 'btc-teh-safe',
                quantity: 15,
              },
              {
                productId: 'prd-pocari',
                locationId: 'loc-jkt-a0202',
                batchId: 'btc-pocari-safe',
                quantity: 10,
              },
            ],
          },
        },
      });
      await tx.deliveryOrder.create({
        data: {
          id: 'do-2026-0010',
          orderNo: 'DO-2026-0010',
          customerId: 'cst-berkah',
          warehouseId: 'wh-jkt',
          status: DeliveryOrderStatus.DRAFT,
          createdById: 'usr-stf-01',
          notes: 'Draft prioritas FEFO — batch Yakult mendekati expired',
          items: {
            create: [
              {
                productId: 'prd-yakult',
                locationId: 'loc-jkt-b0202',
                batchId: 'btc-yakult-crit',
                quantity: 40,
              },
            ],
          },
        },
      });

      // ── 12. STOCK OPNAME ──────────────────────────────────────────────────
      await tx.stockOpname.create({
        data: {
          id: 'so-2026-0001',
          opnameNo: 'SO-2026-0001',
          warehouseId: 'wh-jkt',
          status: StockOpnameStatus.APPROVED,
          createdById: 'usr-stf-01',
          approvedById: 'usr-mgr-01',
          submittedAt: d(-15),
          approvedAt: d(-14),
          notes: JSON.stringify({
            text: 'Opname bulanan zona A gudang Jakarta',
            locationIds: ['loc-jkt-a0101', 'loc-jkt-a0102', 'loc-jkt-a0201'],
          }),
          items: {
            create: [
              {
                productId: 'prd-aqua-galon',
                locationId: 'loc-jkt-a0101',
                batchId: 'btc-aqua-galon-def',
                systemQty: 125,
                physicalQty: 125,
                difference: 0,
              },
              {
                productId: 'prd-teh-botol',
                locationId: 'loc-jkt-a0102',
                batchId: 'btc-teh-safe',
                systemQty: 65,
                physicalQty: 63,
                difference: -2,
                notes: 'Ditemukan 2 krat rusak kemasan',
              },
              {
                productId: 'prd-teh-botol',
                locationId: 'loc-jkt-a0201',
                batchId: 'btc-teh-warn',
                systemQty: 38,
                physicalQty: 38,
                difference: 0,
              },
            ],
          },
        },
      });
      await tx.stockOpname.create({
        data: {
          id: 'so-2026-0002',
          opnameNo: 'SO-2026-0002',
          warehouseId: 'wh-bks',
          status: StockOpnameStatus.DRAFT,
          createdById: 'usr-stf-01',
          approvedById: null,
          submittedAt: null,
          approvedAt: null,
          notes: JSON.stringify({
            text: 'Opname zona B Bekasi — perlu hitungan ulang sebelum submit',
            locationIds: ['loc-bks-b0101', 'loc-bks-b0102', 'loc-bks-b0201'],
          }),
          items: {
            create: [
              {
                productId: 'prd-minyak',
                locationId: 'loc-bks-b0101',
                batchId: 'btc-minyak-def',
                systemQty: 28,
                physicalQty: null,
                difference: null,
              },
              {
                productId: 'prd-rinso',
                locationId: 'loc-bks-b0102',
                batchId: 'btc-rinso-def',
                systemQty: 38,
                physicalQty: null,
                difference: null,
              },
              {
                productId: 'prd-sunlight',
                locationId: 'loc-bks-b0201',
                batchId: 'btc-sunlight-def',
                systemQty: 42,
                physicalQty: null,
                difference: null,
              },
            ],
          },
        },
      });

      // ── 13. STOCK MOVEMENTS (60+ transaksi 30 hari) ───────────────────────
      const mvData: Prisma.StockMovementCreateManyInput[] = [];

      // Fungsi helper untuk buat movement
      const mv = (
        id: string,
        productId: string,
        locationId: string,
        batchId: string,
        movementType: MovementType,
        quantity: number,
        balanceAfter: number,
        refType: string,
        refId: string,
        refNo: string,
        userId: string,
        notes: string,
        createdAt: Date,
      ) => ({
        id,
        productId,
        locationId,
        batchId,
        movementType,
        quantity,
        balanceAfter,
        refType,
        refId,
        refNo,
        userId,
        notes,
        createdAt,
      });

      // === GR IN movements (dari GR yang RECEIVED) ===
      mvData.push(
        mv(
          'mov-gr1-aqua-galon',
          'prd-aqua-galon',
          'loc-jkt-a0101',
          'btc-aqua-galon-def',
          MovementType.IN,
          150,
          150,
          'GOODS_RECEIPT',
          gr1.id,
          gr1.receiptNo,
          'usr-stf-01',
          'Penerimaan GR-2026-0001',
          d(-28),
        ),
      );
      mvData.push(
        mv(
          'mov-gr1-aqua600',
          'prd-aqua-600',
          'loc-bks-a0102',
          'btc-aqua-600-def',
          MovementType.IN,
          100,
          100,
          'GOODS_RECEIPT',
          gr1.id,
          gr1.receiptNo,
          'usr-stf-01',
          'Penerimaan GR-2026-0001',
          d(-28),
        ),
      );
      mvData.push(
        mv(
          'mov-gr2-teh',
          'prd-teh-botol',
          'loc-jkt-a0102',
          'btc-teh-safe',
          MovementType.IN,
          80,
          80,
          'GOODS_RECEIPT',
          gr2.id,
          gr2.receiptNo,
          'usr-stf-01',
          'Penerimaan GR-2026-0002',
          d(-21),
        ),
      );
      mvData.push(
        mv(
          'mov-gr2-yakult',
          'prd-yakult',
          'loc-jkt-b0202',
          'btc-yakult-safe',
          MovementType.IN,
          200,
          200,
          'GOODS_RECEIPT',
          gr2.id,
          gr2.receiptNo,
          'usr-stf-01',
          'Penerimaan GR-2026-0002',
          d(-21),
        ),
      );
      mvData.push(
        mv(
          'mov-gr3-indomie',
          'prd-indomie',
          'loc-jkt-b0101',
          'btc-indomie-safe',
          MovementType.IN,
          100,
          100,
          'GOODS_RECEIPT',
          gr3.id,
          gr3.receiptNo,
          'usr-stf-01',
          'Penerimaan GR-2026-0003',
          d(-18),
        ),
      );
      mvData.push(
        mv(
          'mov-gr3-minyak',
          'prd-minyak',
          'loc-jkt-b0102',
          'btc-minyak-def',
          MovementType.IN,
          60,
          60,
          'GOODS_RECEIPT',
          gr3.id,
          gr3.receiptNo,
          'usr-stf-01',
          'Penerimaan GR-2026-0003',
          d(-18),
        ),
      );
      mvData.push(
        mv(
          'mov-gr4-chitato',
          'prd-chitato',
          'loc-jkt-b0201',
          'btc-chitato-safe',
          MovementType.IN,
          50,
          50,
          'GOODS_RECEIPT',
          gr4.id,
          gr4.receiptNo,
          'usr-stf-01',
          'Penerimaan GR-2026-0004',
          d(-14),
        ),
      );
      mvData.push(
        mv(
          'mov-gr4-goodtime',
          'prd-goodtime',
          'loc-bks-c0101',
          'btc-goodtime-safe',
          MovementType.IN,
          40,
          40,
          'GOODS_RECEIPT',
          gr4.id,
          gr4.receiptNo,
          'usr-stf-01',
          'Penerimaan GR-2026-0004',
          d(-14),
        ),
      );
      mvData.push(
        mv(
          'mov-gr5-rinso',
          'prd-rinso',
          'loc-bks-b0102',
          'btc-rinso-def',
          MovementType.IN,
          48,
          48,
          'GOODS_RECEIPT',
          gr5.id,
          gr5.receiptNo,
          'usr-stf-01',
          'Penerimaan GR-2026-0005',
          d(-10),
        ),
      );
      mvData.push(
        mv(
          'mov-gr5-sunlight',
          'prd-sunlight',
          'loc-bks-b0201',
          'btc-sunlight-def',
          MovementType.IN,
          60,
          60,
          'GOODS_RECEIPT',
          gr5.id,
          gr5.receiptNo,
          'usr-stf-01',
          'Penerimaan GR-2026-0005',
          d(-10),
        ),
      );
      mvData.push(
        mv(
          'mov-gr6-susu',
          'prd-susu-uht',
          'loc-jkt-a0302',
          'btc-susu-safe',
          MovementType.IN,
          80,
          80,
          'GOODS_RECEIPT',
          gr6.id,
          gr6.receiptNo,
          'usr-stf-01',
          'Penerimaan GR-2026-0006',
          d(-5),
        ),
      );
      mvData.push(
        mv(
          'mov-gr6-pocari',
          'prd-pocari',
          'loc-jkt-a0202',
          'btc-pocari-safe',
          MovementType.IN,
          40,
          40,
          'GOODS_RECEIPT',
          gr6.id,
          gr6.receiptNo,
          'usr-stf-01',
          'Penerimaan GR-2026-0006',
          d(-5),
        ),
      );

      // === DO OUT movements (dari DO yang SHIPPED) ===
      mvData.push(
        mv(
          'mov-do1-aqua',
          'prd-aqua-galon',
          'loc-jkt-a0101',
          'btc-aqua-galon-def',
          MovementType.OUT,
          30,
          120,
          'DELIVERY_ORDER',
          do1.id,
          do1.orderNo,
          'usr-stf-01',
          'Pengiriman DO-2026-0001',
          d(-25),
        ),
      );
      mvData.push(
        mv(
          'mov-do1-teh',
          'prd-teh-botol',
          'loc-jkt-a0102',
          'btc-teh-safe',
          MovementType.OUT,
          20,
          60,
          'DELIVERY_ORDER',
          do1.id,
          do1.orderNo,
          'usr-stf-01',
          'Pengiriman DO-2026-0001',
          d(-25),
        ),
      );
      mvData.push(
        mv(
          'mov-do2-indomie',
          'prd-indomie',
          'loc-jkt-b0101',
          'btc-indomie-safe',
          MovementType.OUT,
          25,
          75,
          'DELIVERY_ORDER',
          do2.id,
          do2.orderNo,
          'usr-stf-01',
          'Pengiriman DO-2026-0002',
          d(-22),
        ),
      );
      mvData.push(
        mv(
          'mov-do2-minyak',
          'prd-minyak',
          'loc-jkt-b0102',
          'btc-minyak-def',
          MovementType.OUT,
          18,
          42,
          'DELIVERY_ORDER',
          do2.id,
          do2.orderNo,
          'usr-stf-01',
          'Pengiriman DO-2026-0002',
          d(-22),
        ),
      );
      mvData.push(
        mv(
          'mov-do3-yakult',
          'prd-yakult',
          'loc-jkt-b0202',
          'btc-yakult-safe',
          MovementType.OUT,
          80,
          120,
          'DELIVERY_ORDER',
          do3.id,
          do3.orderNo,
          'usr-stf-01',
          'Pengiriman DO-2026-0003',
          d(-18),
        ),
      );
      mvData.push(
        mv(
          'mov-do3-susu',
          'prd-susu-uht',
          'loc-jkt-a0302',
          'btc-susu-safe',
          MovementType.OUT,
          15,
          65,
          'DELIVERY_ORDER',
          do3.id,
          do3.orderNo,
          'usr-stf-01',
          'Pengiriman DO-2026-0003',
          d(-18),
        ),
      );
      mvData.push(
        mv(
          'mov-do4-aqua600',
          'prd-aqua-600',
          'loc-bks-a0102',
          'btc-aqua-600-def',
          MovementType.OUT,
          40,
          60,
          'DELIVERY_ORDER',
          do4.id,
          do4.orderNo,
          'usr-stf-01',
          'Pengiriman DO-2026-0004',
          d(-15),
        ),
      );
      mvData.push(
        mv(
          'mov-do4-rinso',
          'prd-rinso',
          'loc-bks-b0102',
          'btc-rinso-def',
          MovementType.OUT,
          10,
          38,
          'DELIVERY_ORDER',
          do4.id,
          do4.orderNo,
          'usr-stf-01',
          'Pengiriman DO-2026-0004',
          d(-15),
        ),
      );
      mvData.push(
        mv(
          'mov-do5-pocari',
          'prd-pocari',
          'loc-jkt-a0202',
          'btc-pocari-safe',
          MovementType.OUT,
          15,
          25,
          'DELIVERY_ORDER',
          do5.id,
          do5.orderNo,
          'usr-stf-01',
          'Pengiriman DO-2026-0005',
          d(-12),
        ),
      );
      mvData.push(
        mv(
          'mov-do5-goodtime',
          'prd-goodtime',
          'loc-bks-c0101',
          'btc-goodtime-safe',
          MovementType.OUT,
          18,
          22,
          'DELIVERY_ORDER',
          do5.id,
          do5.orderNo,
          'usr-stf-01',
          'Pengiriman DO-2026-0005',
          d(-12),
        ),
      );
      mvData.push(
        mv(
          'mov-do5-chitato',
          'prd-chitato',
          'loc-jkt-b0201',
          'btc-chitato-safe',
          MovementType.OUT,
          20,
          30,
          'DELIVERY_ORDER',
          do5.id,
          do5.orderNo,
          'usr-stf-01',
          'Pengiriman DO-2026-0005',
          d(-12),
        ),
      );
      mvData.push(
        mv(
          'mov-do6-sunlight',
          'prd-sunlight',
          'loc-bks-b0201',
          'btc-sunlight-def',
          MovementType.OUT,
          18,
          42,
          'DELIVERY_ORDER',
          do6.id,
          do6.orderNo,
          'usr-stf-01',
          'Pengiriman DO-2026-0006',
          d(-8),
        ),
      );
      mvData.push(
        mv(
          'mov-do6-baygon',
          'prd-baygon',
          'loc-bks-b0202',
          'btc-baygon-safe',
          MovementType.OUT,
          6,
          24,
          'DELIVERY_ORDER',
          do6.id,
          do6.orderNo,
          'usr-stf-01',
          'Pengiriman DO-2026-0006',
          d(-8),
        ),
      );
      mvData.push(
        mv(
          'mov-do7-kopi',
          'prd-kopi-abc',
          'loc-jkt-a0301',
          'btc-kopi-safe',
          MovementType.OUT,
          20,
          30,
          'DELIVERY_ORDER',
          do7.id,
          do7.orderNo,
          'usr-stf-01',
          'Pengiriman DO-2026-0007',
          d(-3),
        ),
      );
      mvData.push(
        mv(
          'mov-do7-gula',
          'prd-gula',
          'loc-bks-a0202',
          'btc-gula-def',
          MovementType.OUT,
          10,
          35,
          'DELIVERY_ORDER',
          do7.id,
          do7.orderNo,
          'usr-stf-01',
          'Pengiriman DO-2026-0007',
          d(-3),
        ),
      );
      mvData.push(
        mv(
          'mov-do7-indomie',
          'prd-indomie',
          'loc-jkt-b0101',
          'btc-indomie-safe',
          MovementType.OUT,
          20,
          55,
          'DELIVERY_ORDER',
          do7.id,
          do7.orderNo,
          'usr-stf-01',
          'Pengiriman DO-2026-0007',
          d(-3),
        ),
      );

      // === SALDO AWAL (INITIAL_STOCK) untuk batch yang tidak masuk via GR ===
      mvData.push(
        mv(
          'mov-init-teh-exp',
          'prd-teh-botol',
          'loc-jkt-a0102',
          'btc-teh-exp',
          MovementType.IN,
          8,
          8,
          'INITIAL_STOCK',
          'init',
          'INIT-2026',
          'usr-admin-01',
          'Saldo awal batch expired',
          d(-30),
        ),
      );
      mvData.push(
        mv(
          'mov-init-teh-crit',
          'prd-teh-botol',
          'loc-jkt-a0102',
          'btc-teh-crit',
          MovementType.IN,
          12,
          12,
          'INITIAL_STOCK',
          'init',
          'INIT-2026',
          'usr-admin-01',
          'Saldo awal batch kritis',
          d(-30),
        ),
      );
      mvData.push(
        mv(
          'mov-init-teh-warn',
          'prd-teh-botol',
          'loc-jkt-a0201',
          'btc-teh-warn',
          MovementType.IN,
          35,
          35,
          'INITIAL_STOCK',
          'init',
          'INIT-2026',
          'usr-admin-01',
          'Saldo awal batch warning',
          d(-30),
        ),
      );
      mvData.push(
        mv(
          'mov-init-pocari-crit',
          'prd-pocari',
          'loc-jkt-a0202',
          'btc-pocari-crit',
          MovementType.IN,
          10,
          10,
          'INITIAL_STOCK',
          'init',
          'INIT-2026',
          'usr-admin-01',
          'Saldo awal pocari kritis',
          d(-30),
        ),
      );
      mvData.push(
        mv(
          'mov-init-susu-exp',
          'prd-susu-uht',
          'loc-jkt-a0302',
          'btc-susu-exp',
          MovementType.IN,
          5,
          5,
          'INITIAL_STOCK',
          'init',
          'INIT-2026',
          'usr-admin-01',
          'Saldo awal susu expired',
          d(-30),
        ),
      );
      mvData.push(
        mv(
          'mov-init-susu-warn',
          'prd-susu-uht',
          'loc-jkt-a0302',
          'btc-susu-warn',
          MovementType.IN,
          18,
          18,
          'INITIAL_STOCK',
          'init',
          'INIT-2026',
          'usr-admin-01',
          'Saldo awal susu warning',
          d(-30),
        ),
      );
      mvData.push(
        mv(
          'mov-init-yakult-crit',
          'prd-yakult',
          'loc-jkt-b0202',
          'btc-yakult-crit',
          MovementType.IN,
          55,
          55,
          'INITIAL_STOCK',
          'init',
          'INIT-2026',
          'usr-admin-01',
          'Saldo awal yakult kritis',
          d(-30),
        ),
      );
      mvData.push(
        mv(
          'mov-init-indomie-warn',
          'prd-indomie',
          'loc-jkt-b0101',
          'btc-indomie-warn',
          MovementType.IN,
          20,
          20,
          'INITIAL_STOCK',
          'init',
          'INIT-2026',
          'usr-admin-01',
          'Saldo awal indomie warning',
          d(-30),
        ),
      );
      mvData.push(
        mv(
          'mov-init-chitato-warn',
          'prd-chitato',
          'loc-jkt-b0201',
          'btc-chitato-warn',
          MovementType.IN,
          10,
          10,
          'INITIAL_STOCK',
          'init',
          'INIT-2026',
          'usr-admin-01',
          'Saldo awal chitato warning',
          d(-30),
        ),
      );
      mvData.push(
        mv(
          'mov-init-kopi-warn',
          'prd-kopi-abc',
          'loc-jkt-a0301',
          'btc-kopi-warn',
          MovementType.IN,
          18,
          18,
          'INITIAL_STOCK',
          'init',
          'INIT-2026',
          'usr-admin-01',
          'Saldo awal kopi warning',
          d(-30),
        ),
      );
      mvData.push(
        mv(
          'mov-init-aqua-galon-bks',
          'prd-aqua-galon',
          'loc-bks-a0101',
          'btc-aqua-galon-def',
          MovementType.IN,
          85,
          85,
          'INITIAL_STOCK',
          'init',
          'INIT-2026',
          'usr-admin-01',
          'Saldo awal Aqua Galon BKS',
          d(-30),
        ),
      );
      mvData.push(
        mv(
          'mov-init-aqua600-bks2',
          'prd-aqua-600',
          'loc-bks-a0201',
          'btc-aqua-600-def',
          MovementType.IN,
          45,
          45,
          'INITIAL_STOCK',
          'init',
          'INIT-2026',
          'usr-admin-01',
          'Saldo awal Aqua 600ml BKS',
          d(-30),
        ),
      );
      mvData.push(
        mv(
          'mov-init-gula',
          'prd-gula',
          'loc-bks-a0202',
          'btc-gula-def',
          MovementType.IN,
          45,
          45,
          'INITIAL_STOCK',
          'init',
          'INIT-2026',
          'usr-admin-01',
          'Saldo awal gula',
          d(-30),
        ),
      );
      mvData.push(
        mv(
          'mov-init-minyak-bks',
          'prd-minyak',
          'loc-bks-b0101',
          'btc-minyak-def',
          MovementType.IN,
          28,
          28,
          'INITIAL_STOCK',
          'init',
          'INIT-2026',
          'usr-admin-01',
          'Saldo awal minyak BKS',
          d(-30),
        ),
      );
      mvData.push(
        mv(
          'mov-init-baygon-bks2',
          'prd-baygon',
          'loc-bks-c0102',
          'btc-baygon-safe',
          MovementType.IN,
          10,
          10,
          'INITIAL_STOCK',
          'init',
          'INIT-2026',
          'usr-admin-01',
          'Saldo awal baygon overflow',
          d(-30),
        ),
      );

      // === PENYESUAIAN (ADJ) untuk variasi chart ===
      mvData.push(
        mv(
          'mov-adj-01',
          'prd-teh-botol',
          'loc-jkt-a0102',
          'btc-teh-safe',
          MovementType.ADJUST_OUT,
          2,
          58,
          'STOCK_ADJUSTMENT',
          'adj-001',
          'ADJ-2026-0001',
          'usr-mgr-01',
          'Penyesuaian: 2 krat rusak kemasan (opname SO-2026-0001)',
          d(-14),
        ),
      );
      mvData.push(
        mv(
          'mov-adj-02',
          'prd-yakult',
          'loc-jkt-b0202',
          'btc-yakult-safe',
          MovementType.ADJUST_IN,
          5,
          125,
          'STOCK_ADJUSTMENT',
          'adj-002',
          'ADJ-2026-0002',
          'usr-mgr-01',
          'Penyesuaian: temuan fisik lebih 5 pack dari sistem',
          d(-13),
        ),
      );

      // === Tambahan movements untuk memperkaya chart 30 hari ===
      mvData.push(
        mv(
          'mov-extra-01',
          'prd-aqua-galon',
          'loc-jkt-a0101',
          'btc-aqua-galon-def',
          MovementType.OUT,
          10,
          110,
          'DELIVERY_ORDER',
          do1.id,
          'DO-2026-0001',
          'usr-stf-01',
          'Pengiriman tambahan Indomaret',
          d(-24),
        ),
      );
      mvData.push(
        mv(
          'mov-extra-02',
          'prd-indomie',
          'loc-jkt-b0101',
          'btc-indomie-safe',
          MovementType.OUT,
          10,
          65,
          'DELIVERY_ORDER',
          do2.id,
          'DO-2026-0002',
          'usr-stf-01',
          'Tambahan Alfamart',
          d(-20),
        ),
      );
      mvData.push(
        mv(
          'mov-extra-03',
          'prd-sunlight',
          'loc-bks-b0201',
          'btc-sunlight-def',
          MovementType.OUT,
          8,
          52,
          'DELIVERY_ORDER',
          do6.id,
          'DO-2026-0006',
          'usr-stf-01',
          'Pengiriman tambahan Galaxy',
          d(-17),
        ),
      );
      mvData.push(
        mv(
          'mov-extra-04',
          'prd-aqua-600',
          'loc-bks-a0102',
          'btc-aqua-600-def',
          MovementType.OUT,
          20,
          80,
          'DELIVERY_ORDER',
          do4.id,
          'DO-2026-0004',
          'usr-stf-01',
          'Tambahan Segar Mart',
          d(-16),
        ),
      );
      mvData.push(
        mv(
          'mov-extra-05',
          'prd-gula',
          'loc-bks-a0202',
          'btc-gula-def',
          MovementType.OUT,
          5,
          40,
          'DELIVERY_ORDER',
          do7.id,
          'DO-2026-0007',
          'usr-stf-01',
          'Tambahan Koperasi Madani',
          d(-11),
        ),
      );
      mvData.push(
        mv(
          'mov-extra-06',
          'prd-chitato',
          'loc-jkt-b0201',
          'btc-chitato-safe',
          MovementType.OUT,
          10,
          20,
          'DELIVERY_ORDER',
          do5.id,
          'DO-2026-0005',
          'usr-stf-01',
          'Tambahan Hero',
          d(-9),
        ),
      );
      mvData.push(
        mv(
          'mov-extra-07',
          'prd-kopi-abc',
          'loc-jkt-a0301',
          'btc-kopi-safe',
          MovementType.OUT,
          10,
          20,
          'DELIVERY_ORDER',
          do7.id,
          'DO-2026-0007',
          'usr-stf-01',
          'Tambahan Madani kopi',
          d(-6),
        ),
      );
      mvData.push(
        mv(
          'mov-extra-08',
          'prd-baygon',
          'loc-bks-b0202',
          'btc-baygon-safe',
          MovementType.OUT,
          4,
          30,
          'DELIVERY_ORDER',
          do6.id,
          'DO-2026-0006',
          'usr-stf-01',
          'Tambahan Galaxy baygon',
          d(-7),
        ),
      );
      mvData.push(
        mv(
          'mov-extra-09',
          'prd-pocari',
          'loc-jkt-a0202',
          'btc-pocari-safe',
          MovementType.OUT,
          10,
          15,
          'DELIVERY_ORDER',
          do5.id,
          'DO-2026-0005',
          'usr-stf-01',
          'Tambahan Hero pocari',
          d(-11),
        ),
      );
      mvData.push(
        mv(
          'mov-extra-10',
          'prd-yakult',
          'loc-jkt-b0202',
          'btc-yakult-safe',
          MovementType.OUT,
          25,
          95,
          'DELIVERY_ORDER',
          do3.id,
          'DO-2026-0003',
          'usr-stf-01',
          'Tambahan Berkah yakult',
          d(-17),
        ),
      );

      await tx.stockMovement.createMany({ data: mvData });

      // ── 14. DOCUMENT COUNTERS ─────────────────────────────────────────────
      const currentYear = new Date().getFullYear();
      await tx.documentCounter.createMany({
        data: [
          { name: `GR-${currentYear}`, currentValue: 8 },
          { name: `DO-${currentYear}`, currentValue: 10 },
          { name: `SO-${currentYear}`, currentValue: 2 },
          { name: `ADJ-${currentYear}`, currentValue: 2 },
          { name: `TR-${currentYear}`, currentValue: 0 },
          { name: `RET-${currentYear}`, currentValue: 0 },
        ],
      });

      // ── 15. AUDIT LOG ─────────────────────────────────────────────────────
      await tx.auditLog.create({
        data: {
          action: 'DEMO_RESET',
          entity: 'SYSTEM',
          entityId: 'global',
          userId: 'usr-admin-01',
          userName: 'Administrator WMS',
          userRole: 'ADMIN',
          description: 'Database demo reset & seeded dengan dataset FMCG lengkap',
          newValues: {
            reason: 'Portfolio demo reset',
            timestamp,
            products: 15,
            movements: mvData.length,
          },
          createdAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Database demo berhasil di-reset dengan dataset FMCG realistis',
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
          movements: mvData.length,
          goodsReceipts: 8,
          deliveryOrders: 10,
          stockOpnames: 2,
        },
      };
    },
    { timeout: 60000 },
  );
}
