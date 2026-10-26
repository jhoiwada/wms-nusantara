# WMS: Sistem Manajemen Gudang

Aplikasi web untuk mencatat dan mengontrol barang di gudang: barang masuk, barang keluar, sisa stok, dan lokasi rak.

## Masalah yang diselesaikan

Banyak gudang kecil dan menengah masih memakai Excel atau buku catatan, sehingga:

- stok sering tidak cocok dengan kondisi fisik
- barang sulit dicari
- barang kedaluwarsa terlewat
- tidak ada riwayat siapa mengubah apa

## Studi kasus

Distributor barang (makanan-minuman, elektronik kecil, alat tulis, perlengkapan rumah) dengan 2 gudang: **Jakarta** dan **Bekasi**. Data contoh ada di `db/wms_schema_seed_postgres.sql`.

## Role pengguna

| Role    | Tugas                   | Hak akses                                      |
| ------- | ----------------------- | ---------------------------------------------- |
| Admin   | Mengelola sistem        | Semua fitur, termasuk kelola user              |
| Manager | Memantau dan menyetujui | Semua laporan, setujui penyesuaian stok        |
| Staff   | Kerja harian            | Barang masuk/keluar, opname, tanpa kelola user |
| Viewer  | Hanya melihat           | Lihat stok dan laporan                         |

## Fitur

**Tahap 1 (inti)**

- [ ] Login dan pembatasan akses per role
- [ ] Master data: produk, kategori, supplier, customer, gudang, lokasi rak
- [ ] Barang masuk (GR) dan barang keluar (DO); keluar ditolak jika stok tidak cukup
- [ ] Kartu stok
- [ ] Dashboard

**Tahap 2 (pembeda WMS)**

- [ ] Lokasi rak format Zona-Rak-Level (contoh `A-01-02`)
- [ ] Batch dan tanggal kedaluwarsa, dengan peringatan
- [ ] Stock opname dengan persetujuan manager
- [ ] Transfer stok antar gudang atau antar rak

**Tahap 3 (nilai tambah)**

- [ ] Scan barcode lewat kamera HP
- [ ] Cetak label barcode
- [ ] Export Excel/PDF
- [ ] Audit log dan alur persetujuan
- [ ] Denah gudang interaktif

## Tech stack

Next.js (App Router) + TypeScript, Tailwind CSS, Prisma, PostgreSQL, Auth.js, Zod. Deploy di Vercel dan Neon (atau Supabase).

## Aturan terpenting

Setiap perubahan stok dan pencatatan riwayatnya terjadi dalam **satu transaksi database**, sehingga data tidak bisa setengah tersimpan atau menjadi minus.

## Mulai cepat

```bash
git clone <repo-url> && cd wms
cp .env.example .env        # isi nilainya, lihat docs/ENVIRONMENT.md
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Akun demo: lihat bagian Seed di `docs/ENVIRONMENT.md`.

## Dokumentasi

| Dokumen                              | Isi                                          |
| ------------------------------------ | -------------------------------------------- |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Struktur lapisan, folder, alur transaksi     |
| [DATABASE](docs/DATABASE.md)         | Tabel, relasi, constraint, indeks            |
| [API](docs/API.md)                   | Endpoint, format respons, error              |
| [COMPONENTS](docs/COMPONENTS.md)     | Komponen UI dan halaman                      |
| [CONVENTIONS](docs/CONVENTIONS.md)   | Aturan penulisan kode dan Git                |
| [ENVIRONMENT](docs/ENVIRONMENT.md)   | Variabel lingkungan dan setup                |
| [SECURITY](docs/SECURITY.md)         | Autentikasi, RBAC, perlindungan data         |
| [PIPELINE](docs/PIPELINE.md)         | CI/CD dan deploy                             |
| [MCP](docs/MCP.md)                   | Konfigurasi MCP untuk pengembangan dengan AI |
| [LINTING](docs/LINTING.md)           | ESLint, Prettier, TypeScript, git hooks      |
