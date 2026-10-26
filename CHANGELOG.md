# Changelog

Semua perubahan penting pada proyek **WMS (Sistem Manajemen Gudang)** didokumentasikan dalam berkas ini.
Format penulisan mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan menganut [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
