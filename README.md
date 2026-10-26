# WMS — Sistem Manajemen Gudang (Warehouse Management System)

[![CI Pipeline](https://github.com/jhoiwada/wms/actions/workflows/ci.yml/badge.svg)](https://github.com/jhoiwada/wms/actions)
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](CHANGELOG.md)
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black.svg?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-darkblue.svg?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg?logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-129%20passed-brightgreen.svg)](<>)

Aplikasi web **Sistem Manajemen Gudang (WMS)** tingkat enterprise untuk distributor multi-gudang (studi kasus: **Gudang Utama Jakarta** dan **Gudang Cabang Bekasi**). Dibangun dengan fokus utama pada kebenaran logika stok, integritas transaksi ACID, auditabilitas penuh, dan keamanan tingkat produksi.

---

## Daftar Isi

- [Studi Kasus & Fitur Utama](#studi-kasus--fitur-utama)
- [Aturan Bisnis Keras (Business Invariants)](#aturan-bisnis-keras-business-invariants)
- [Arsitektur & Tumpukan Teknologi](#arsitektur--tumpukan-teknologi)
- [Matriks Hak Akses (RBAC) & Akun Demo](#matriks-hak-akses-rbac--akun-demo)
- [Struktur Repositori](#struktur-repositori)
- [Panduan Memulai Cepat (Quick Start)](#panduan-memulai-cepat-quick-start)
- [Pengujian & Verifikasi Kualitas](#pengujian--verifikasi-kualitas)
- [Dokumentasi Lengkap](#dokumentasi-lengkap)

---

## Studi Kasus & Fitur Utama

Distributor barang konsumsi (FMCG) dengan gudang pusat di Jakarta Barat dan gudang cabang di Bekasi Timur. Sistem mengelola alur barang masuk dari supplier terdaftar, penyimpanan terorganisir per lokasi rak, alokasi pengiriman pesanan ke customer, dan rekonsiliasi stok secara real-time.

### Fitur yang Tersedia (Rilis v0.1.0)

1. **Dashboard Operasional Real-Time**:
   - Ringkasan nilai total persediaan barang (IDR) dan total kuantitas unit.
   - Peringatan stok menipis di bawah kuota minimum (`min_stock`) dan notifikasi dokumen draft yang tertunda.
   - Grafik batang visualisasi pergerakan barang masuk vs keluar harian (periode 7 hari / 30 hari).
   - Tabel aktivitas mutasi barang terkini dengan tautan langsung ke dokumen referensi.
2. **Manajemen Barang Masuk (Goods Receipt / GR)**:
   - Penomoran otomatis format `GR-YYYY-XXXX`.
   - Penyusunan draft penerimaan barang dengan editor baris interaktif (`LineItemsEditor`).
   - Pencatatan nomor batch dan tanggal kedaluwarsa untuk produk yang mewajibkan pelacakan expiry.
   - Penerimaan atomik: mengunci status dokumen (`RECEIVED`), mengupdate stok fisik, dan mencatat pergerakan stok secara bersamaan.
3. **Manajemen Barang Keluar (Delivery Order / DO)**:
   - Penomoran otomatis format `DO-YYYY-XXXX`.
   - Validasi ketersediaan stok fisik di lokasi gudang terkait sebelum konfirmasi pengiriman.
   - **Alokasi FEFO Otomatis (First Expired, First Out)**: sistem secara cerdas memprioritaskan batch yang memiliki tanggal kedaluwarsa paling dekat.
   - Penolakan seluruh dokumen (atomic rollback) jika stok tidak mencukupi untuk memenuhi pesanan (BR-17).
4. **Buku Besar Kartu Stok & Audit Konsistensi**:
   - Tampilan ringkasan stok per produk dan lokasi rak.
   - Kartu stok produk dengan riwayat saldo berjalan (`balanceAfter`) kronologis per mutasi.
   - Mesin audit konsistensi (`verifyStockConsistency`): memvalidasi invarian matematis bahwa `SUM(stock_movements) == current_stock` tanpa selisih.
5. **Master Data Komprehensif**:
   - Manajemen Kategori, Supplier, dan Customer dengan kebijakan soft deactivation (`isActive = false`).
   - Manajemen Produk dengan validasi keunikan SKU/barcode, konversi satuan (`uom`), harga pokok, dan flag pelacakan expiry.
   - Manajemen Gudang dan Lokasi Rak dengan penegakan pola kode rak `/^[A-Z]-\d{2}-\d{2}$/` serta dukungan freeze status untuk opname.

---

## Aturan Bisnis Keras (Business Invariants)

Sistem mematuhi aturan bisnis yang terdokumentasi dalam [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md):

- **BR-01 & BR-17 (Stok Tidak Pernah Negatif)**: Kuantitas stok dijaga ketat di lapisan service dan database (`CHECK (quantity >= 0)`). Jika kuantitas kurang, seluruh transaksi ditolak.
- **BR-08 (Alokasi FEFO)**: Barang keluar tanpa spesifikasi batch otomatis dialokasikan ke batch terdekat yang belum kedaluwarsa.
- **BR-09 (Proteksi Expired)**: Batch yang telah lewat tanggal kedaluwarsanya dilarang keras untuk dikirim melalui Delivery Order.
- **BR-12 & BR-17 (Transaksi Atomik & Kunci Baris)**: Semua mutasi stok melewati `applyStockMovement` dalam satu `prisma.$transaction` dengan `SELECT ... FOR UPDATE` untuk mencegah race condition.
- **BR-22 (Pembekuan Lokasi)**: Lokasi rak yang berstatus freeze (dalam proses stock opname) diblokir dari seluruh pergerakan barang masuk dan keluar.
- **BR-29 & BR-30 (Buku Besar Append-Only)**: Tabel `stock_movements` tidak pernah di-UPDATE atau di-DELETE. Setiap koreksi dilakukan dengan pergerakan baru.
- **BR-31 & BR-32 (Soft Deactivation)**: Data master yang memiliki riwayat transaksi tidak boleh dihapus secara permanen dari database.

---

## Arsitektur & Tumpukan Teknologi

Aplikasi menggunakan arsitektur monolit modern dengan pemisahan tanggung jawab yang ketat per [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md):

```
Browser / Client (React 19 Server & Client Components)
   │
   ▼
Next.js App Router (app/(dashboard)/... & app/api/v1/...)
   │ [Validasi Zod & Guard requireRole]
   ▼
Service Layer (src/server/services/*.service.ts)
   │ [Aturan Bisnis & Transaksi ACID prisma.$transaction]
   ▼
Data Access (Prisma Client Singleton & Row-Level Locking)
   │
   ▼
PostgreSQL Database (Constraints, Indexes & Stored Functions)
```

- **Framework**: Next.js 16.4 (App Router, Turbopack, Partial Prerendering)
- **Bahasa**: TypeScript 5 (Strict Mode)
- **Styling**: Tailwind CSS v4 & Lucide Icons
- **Database & ORM**: PostgreSQL 16 & Prisma ORM 6
- **Autentikasi & Keamanan**: JWT Sessions via `jose`, `bcryptjs`, dan rate limiter di memori
- **Validasi Data**: Zod v4
- **Pengujian**: Vitest 5 (129 unit & integration tests)

---

## Matriks Hak Akses (RBAC) & Akun Demo

Akses sistem diamankan di sisi server menggunakan guard `requireRole`. Akun demo berikut telah disediakan melalui database seeder:

| Role        | Email Demo          | Password       | Hak Akses Utama                                                |
| :---------- | :------------------ | :------------- | :------------------------------------------------------------- |
| **ADMIN**   | `admin@wms.local`   | `Password123!` | Akses penuh seluruh sistem, konfigurasi, dan manajemen user.   |
| **MANAGER** | `manager@wms.local` | `Password123!` | Persetujuan dokumen, laporan persediaan, koreksi stok, opname. |
| **STAFF**   | `staff@wms.local`   | `Password123!` | Pembuatan draft & penerimaan GR, pengiriman DO, cek stok rak.  |
| **VIEWER**  | `viewer@wms.local`  | `Password123!` | Akses read-only ke dashboard, katalog produk, dan kartu stok.  |

---

## Struktur Repositori

```
wms/
├── docs/                # 14 dokumen spesifikasi & aturan bisnis proyek
├── prisma/              # Skema database, migrasi relasional, dan script seed
├── src/
│   ├── app/             # Halaman App Router & REST API Route Handlers
│   │   ├── (auth)/      # Halaman login & otentikasi
│   │   ├── (dashboard)/ # Halaman dashboard, master data, GR, DO, dan kartu stok
│   │   └── api/v1/      # REST API endpoints
│   ├── components/
│   │   ├── ui/          # Komponen UI dasar (Button, Input, Badge, Dialog, DataTable)
│   │   └── features/    # Komponen khusus fitur (LineItemsEditor, MovementChart, dll.)
│   ├── schemas/         # Skema validasi Zod bersama (client & server)
│   ├── server/
│   │   ├── auth/        # Manajemen sesi JWT, guard RBAC, dan rate limiter
│   │   ├── services/    # Inti aturan bisnis dan mesin mutasi stok
│   │   ├── db.ts        # Singleton Prisma Client
│   │   └── errors.ts    # Kelas AppError dan penanganan error terpadu
│   └── types/           # Definisi tipe TypeScript
└── CHANGELOG.md         # Catatan rilis versi terstruktur
```

---

## Panduan Memulai Cepat (Quick Start)

### Prasyarat

- Node.js versi 20 atau 22 LTS
- PostgreSQL 16 (atau Docker)

### Langkah Instalasi

1. **Clone repositori**:

   ```bash
   git clone https://github.com/jhoiwada/wms.git
   cd wms
   ```

2. **Instal dependensi**:

   ```bash
   npm install
   ```

3. **Konfigurasi Environment**:
   Salin `.env.example` menjadi `.env` dan sesuaikan koneksi database PostgreSQL Anda:

   ```bash
   cp .env.example .env
   ```

4. **Jalankan Migrasi & Database Seeder**:

   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Mulai Server Pengembangan**:
   ```bash
   npm run dev
   ```
   Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.

---

## Pengujian & Verifikasi Kualitas

Setiap perubahan kode divalidasi dengan 4 tingkat pengujian mandatori:

```bash
# 1. Analisis statis linter (ESLint)
npm run lint

# 2. Pemeriksaan tipe TypeScript tanpa kompilasi
npm run typecheck

# 3. Pengujian unit, integrasi & E2E (Vitest)
npm test

# 4. Validasi kompilasi build produksi Next.js
npm run build
```

---

## Dokumentasi Lengkap

Dokumentasi arsitektur dan bisnis yang komprehensif tersedia di folder [`docs/`](docs/):

- [`docs/ROADMAP.md`](docs/ROADMAP.md) — Tahapan pengerjaan dan roadmap fitur.
- [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md) — 33 aturan bisnis operasional gudang.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Arsitektur monolit, layer, dan transaksi stok.
- [`docs/DATABASE.md`](docs/DATABASE.md) — Skema tabel relasional, indeks, dan relasi.
- [`docs/SECURITY.md`](docs/SECURITY.md) — Matriks hak akses RBAC, proteksi sesi, dan audit keamanan.
- [`docs/API.md`](docs/API.md) — Spesifikasi REST API v1 lengkap dengan request & response payload.

---

## Lisensi & Hak Cipta

Proyek ini dibangun untuk tujuan portofolio profesional dan berlisensi [MIT](LICENSE).
