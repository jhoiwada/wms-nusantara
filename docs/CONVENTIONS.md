# Konvensi

## Bahasa

- Kode, nama variabel, nama tabel, commit: **Inggris**.
- Teks yang dilihat pengguna: **Indonesia**, disimpan di satu tempat agar mudah diubah.
- Dokumentasi: Indonesia.

## Penamaan

| Hal              | Gaya                                    | Contoh                     |
| ---------------- | --------------------------------------- | -------------------------- |
| File             | `kebab-case`                            | `goods-receipt.service.ts` |
| Komponen React   | `PascalCase`                            | `LineItemsEditor`          |
| Variabel, fungsi | `camelCase`                             | `receiveGoodsReceipt`      |
| Konstanta        | `UPPER_SNAKE_CASE`                      | `LOW_STOCK_DAYS`           |
| Tipe, interface  | `PascalCase`, tanpa awalan `I`          | `StockMovement`            |
| Tabel DB         | `snake_case`, jamak                     | `stock_movements`          |
| Kolom DB         | `snake_case`                            | `expiry_date`              |
| Model Prisma     | `PascalCase`, tunggal, `@@map` ke tabel | `StockMovement`            |
| Kode lokasi      | `Zona-Rak-Level`                        | `A-01-02`                  |
| Nomor dokumen    | `PREFIX-TAHUN-URUT`                     | `GR-2026-0001`             |

## TypeScript

- `strict: true`. Tanpa `any`; gunakan `unknown` lalu persempit.
- Tipe input/output diturunkan dari Zod: `type X = z.infer<typeof xSchema>`.
- Fungsi service menerima objek parameter bila lebih dari dua argumen.
- Jangan gunakan `enum` TypeScript; pakai enum Prisma atau union string.

## Aturan kode

1. Aturan bisnis hanya di `server/services`. Handler dan komponen tidak menghitung stok.
2. Setiap perubahan stok lewat `applyStockMovement` di dalam `prisma.$transaction`.
3. Validasi input di batas sistem (handler), bukan di tengah service.
4. Lempar `AppError(code, message)`; jangan lempar string atau `Error` polos untuk kesalahan yang dapat diprediksi.
5. Jangan menelan error dengan `catch {}` kosong.
6. Tanpa `console.log` di commit; gunakan logger (`pino`).
7. Uang dan jumlah memakai `Decimal`/integer, bukan `number` desimal untuk hitungan uang.
8. Tanggal disimpan UTC; format tampilan lewat util di `lib/format.ts`.
9. Fungsi pendek dan satu tujuan. Jika perlu komentar untuk menjelaskan _apa_, ganti nama; komentar untuk menjelaskan _mengapa_.

## Struktur import

Urutan: library eksternal, alias `@/`, relatif. Gunakan alias `@/*` → `src/*`. Hindari impor melingkar antar service.

## Git

- Branch: `main` (selalu bisa deploy), cabang kerja `feat/…`, `fix/…`, `chore/…`, `docs/…`.
- Commit mengikuti **Conventional Commits**:
  ```
  feat(stock): reject delivery when stock is insufficient
  fix(auth): redirect to login on expired session
  docs: add ERD to README
  ```
  Tipe: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`.
- Pull request kecil, satu topik, ada deskripsi dan screenshot untuk perubahan UI.
- Tidak ada commit langsung ke `main` setelah CI aktif.

## Pengujian

- **Unit:** `lib/` dan fungsi murni (Vitest).
- **Integrasi:** service stok terhadap database uji sungguhan (bukan mock), terutama kasus: stok kurang, dua pengiriman bersamaan, rollback saat gagal di tengah.
- **E2E:** alur login → barang masuk → barang keluar → cek kartu stok (Playwright).
- Nama tes menjelaskan perilaku: `rejects delivery when stock is insufficient`.

## Definition of Done sebuah fitur

- [ ] Berjalan untuk semua role sesuai matriks akses
- [ ] Validasi dan pesan error jelas
- [ ] Lint, typecheck, dan tes hijau
- [ ] Ada tes untuk aturan bisnisnya
- [ ] README/docs diperbarui bila perlu
