# WMS — Sistem Manajemen Gudang (Warehouse Management System)

[![CI Pipeline](https://github.com/jhoiwada/wms/actions/workflows/ci.yml/badge.svg)](https://github.com/jhoiwada/wms/actions)
[![Version](https://img.shields.io/badge/version-0.3.0-blue.svg)](CHANGELOG.md)
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black.svg?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-darkblue.svg?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg?logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-216%20passed-brightgreen.svg)](<>)

Aplikasi web **Sistem Manajemen Gudang (Warehouse Management System / WMS)** tingkat enterprise untuk distributor multi-gudang (studi kasus: **Gudang Utama Jakarta** dan **Gudang Cabang Bekasi**). Dibangun dari nol (_zero external template_) dengan fokus utama pada kebenaran logika mutasi persediaan, integritas transaksi ACID, alokasi FEFO otomatis, auditabilitas penuh, dan keamanan tingkat produksi.

---

## 📌 Masalah Bisnis yang Diselesaikan

Dalam operasional distribusi barang konsumen cepat saji (FMCG) dan retail multi-cabang, kesalahan pengelolaan pergudangan manual atau aplikasi berbasis spreadsheet menimbulkan kerugian operasional dan finansial signifikan:

1. **Selisih Stok Fisik vs Catatan Sistem (Phantom Inventory)**:
   Terjadi akibat pencatatan manual tertunda, tidak adanya penguncian baris konkuren (_race condition_ saat picking), dan ketiadaan riwayat saldo berjalan (_running balance_).
2. **Kerugian Finansial Akibat Barang Kedaluwarsa (Expired Stock Waste)**:
   Tanpa penegakan aturan **FEFO (First Expired, First Out)** otomatis, barang yang masuk lebih awal atau memiliki masa simpan lebih pendek tertimbun di rak belakang, kadaluwarsa, dan harus dimusnahkan.
3. **Stok Negatif (Overselling / Over-Picking)**:
   Pesanan disetujui melebihi kapasitas stok fisik yang tersedia karena ketiadaan validasi atomik di level basis data.
4. **Disrupsi Operasional Saat Stock Opname**:
   Gudang konvensional harus menutup seluruh fasilitas saat penghitungan stok. Sistem ini menyediakan **pembekuan selektif per lokasi rak** (_selective rack freezing_), sehingga zona lain tetap dapat beroperasi normal.
5. **Human Error Saat Picking & Penerimaan Barang**:
   Operator salah mengambil varian barang yang mirip. Diatasi dengan integrasi **pemindaian barcode kamera langsung di perangkat seluler** dan cetak label rak/produk terstandarisasi.
6. **Hilangnya Akuntabilitas & Jejak Audit**:
   Perubahan master data harga/SKU atau penyesuaian stok manual tanpa otorisasi bertingkat (_four-eyes principle_) membuka celah manipulasi persediaan.

---

## 🚀 Fitur Utama Sistem

### 1. Fondasi Inti Pergudangan (Fase 1)

- **Dashboard Operasional Eksekutif**: Metrik valuasi stok (IDR), peringatan stok minimum (`min_stock`), panel peringatan batch mendekati kadaluwarsa dengan estimasi nilai risiko finansial (BR-10), grafik pergerakan harian, dan ringkasan mutasi terbaru.
- **Penerimaan Barang (Goods Receipt / GR)**: Penomoran atomik `GR-YYYY-XXXX`, editor baris interaktif (`LineItemsEditor`), pencatatan batch & expiry, dan pembaruan stok atomik status `RECEIVED`.
- **Pengiriman Barang (Delivery Order / DO)**: Penomoran atomik `DO-YYYY-XXXX`, validasi stok fisik multi-lokasi, dan status lifecycle dokumen (`DRAFT`, `SHIPPED`, `CANCELLED`).
- **Buku Besar Kartu Stok (Immutable Ledger)**: Riwayat mutasi persediaan murni _append-only_ dengan kalkulasi saldo berjalan (`balanceAfter`) deterministik dan mesin verifikasi konsistensi matematis (`verifyStockConsistency`).
- **Master Data Komprehensif**: Manajemen Kategori, Produk (SKU/Barcode unik, konversi UOM, harga pokok), Supplier, Customer, Gudang, dan Lokasi Rak hierarkis (`Zona-Rak-Level`) dengan _soft deactivation_.
- **Role-Based Access Control (RBAC)**: Otentikasi sesi JWT `HttpOnly` dengan 4 tingkatan hak akses: `ADMIN`, `MANAGER`, `STAFF`, dan `VIEWER`.

### 2. Alur Kerja Tingkat Lanjut (Fase 2)

- **Mesin Alokasi FEFO Otomatis (First Expired, First Out)**: Algoritma cerdas yang secara otomatis memecah alokasi kuantitas pesanan ke batch terdekat dengan tanggal kadaluwarsa terpendek (BR-06 s.d. BR-08), serta memblokir mutasi batch kedaluwarsa (BR-09).
- **Stock Opname & Rekonsiliasi Empat Mata (Four-Eyes Principle)**: Pembekuan lokasi rak otomatis (`isFrozen = true`, BR-22), verifikasi independen (pembuat dilarang menyetujui, BR-23), dan posting selisih atomik `ADJUST_IN`/`ADJUST_OUT` (BR-24, BR-25).
- **Penyesuaian Stok Manual Terkendali**: Terbatas untuk Manager/Admin (BR-26), 8 kategori alasan terstruktur, catatan wajib, dan opsi pemusnahan barang rusak/kedaluwarsa.
- **Transfer Stok Multi-Gudang & Antar Rak**: Mutasi pasangan serentak `TRANSFER_OUT` di asal dan `TRANSFER_IN` di tujuan dalam 1 transaksi ACID (BR-27, BR-28), menjaga identitas batch dan status rak beku.

### 3. Nilai Tambah & Produktivitas Operasional (Fase 3)

- **T3.1 Export Excel & PDF**: Pembuatan laporan kartu stok produk dan valuasi total persediaan gudang dalam format `.xlsx` (ExcelJS) dan `.pdf` (jsPDF) dengan tata letak profesional siap cetak.
- **T3.2 Audit Log Sentral**: Pencatatan riwayat audit komprehensif atas perubahan master data dan aksi sensitif (siapa, apa, kapan, nilai sebelum dan sesudah / diff JSON).
- **T3.3 Cetak Label Barcode**: Generator label barcode produk (Code 128 / QR Code) dan identitas rak siap cetak untuk printer termal (100x50mm) dan kertas stiker A4 multi-kolom.
- **T3.4 Pemindai Barcode Kamera HP**: Integrasi pemindaian barcode langsung melalui kamera ponsel pada form GR dan DO tanpa memerlukan perangkat pemindai fisik mahal.
- **T3.5 Denah Gudang Interaktif 2D**: Visualisasi denah tata letak gudang berbasis SVG interaktif dengan heatmap persentase keterisian rak, indikator rak beku (_frozen status_), dan popover detail stok per rak.
- **T3.6 Retur Penjualan Customer**: Alur pemrosesan retur barang dari customer terhadap Delivery Order `SHIPPED` (BR-18), validasi batas kuantitas retur, nomor dokumen `RET-YYYY-XXXX`, dan restorasi stok atomik ke lokasi rak aktif.

---

## 🛠️ Daftar Fitur Buatan Sendiri (Handcrafted Engineering vs External Libraries)

Berbeda dengan proyek template biasa yang mengandalkan package siap pakai, sistem ini menerapkan algoritma dan mesin logika bisnis yang dirancang dan diimplementasikan sendiri:

| Komponen Buatan Sendiri                        | Berkas Sumber                                                                                                                                       | Deskripsi & Nilai Rekayasa                                                                                                                                                                                                    |
| :--------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mesin Mutasi Stok Atomik**                   | [`src/server/services/stock.service.ts`](file:///c:/laragon/www/Sistem%20Manajemen%20Gudang/src/server/services/stock.service.ts)                   | Mengunci baris data fisik secara konkurensi (`SELECT ... FOR UPDATE`), mencegah saldo negatif di tingkat transaksi dan DB constraint, menghitung `balanceAfter` deterministik, serta menjamin sifat _append-only_ buku besar. |
| **Algoritma Alokasi FEFO Otomatis**            | [`src/server/services/delivery-order.service.ts`](file:///c:/laragon/www/Sistem%20Manajemen%20Gudang/src/server/services/delivery-order.service.ts) | Algoritma pemecah kuantitas multi-batch berbasis tanggal kadaluwarsa terdekat, bypass cerdas untuk produk non-expiry, dan proteksi mutlak penolakan batch expired.                                                            |
| **Denah Gudang Interaktif 2D**                 | [`src/components/features/warehouse-map/`](file:///c:/laragon/www/Sistem%20Manajemen%20Gudang/src/components/features/warehouse-map/)               | Rendering visual murni React + SVG vektor tanpa dependensi library canvas berat; menghitung rasio okupansi rak, render status freeze opname, filter gudang, dan popover detail rak.                                           |
| **Mesin Rekonsiliasi Opname Empat Mata**       | [`src/server/services/stock-opname.service.ts`](file:///c:/laragon/www/Sistem%20Manajemen%20Gudang/src/server/services/stock-opname.service.ts)     | Snapshot kuantitas sistem seketika, penguncian status lokasi rak (`isFrozen`), penegakan aturan pemisahan tugas (pembuat dilarang menyetujui dokumen sendiri), dan posting selisih atomik.                                    |
| **Generator Nomor Dokumen Anti-Tabrakan**      | [`src/server/services/counter.service.ts`](file:///c:/laragon/www/Sistem%20Manajemen%20Gudang/src/server/services/counter.service.ts)               | Penghitung nomor dokumen atomik (`GR-YYYY-XXXX`, `DO-YYYY-XXXX`, `SO-YYYY-XXXX`, `ADJ-YYYY-XXXX`, `TR-YYYY-XXXX`, `RET-YYYY-XXXX`) yang aman dari nomor ganda pada eksekusi paralel.                                          |
| **Audit Konsistensi Matematis Persediaan**     | [`src/server/services/stock.service.ts`](file:///c:/laragon/www/Sistem%20Manajemen%20Gudang/src/server/services/stock.service.ts)                   | Engine verifikasi invarian matematis `SUM(stock_movements) === current_stock` per produk dan rak untuk mendeteksi anomali data seketika.                                                                                      |
| **Generator Format Cetak Barcode Termal & A4** | [`src/lib/label-pdf.ts`](file:///c:/laragon/www/Sistem%20Manajemen%20Gudang/src/lib/label-pdf.ts)                                                   | Kalkulasi matematis koordinat layout stiker termal (100x50mm) dan grid A4 multi-kolom dengan rendering barcode vektor Code 128 / QR Code.                                                                                     |

---

## 🗄️ Entity-Relationship Diagram (ERD)

Struktur basis data relasional PostgreSQL dirancang dengan normalisasi tingkat tinggi (3NF) dan integritas referensial ketat:

```mermaid
erDiagram
    User ||--o{ GoodsReceipt : "creates"
    User ||--o{ DeliveryOrder : "creates"
    User ||--o{ StockOpname : "creates"
    User ||--o{ StockOpname : "approves"
    User ||--o{ StockMovement : "records"
    User ||--o{ AuditLog : "triggers"

    Category ||--o{ Product : "classifies"
    Product ||--o{ Batch : "has"
    Product ||--o{ Stock : "stored_in"
    Product ||--o{ StockMovement : "transacted_in"
    Product ||--o{ GoodsReceiptItem : "received_in"
    Product ||--o{ DeliveryOrderItem : "shipped_in"
    Product ||--o{ StockOpnameItem : "counted_in"

    Warehouse ||--o{ Location : "contains"
    Warehouse ||--o{ Stock : "holds"
    Warehouse ||--o{ StockMovement : "tracks"
    Warehouse ||--o{ GoodsReceipt : "receives_into"
    Warehouse ||--o{ DeliveryOrder : "ships_from"
    Warehouse ||--o{ StockOpname : "audits"

    Location ||--o{ Stock : "houses"
    Location ||--o{ StockMovement : "moves_through"
    Location ||--o{ GoodsReceiptItem : "target_rack"
    Location ||--o{ DeliveryOrderItem : "source_rack"
    Location ||--o{ StockOpnameItem : "frozen_for"

    Batch ||--o{ Stock : "quantifies"
    Batch ||--o{ StockMovement : "identifies"
    Batch ||--o{ DeliveryOrderItem : "allocated_to"

    Supplier ||--o{ GoodsReceipt : "supplies"
    Customer ||--o{ DeliveryOrder : "orders"

    GoodsReceipt ||--|{ GoodsReceiptItem : "contains"
    DeliveryOrder ||--|{ DeliveryOrderItem : "contains"
    StockOpname ||--|{ StockOpnameItem : "contains"

    User {
        string id PK
        string email UK
        string name
        string passwordHash
        Role role
        boolean isActive
    }

    Warehouse {
        string id PK
        string code UK
        string name
        string address
        boolean isActive
    }

    Location {
        string id PK
        string warehouseId FK
        string code
        string zone
        string rack
        string level
        boolean isFrozen
        boolean isActive
    }

    Category {
        string id PK
        string code UK
        string name
        boolean isActive
    }

    Product {
        string id PK
        string categoryId FK
        string sku UK
        string barcode UK
        string name
        string uom
        int minStock
        decimal costPrice
        boolean trackExpiry
        boolean isActive
    }

    Batch {
        string id PK
        string productId FK
        string batchNo
        datetime expiryDate
    }

    Stock {
        string id PK
        string warehouseId FK
        string locationId FK
        string productId FK
        string batchId FK
        int quantity
    }

    StockMovement {
        string id PK
        string productId FK
        string warehouseId FK
        string locationId FK
        string batchId FK
        MovementType movementType
        int quantity
        decimal unitCost
        int balanceAfter
        string refType
        string refNo
        string userId FK
    }

    GoodsReceipt {
        string id PK
        string receiptNo UK
        string supplierId FK
        string warehouseId FK
        GoodsReceiptStatus status
        datetime receivedAt
        string createdById FK
    }

    DeliveryOrder {
        string id PK
        string deliveryNo UK
        string customerId FK
        string warehouseId FK
        DeliveryOrderStatus status
        datetime shippedAt
        string createdById FK
    }

    StockOpname {
        string id PK
        string opnameNo UK
        string warehouseId FK
        StockOpnameStatus status
        string createdById FK
        string approvedById FK
    }

    DocumentCounter {
        string id PK
        string name UK
        int currentValue
    }

    AuditLog {
        string id PK
        string action
        string entity
        string entityId
        string userId FK
        json details
    }
```

---

## 📸 Tinjauan Antarmuka & Showcase Fitur

Sistem ini dirancang dengan estetika antarmuka modern, responsif, dan fungsional:

| Modul / Tampilan               | Deskripsi Visual & Kemampuan Utama                                                                                                                                              |
| :----------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Dashboard Operasional**      | Metrik valuasi persediaan, indikator stok menipis, widget peringatan risiko finansial barang mendekati kadaluwarsa, dan grafik mutasi harian masuk vs keluar.                   |
| **Denah Gudang Interaktif 2D** | Peta visual layout rak dua dimensi berbasis vektor SVG dengan skala warna kapasitas okupansi (hijau, kuning, oranye, merah), indikator rak beku opname, dan popover inventaris. |
| **Pemindai Barcode Kamera HP** | Modal pemindai kamera responsif yang dapat membaca barcode produk dan kode rak seketika langsung dari browser smartphone saat pengisian form GR/DO.                             |
| **Buku Besar Kartu Stok**      | Riwayat pergerakan barang kronologis per produk dengan running balance (`balanceAfter`), link dokumen referensi, dan tombol export Excel/PDF.                                   |
| **Alur Rekonsiliasi Opname**   | Panel hitung fisik dengan komparasi kuantitas sistem, highlight otomatis selisih lebih/kurang, dan penegakan _four-eyes approval_.                                              |
| **Retur Penjualan Customer**   | Formulir validasi retur barang dari DO `SHIPPED` dengan batas kuantitas tersisa, kategorisasi alasan retur terstruktur, dan penempatan kembali ke rak tujuan.                   |

---

## 🌐 Tautan Demo & Akun Uji Coba

Aplikasi dapat dijalankan secara lokal atau diakses melalui environment demo publik.

### Akun Demo Bawaan (Database Seeder):

| Peran (Role) | Email Login         | Kata Sandi     | Deskripsi Hak Akses                                                                  |
| :----------- | :------------------ | :------------- | :----------------------------------------------------------------------------------- |
| **ADMIN**    | `admin@demo.test`   | `Password123!` | Akses tak terbatas: kelola pengguna, reset demo, konfigurasi, dan semua operasional. |
| **MANAGER**  | `manager@demo.test` | `Password123!` | Otorisasi dokumen, persetujuan opname, penyesuaian stok manual, dan export laporan.  |
| **STAFF**    | `staff@demo.test`   | `Password123!` | Operasional harian: draft/post GR & DO, scan barcode kamera, hitung opname, retur.   |
| **VIEWER**   | `viewer@demo.test`  | `Password123!` | Akses baca saja (_read-only_): dashboard, katalog produk, denah gudang, kartu stok.  |

### Fasilitas Reset Data Demo Terjadwal

Untuk menjamin ketersediaan data demo yang konsisten dan bersih bagi peninjau portofolio, sistem dilengkapi endpoint dan skrip reset otomatis:

1. **Melalui Skrip CLI**:
   ```bash
   npm run db:reset
   ```
2. **Melalui Endpoint REST API (Dukungan Cron Terjadwal)**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/demo/reset \
     -H "Authorization: Bearer wms-demo-secret-token"
   ```
   _(Catatan: Pada lingkungan produksi, fasilitas ini dilindungi flag keamanan `ENABLE_DEMO_RESET=true`)_.

---

## 🏛️ Arsitektur & Tumpukan Teknologi

Aplikasi menggunakan arsitektur monolit modular dengan pemisahan layer tanggung jawab yang bersih:

```
Browser / Klien Seluler (React 19 Server & Client Components)
   │
   ▼
Next.js App Router (app/(dashboard)/... & app/api/v1/...)
   │ [Validasi Zod & Server-Side Guard requireRole]
   ▼
Service Layer (src/server/services/*.service.ts)
   │ [Aturan Bisnis Keras & Transaksi ACID prisma.$transaction]
   ▼
Data Access Layer (Prisma Client Singleton & Row-Level Locking)
   │
   ▼
PostgreSQL Database (Constraints CHECK, Foreign Keys & Unique Indexes)
```

- **Framework**: Next.js 16.4 (App Router, Turbopack, Server Actions)
- **Bahasa**: TypeScript 5 (Strict Mode, Zero `any` policy)
- **Styling**: Tailwind CSS v4 & Lucide Icons
- **Database & ORM**: PostgreSQL 16 & Prisma ORM 6
- **Autentikasi & Keamanan**: JWT Session via `jose`, `bcryptjs`, Rate Limiter sliding-window, dan HTTP Security Headers
- **Ekspor Dokumen**: `exceljs` (Excel Spreadsheet) & `jspdf` / `jspdf-autotable` (PDF Vector)
- **Pengujian**: Vitest 5 (216 unit, service, component, & integration tests)

---

## ⚡ Panduan Instalasi Cepat (Quick Start)

### Prasyarat

- Node.js versi 20 atau 22 LTS
- PostgreSQL 16 (atau Laragon / Docker)

### Langkah Pemasangan:

1. **Clone Repositori**:

   ```bash
   git clone https://github.com/jhoiwada/wms.git
   cd wms
   ```

2. **Pasang Dependensi**:

   ```bash
   npm install
   ```

3. **Pengaturan Lingkungan (.env)**:

   ```bash
   cp .env.example .env
   ```

   Sesuaikan string koneksi `DATABASE_URL` pada berkas `.env`.

4. **Migrasi Database & Seed Data Demo**:

   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Jalankan Server Pengembangan**:
   ```bash
   npm run dev
   ```
   Buka peramban Anda di [http://localhost:3000](http://localhost:3000).

---

## 🧪 Verifikasi Kualitas & Standar Kode

Seluruh kode dalam repositori ini lolos 4 gerbang kualitas ketat:

```bash
# 1. Analisis statis linter (ESLint) - 0 error, 0 warning
npm run lint

# 2. Pemeriksaan tipe TypeScript statis
npm run typecheck

# 3. Test suite otomatis (Vitest - 27 berkas pengujian, 216 tests passing)
npm test

# 4. Validasi kompilasi bundle produksi Next.js
npm run build
```

---

## 📚 Dokumentasi Rujukan Teknis

Arsitektur dan aturan bisnis terdokumentasi lengkap di direktori [`docs/`](docs/):

- [`docs/ROADMAP.md`](docs/ROADMAP.md) — Pelacakan pengerjaan seluruh tahapan proyek.
- [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md) — 33 aturan bisnis operasional pergudangan.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Arsitektur monolit, layer layanan, dan transaksi stok.
- [`docs/DATABASE.md`](docs/DATABASE.md) — Kamus data relasional, indeks, dan relasi.
- [`docs/SECURITY.md`](docs/SECURITY.md) — Matriks hak akses RBAC, proteksi sesi, dan checklist keamanan.
- [`docs/API.md`](docs/API.md) — Spesifikasi REST API v1 lengkap dengan payload request & response.

---

## 📄 Lisensi

Proyek ini dibangun sebagai portofolio profesional dan berlisensi [MIT](LICENSE).
