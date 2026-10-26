# WMS: panduan untuk asisten AI

Aplikasi web Sistem Manajemen Gudang (studi kasus: distributor dengan gudang Jakarta dan Bekasi). Pemilik proyek mengerjakan ini sendirian untuk portofolio; prioritasnya kode yang benar, rapi, dan bisa dijelaskan.

## Baca dulu sesuai tugas
| Tugas | Baca |
|---|---|
| Apa pun yang menyentuh stok, dokumen, opname | `docs/BUSINESS_RULES.md` (wajib) |
| Struktur kode, lapisan, transaksi | `docs/ARCHITECTURE.md` |
| Tabel, relasi, migrasi | `docs/DATABASE.md` dan `db/wms_schema_seed_postgres.sql` |
| Endpoint baru | `docs/API.md` |
| Komponen dan halaman | `docs/COMPONENTS.md` |
| Gaya kode, commit, tes | `docs/CONVENTIONS.md`, `docs/LINTING.md` |
| Login, role, rahasia | `docs/SECURITY.md` |
| Tugas berikutnya | `docs/ROADMAP.md` |

Jika dokumen bertentangan dengan kode atau skema database yang ada, **kode dan skema yang benar**. Beri tahu saya dan usulkan perbaikan dokumennya; jangan diam-diam memilih salah satu.

## Stack
Next.js (App Router) + TypeScript strict, Tailwind, Prisma, PostgreSQL, Auth.js, Zod, Vitest, Playwright.

## Aturan keras (jangan dilanggar)
1. Aturan bisnis hanya di `src/server/services`. Handler dan komponen tidak menghitung stok dan tidak memanggil Prisma langsung.
2. Setiap perubahan stok **wajib** lewat `applyStockMovement` di dalam satu `prisma.$transaction`. Stok tidak boleh minus.
3. `stock_movements` hanya ditambah. Jangan pernah UPDATE atau DELETE barisnya. Koreksi = pergerakan baru.
4. Cek peran di server (`requireRole`), bukan hanya menyembunyikan tombol.
5. Input dari luar divalidasi dengan Zod. Query mentah memakai `Prisma.sql`, tidak pernah menyambung string.
6. Jangan mengubah migrasi yang sudah ada; buat migrasi baru.
7. Jangan menyentuh `.env`, rahasia, atau database produksi. Jangan menjalankan `migrate reset`, `DROP`, atau `TRUNCATE`.
8. Uang memakai `Decimal`, bukan `number` desimal.

## Cara bekerja
- Kerjakan **satu tugas dari ROADMAP per sesi**. Jangan memperluas cakupan tanpa izin.
- Jika aturan bisnis belum tertulis atau ambigu, **tanya**; jangan menebak. Tambahkan jawabannya ke `BUSINESS_RULES.md`.
- Untuk logika stok, tulis tes dulu atau bersamaan: stok kurang, dua transaksi bersamaan, rollback saat gagal di tengah.
- Setelah selesai jalankan: `npm run lint && npm run typecheck && npm test`. Laporkan hasilnya apa adanya, termasuk yang gagal.
- Perbarui dokumen terkait dan centang tugas di `ROADMAP.md` dalam perubahan yang sama.

## Bahasa
Kode, nama variabel/tabel, dan commit dalam bahasa Inggris (Conventional Commits). Teks antarmuka dan dokumentasi dalam bahasa Indonesia.

## Perintah
```bash
npm run dev          # server lokal
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest
npx prisma migrate dev
npx prisma db seed
```
