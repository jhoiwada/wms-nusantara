# Changelog

Semua perubahan penting pada proyek **WMS (Sistem Manajemen Gudang)** didokumentasikan dalam berkas ini.
Format penulisan mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan menganut [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2026-10-27

Rilis **Fase 2: Pembeda WMS (Tahap 2)** dari Sistem Manajemen Gudang, menghadirkan fitur-fitur pembeda utama WMS tingkat lanjut meliputi kontrol batch & kedaluwarsa (FEFO), peringatan dini barang kedaluwarsa, alur audit stock opname dengan pembekuan lokasi dan persetujuan empat mata (four-eyes principle), penyesuaian stok manual terotorisasi, serta transfer stok antar rak dan antar gudang.

### Ditambahkan (Added)

#### Pelacakan Batch & FEFO Lanjutan (T2.1 & T2.2)

- **Multi-Batch FEFO Splitting (`c45eb30`)**:
  - Alokasi pengiriman Delivery Order (DO) otomatis memecah kebutuhan kuantitas produk ke beberapa batch berdasarkan tanggal kedaluwarsa terdekat (First Expired, First Out) per aturan BR-06 s.d. BR-08.
  - Validasi ketat kedaluwarsa (BR-09): sistem menolak mutasi keluar untuk batch yang telah lewat masa kedaluwarsanya.
  - Peringatan visual batch mendekati kedaluwarsa (<= 30 hari) pada form input DO.
- **Peringatan Kedaluwarsa & Panel Dashboard (`1c42ba8`)**:
  - Endpoint REST API `/api/v1/stock/expiring` yang menyajikan data batch mendekati/telah kedaluwarsa lengkap dengan kalkulasi nilai risiko persediaan (`quantity * costPrice`, BR-10).
  - Komponen visual `ExpiryBadge` dengan diferensiasi status (`EXPIRED` merah, `NEAR_EXPIRY` kuning, `SAFE` hijau).
  - Panel dashboard "Peringatan Batch Mendekati Kedaluwarsa" dengan filter multi-rentang waktu (Semua, Kedaluwarsa, <= 30 Hari, <= 60 Hari) dan ringkasan total nilai risiko finansial.

#### Stock Opname & Integritas Fisik (T2.3)

- **Siklus Lengkap Stock Opname (`6a3ce60`)**:
  - Alur dokumen berstatus `DRAFT -> SUBMITTED -> APPROVED / REJECTED` (BR-20, BR-21).
  - Snapshot stok sistem tersimpan secara instan saat pembuatan dokumen.
  - Pembekuan lokasi rak otomatis (`isFrozen = true`, BR-22): seluruh pergerakan barang masuk/keluar pada rak terkait diblokir hingga opname selesai.
  - Penegakan prinsip empat mata (Four-Eyes Principle, BR-23): persetujuan wajib oleh role `MANAGER` atau `ADMIN` dan approver tidak boleh orang yang sama dengan pembuat dokumen (`approverId !== createdById`).
  - Rekonsiliasi stok otomatis saat disetujui (BR-24): mutasi `ADJUST_IN` untuk selisih lebih fisik dan `ADJUST_OUT` untuk selisih kurang fisik, diikuti pencairan status pembekuan rak (`isFrozen = false`).
  - Penolakan dokumen (BR-25): pembatalan tanpa mutasi stok dengan catatan penolakan wajib dan pencairan status pembekuan rak.
  - Halaman antarmuka terintegrasi: `/stock-opname` (daftar opname + KPI selisih), `/stock-opname/new` (pemilihan gudang/rak dengan peringatan freeze), dan `/stock-opname/[id]` (input hitung fisik, indikator selisih real-time, badge pembuat/penyetujui, dan modal konfirmasi).

#### Penyesuaian Stok Manual (T2.4)

- **Koreksi Stok Manual Terkendali (`d39215d`)**:
  - Otorisasi ketat terbatas hanya untuk pengguna dengan role `MANAGER` atau `ADMIN` (BR-26).
  - 8 kategori alasan terstruktur: `EXPIRED_DISPOSAL`, `DAMAGED_GOODS`, `GR_CORRECTION`, `DO_CORRECTION`, `LOST_INVENTORY`, `FOUND_INVENTORY`, `PROMO_SAMPLE`, `OTHER`.
  - Kewajiban pengisian catatan alasan minimal 5 karakter untuk menjaga auditabilitas pergerakan stok.
  - Penomoran dokumen terpusat berurutan format `ADJ-YYYY-XXXX`.
  - Mendukung pemusnahan barang kedaluwarsa (`EXPIRED_DISPOSAL`) melalui mutasi `ADJUST_OUT`.
  - Halaman antarmuka `/stock-adjustments` (daftar penyesuaian + kartu KPI) dan `/stock-adjustments/new` (form input cascading gudang, produk, lokasi rak, tipe penyesuaian, dan alasan).

#### Transfer Stok Antar Rak & Antar Gudang (T2.5)

- **Transfer Stok Atomik (`c554378`)**:
  - Pemindahan stok instan dan atomik antar rak dalam gudang yang sama maupun antar gudang (Jakarta & Bekasi) dalam 1 transaksi ACID (BR-27).
  - Pasangan mutasi ganda: `TRANSFER_OUT` di lokasi asal dan `TRANSFER_IN` di lokasi tujuan secara serempak tanpa status mengambang ("in-transit").
  - Validasi pencegahan pemindahan ke rak yang sama (`sourceLocationId !== targetLocationId`, BR-28).
  - Pewarisan utuh identitas batch (`batchNo`) dan tanggal kedaluwarsa (`expiryDate`) ke lokasi tujuan.
  - Perlindungan lokasi beku (`isFrozen`, BR-22) di kedua sisi (lokasi asal maupun lokasi tujuan).
  - Penomoran dokumen otomatis terpusat format `TR-YYYY-XXXX`.
  - Halaman antarmuka `/stock-transfers` (riwayat transfer + KPI) dan `/stock-transfers/new` (form transfer interaktif dengan visualisasi sisa stok rak asal).

### Pengujian & Metrik (Testing & Metrics)

- 17 test file (170 tests) lulus 100% tanpa regresi.
- 49 rute Next.js App Router terkompilasi optimal pada build produksi.

---

## [0.1.0] - 2026-10-27

Rilis perdana **Fase 1: Inti** dari Sistem Manajemen Gudang untuk distributor multi-gudang (Gudang Utama Jakarta & Gudang Cabang Bekasi).

### Ditambahkan (Added)

#### Fondasi & Infrastruktur (Fase 0)

- **Inisialisasi Proyek**: Next.js 16 (App Router) + TypeScript strict, Tailwind CSS v4, Prisma ORM, dan PostgreSQL (`31a55aa`).
- **Kualitas Kode & Standar**: Konfigurasi ESLint 9, Prettier, Husky pre-commit hooks, lint-staged, dan commitlint Conventional Commits (`67d3f2a`).
- **Database & Skema Relasional**: Skema lengkap 12 tabel PostgreSQL dengan constraint integritas (`CHECK (quantity >= 0)`), indeks performa, baseline migration, dan seed data realistis (`c0d2b60`).
- **Validasi Lingkungan & Error Handling**: Validasi `src/env.ts` berbasis Zod, kelas `AppError` terstruktur, sentralisasi `handleError`, dan logger terintegrasi (`f38e152`).
- **CI Pipeline**: Otomasi GitHub Actions yang menguji lint, typecheck, unit/integration tests, dan build produksi pada setiap PR dan push (`db3f466`).

#### Autentikasi & Antarmuka Inti (Fase 1)

- **Autentikasi & RBAC**: Sesi JWT berbasis HTTP-only cookie (`wms_session`), verifikasi server-side `requireRole`, rate limiting percobaan login (maks. 5 gagal per IP/email per 15 menit), serta demo switcher (`6ee3748`).
- **Layout Dashboard**: `AppShell` modern dan responsif, sidebar dinamis tersaring otomatis per role pengguna, topbar dengan active warehouse switcher, dan komponen data tabel generik `DataTable` (`d86d91f`).
- **Master Data**:
  - CRUD Kategori, Supplier, dan Customer dengan kebijakan soft deactivation (`isActive = false`) per aturan BR-31 dan BR-32 (`a7a958f`).
  - CRUD Produk dengan validasi keunikan SKU dan barcode, pelacakan kedaluwarsa (`trackExpiry`), `costPrice`, dan `minStock` (`3f5d69e`).
  - CRUD Gudang dan Lokasi Rak dengan validasi regex kode pola `/^[A-Z]-\d{2}-\d{2}$/` (BR-33) dan dukungan status freeze untuk opname (BR-22) (`926eea4`).

#### Mesin Stok & Transaksi Dokumen

- **Core Stock Engine (`applyStockMovement`)**: Mutasi ACID terpadu dengan row-level locking (`SELECT ... FOR UPDATE`), pencegahan stok negatif tanpa toleransi (BR-01, BR-17), dan pencatatan buku besar append-only `stock_movements` dengan saldo berjalan `balanceAfter` (BR-29, BR-30) (`1bdfd6c`).
- **Barang Masuk / Goods Receipt (GR)**: Penomoran urut dokumen otomatis format `GR-YYYY-XXXX` (BR-15), alur status `DRAFT -> RECEIVED` atau `CANCELLED`, form interaktif `LineItemsEditor`, dan penerimaan barang atomik (`c1fa04b`).
- **Barang Keluar / Delivery Order (DO)**: Penomoran urut otomatis `DO-2026-XXXX`, alokasi otomatis FEFO untuk batch belum kedaluwarsa (BR-08), penolakan seluruh dokumen jika stok tidak mencukupi (BR-17), dan alur status `DRAFT -> SHIPPED` atau `CANCELLED` (`10a4f38`).
- **Kartu Stok & Audit Konsistensi**: Tampilan ringkasan stok per produk dan lokasi rak, buku besar kartu stok pergerakan barang, serta endpoint/service audit `verifyStockConsistency` yang memvalidasi invarian matematis `SUM(stock_movements) == current_stock` (`9e1992b`).
- **Dashboard Ringkasan Operasional**: Indikator KPI nilai persediaan barang, total unit, peringatan stok menipis, peringatan dokumen draft tertunda, grafik pergerakan barang masuk vs keluar harian (7 hari / 30 hari), dan tabel transaksi terkini real-time (`5926f6b`).
- **Pengujian E2E Alur Utama**: Test suite integrasi menyeluruh yang memvalidasi siklus penuh `Login -> GR -> DO -> Cek Kartu Stok & Konsistensi Invarian` serta pengujian batas kegagalan stok dan isolasi hak akses (`88ebc50`).

### Keamanan (Security)

- Password pengguna di-hash menggunakan `bcryptjs` (salt rounds 10).
- Penegakan matriks hak akses server-side di setiap endpoint REST API.
- Proteksi terhadap race condition transaksi konkuren lewat kunci baris eksplisit PostgreSQL.
- Pencegahan impor langsung Prisma Client pada komponen UI dan Route Handlers melalui ESLint `no-restricted-imports`.
