import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai seeding database WMS...');

  const rawPassword = process.env.SEED_DEMO_PASSWORD || 'Password123!';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // 1. Users (Akun Demo)
  const usersData = [
    {
      id: 'usr-admin-01',
      name: 'Administrator WMS',
      email: 'admin@demo.test',
      role: Role.ADMIN,
    },
    {
      id: 'usr-mgr-01',
      name: 'Budi Santoso (Manager)',
      email: 'manager@demo.test',
      role: Role.MANAGER,
    },
    {
      id: 'usr-stf-01',
      name: 'Siti Rahma (Staff Gudang)',
      email: 'staff@demo.test',
      role: Role.STAFF,
    },
    {
      id: 'usr-viw-01',
      name: 'Andi Pratama (Viewer)',
      email: 'viewer@demo.test',
      role: Role.VIEWER,
    },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash },
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash,
      },
    });
  }
  console.log(`✓ ${usersData.length} pengguna demo siap.`);

  // 2. Warehouses (Gudang Jakarta & Bekasi)
  const warehousesData = [
    {
      id: 'wh-jkt',
      code: 'WH-JKT',
      name: 'Gudang Utama Jakarta',
      address: 'Kawasan Industri Pulogadung, Jakarta Timur',
    },
    {
      id: 'wh-bks',
      code: 'WH-BKS',
      name: 'Gudang Distribusi Bekasi',
      address: 'Kawasan Industri MM2100, Cikarang Barat, Bekasi',
    },
  ];

  for (const w of warehousesData) {
    await prisma.warehouse.upsert({
      where: { code: w.code },
      update: { name: w.name, address: w.address },
      create: w,
    });
  }
  console.log(`✓ ${warehousesData.length} gudang terdaftar.`);

  // 3. Locations (Format: Zona-Rak-Level e.g. A-01-01)
  const locationsData = [
    {
      id: 'loc-jkt-a0101',
      warehouseId: 'wh-jkt',
      code: 'A-01-01',
      zone: 'A',
      rack: '01',
      level: '01',
    },
    {
      id: 'loc-jkt-a0102',
      warehouseId: 'wh-jkt',
      code: 'A-01-02',
      zone: 'A',
      rack: '01',
      level: '02',
    },
    {
      id: 'loc-jkt-a0103',
      warehouseId: 'wh-jkt',
      code: 'A-01-03',
      zone: 'A',
      rack: '01',
      level: '03',
    },
    {
      id: 'loc-jkt-b0101',
      warehouseId: 'wh-jkt',
      code: 'B-01-01',
      zone: 'B',
      rack: '01',
      level: '01',
    },
    {
      id: 'loc-jkt-b0102',
      warehouseId: 'wh-jkt',
      code: 'B-01-02',
      zone: 'B',
      rack: '01',
      level: '02',
    },
    {
      id: 'loc-bks-a0101',
      warehouseId: 'wh-bks',
      code: 'A-01-01',
      zone: 'A',
      rack: '01',
      level: '01',
    },
    {
      id: 'loc-bks-a0102',
      warehouseId: 'wh-bks',
      code: 'A-01-02',
      zone: 'A',
      rack: '01',
      level: '02',
    },
    {
      id: 'loc-bks-b0101',
      warehouseId: 'wh-bks',
      code: 'B-01-01',
      zone: 'B',
      rack: '01',
      level: '01',
    },
  ];

  for (const loc of locationsData) {
    await prisma.location.upsert({
      where: {
        warehouseId_code: {
          warehouseId: loc.warehouseId,
          code: loc.code,
        },
      },
      update: { zone: loc.zone, rack: loc.rack, level: loc.level },
      create: loc,
    });
  }
  console.log(`✓ ${locationsData.length} lokasi rak terdaftar.`);

  // 4. Categories
  const categoriesData = [
    {
      id: 'cat-fnb',
      code: 'FNB',
      name: 'Makanan & Minuman',
      description: 'Produk konsumsi dengan batch dan expired date',
    },
    {
      id: 'cat-elc',
      code: 'ELC',
      name: 'Elektronik Kecil',
      description: 'Aksesoris komputer, gadget, dan kabel',
    },
    {
      id: 'cat-atk',
      code: 'ATK',
      name: 'Alat Tulis Kantor',
      description: 'Kebutuhan kantor dan kertas',
    },
    {
      id: 'cat-hld',
      code: 'HLD',
      name: 'Perlengkapan Rumah',
      description: 'Produk kebersihan rumah tangga',
    },
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { code: cat.code },
      update: { name: cat.name, description: cat.description },
      create: cat,
    });
  }
  console.log(`✓ ${categoriesData.length} kategori barang dibuat.`);

  // 5. Products
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
      costPrice: 180000.0,
      trackExpiry: true,
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
      costPrice: 65000.0,
      trackExpiry: true,
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
      costPrice: 85000.0,
      trackExpiry: false,
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
      costPrice: 45000.0,
      trackExpiry: false,
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
      costPrice: 210000.0,
      trackExpiry: false,
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
      costPrice: 115000.0,
      trackExpiry: true,
    },
  ];

  for (const prd of productsData) {
    await prisma.product.upsert({
      where: { sku: prd.sku },
      update: {
        name: prd.name,
        minStock: prd.minStock,
        costPrice: prd.costPrice,
        trackExpiry: prd.trackExpiry,
        uom: prd.uom,
      },
      create: prd,
    });

    // Buat default batch untuk masing-masing produk (BR-07)
    await prisma.batch.upsert({
      where: {
        productId_batchNo: {
          productId: prd.id,
          batchNo: 'DEFAULT',
        },
      },
      update: {},
      create: {
        productId: prd.id,
        batchNo: 'DEFAULT',
        expiryDate: null,
      },
    });
  }
  console.log(`✓ ${productsData.length} master produk dan default batch siap.`);

  // 6. Suppliers & Customers
  const suppliersData = [
    {
      id: 'sup-indofood',
      code: 'SUP-001',
      name: 'PT Sumber Pangan Sejahtera',
      contactName: 'Hendro Wijaya',
      phone: '021-5551234',
      email: 'sales@sumberpangan.co.id',
      address: 'Jl. Industri Raya No. 45, Jakarta',
    },
    {
      id: 'sup-gadget',
      code: 'SUP-002',
      name: 'PT Global Solusi Digital',
      contactName: 'Denny Kurniawan',
      phone: '021-8884321',
      email: 'order@globalsolusi.id',
      address: 'Komp. Ruko Mangga Dua Mall Blok B-12, Jakarta',
    },
    {
      id: 'sup-atk',
      code: 'SUP-003',
      name: 'PT Paperindo Nusantara',
      contactName: 'Rian Hidayat',
      phone: '021-7776543',
      email: 'info@paperindo.com',
      address: 'Kawasan Pergudangan Marunda Center Blok C-3, Bekasi',
    },
  ];

  for (const s of suppliersData) {
    await prisma.supplier.upsert({
      where: { code: s.code },
      update: { name: s.name, phone: s.phone, email: s.email },
      create: s,
    });
  }

  const customersData = [
    {
      id: 'cst-mart-01',
      code: 'CST-001',
      name: 'Toko Berkah Mart Kelapa Gading',
      contactName: 'Haji Syamsul',
      phone: '0812-9988-7766',
      email: 'berkahmart@gmail.com',
      address: 'Jl. Boulevard Raya Blok TA-2 No. 10, Jakarta Utara',
    },
    {
      id: 'cst-tech-01',
      code: 'CST-002',
      name: 'Cybertech Store Bekasi Cyber Park',
      contactName: 'Agus Salim',
      phone: '0813-8877-6655',
      email: 'cybertech.bcp@gmail.com',
      address: 'BCP Lt. 1 No. 45, Jl. KH Noer Ali, Bekasi Selatan',
    },
  ];

  for (const c of customersData) {
    await prisma.customer.upsert({
      where: { code: c.code },
      update: { name: c.name, phone: c.phone, email: c.email },
      create: c,
    });
  }
  console.log(`✓ Suppliers dan Customers siap.`);

  // 7. Document Counters (BR-15, anti-collision numbering)
  const countersData = [
    { name: 'GR-2026', currentValue: 0 },
    { name: 'DO-2026', currentValue: 0 },
    { name: 'OP-2026', currentValue: 0 },
  ];

  for (const cnt of countersData) {
    await prisma.documentCounter.upsert({
      where: { name: cnt.name },
      update: {},
      create: cnt,
    });
  }
  console.log(`✓ Document counters diinisialisasi.`);

  console.log('✨ Seeding database WMS selesai dengan sempurna!');
}

main()
  .catch((e) => {
    console.error('❌ Gagal seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
