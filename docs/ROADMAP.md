# Roadmap

Cara pakai: kerjakan **satu tugas per sesi**, dari atas ke bawah. Tugas dianggap selesai hanya jika semua "Selesai bila" terpenuhi dan `lint`, `typecheck`, `test` hijau. Centang kotak dalam PR yang sama.

## Status saat ini

- Terakhir diperbarui: 2026-10-27
- Sedang dikerjakan: Fase 2: T2.3 Stock opname (Snapshot, pembekuan lokasi, submit, approve/reject - BR-20 s.d. BR-26)
- Aturan bisnis: sudah disetujui (`docs/BUSINESS_RULES.md`)
- Sinkronisasi: `docs/DATABASE.md` sudah 100% cocok dengan `schema.prisma` dan `db/wms_schema_seed_postgres.sql`.

---

## Fase 0: Fondasi

- [x] **T0.1 Inisialisasi proyek.** Next.js + TS strict + Tailwind, struktur folder sesuai `ARCHITECTURE.md`, alias `@/*`.
      Selesai bila: `npm run dev`, `build`, `lint`, `typecheck` berjalan; halaman awal tampil.
- [x] **T0.2 Lint, format, hooks.** Sesuai `LINTING.md` (ESLint, Prettier, Husky, commitlint).
      Selesai bila: commit dengan pesan salah ditolak; aturan larangan impor Prisma di komponen aktif.
- [x] **T0.3 Database dan Prisma.** Docker Postgres, `schema.prisma` dari file SQL, migrasi baseline, seed (akun demo + data contoh).
      Selesai bila: `migrate dev` dan `db seed` berjalan dari database kosong; `DATABASE.md` sudah cocok dengan skema nyata.
- [x] **T0.4 Env dan error dasar.** `src/env.ts` (Zod), `db.ts` singleton, `AppError`, `handleError`, logger.
      Selesai bila: aplikasi gagal start jika env hilang; ada tes untuk `handleError`.
- [x] **T0.5 CI.** Workflow dari `PIPELINE.md`.
      Selesai bila: PR menjalankan lint, typecheck, test, build di GitHub Actions.

## Fase 1: Inti (Tahap 1)

- [x] **T1.1 Autentikasi dan RBAC.** Login/logout, `requireRole`, middleware pengalihan, rate limit login.
      Selesai bila: tes menunjukkan tiap role mendapat 200/403 sesuai matriks di `SECURITY.md`.
- [x] **T1.2 Layout dashboard.** `AppShell`, sidebar tersaring per role, komponen UI dasar, `DataTable`.
- [x] **T1.3 Master: kategori, supplier, customer.** CRUD + nonaktifkan (BR-31, BR-32).
- [x] **T1.4 Master: produk.** CRUD, SKU/barcode unik, `min_stock`, `track_expiry`, `cost_price`.
- [x] **T1.5 Master: gudang dan lokasi.** Validasi pola kode (BR-33).
- [x] **T1.6 `applyStockMovement` + tes.** Inti semua mutasi stok.
      Selesai bila: tes membuktikan stok tidak bisa minus, dua transaksi bersamaan tidak melewati batas, dan rollback saat gagal di tengah (BR-01, BR-12, BR-17).
- [x] **T1.7 Barang masuk (GR).** Penomoran dokumen, draft, edit, terima, batal; UI daftar dan form `LineItemsEditor`.
- [x] **T1.8 Barang keluar (DO).** Draft, kirim dengan pemeriksaan stok, penolakan dengan pesan jelas; UI.
- [x] **T1.9 Stok dan kartu stok.** Tampilan per produk dan per lokasi; kartu stok dengan saldo berjalan.
      Selesai bila: jumlah seluruh pergerakan per produk sama dengan stok di tabel stok (ada tes konsistensi).
- [x] **T1.10 Dashboard.** Ringkasan, stok menipis, nilai persediaan, transaksi terbaru, grafik masuk vs keluar.
- [x] **T1.11 E2E alur utama.** Login → GR → DO → cek kartu stok.
- [x] **Rilis v0.1.0** Dokumen rilis di `CHANGELOG.md`, `README.md` enterprise, dan Git tag `v0.1.0`.

## Fase 2: Pembeda WMS (Tahap 2)

- [x] **T2.1 Batch dan kedaluwarsa.** Input di GR, FEFO di DO (BR-06 s.d. BR-09).
- [x] **T2.2 Peringatan expired.** Endpoint `/stock/expiring`, `ExpiryBadge`, panel di dashboard.
- [x] **T2.3 Stock opname.** Snapshot, pembekuan lokasi, submit, approve/reject, penyesuaian (BR-20 s.d. BR-26).
- [x] **T2.4 Penyesuaian stok manual.** Manager/Admin, wajib alasan (BR-26).
- [x] **T2.5 Transfer stok.** Antar rak dan antar gudang (BR-27, BR-28).
- [x] **Rilis v0.2.0.**

## Fase 3: Nilai tambah (Tahap 3, pilih sesuai waktu)

- [x] **T3.1 Export Excel/PDF** laporan pergerakan dan nilai persediaan.
- [x] **T3.2 Audit log** perubahan master data dan aksi sensitif.
- [x] **T3.3 Cetak label barcode.**
- [x] **T3.4 Scan barcode** lewat kamera HP di form GR/DO.
- [x] **T3.5 Denah gudang interaktif.**
- [ ] **T3.6 Retur dari customer** (jika diputuskan).

## Penutup portofolio

- [ ] README: masalah, fitur, ERD, screenshot, tautan demo, daftar fitur buatan sendiri
- [ ] Data demo dan reset terjadwal
- [ ] Daftar periksa keamanan di `SECURITY.md` terpenuhi
