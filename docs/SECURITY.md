# Keamanan

## Autentikasi
- Auth.js dengan Credentials provider, sesi JWT dalam cookie `HttpOnly`, `Secure`, `SameSite=Lax`.
- Password di-hash dengan **argon2id** (atau bcrypt cost ≥ 12). Tidak pernah disimpan atau di-log dalam bentuk asli.
- Kebijakan password: minimal 10 karakter, tidak boleh sama dengan email.
- Masa berlaku sesi 8 jam; ubah role atau nonaktifkan user harus langsung berlaku (cek `is_active` dan role dari database pada aksi sensitif).
- Pesan login gagal selalu sama ("Email atau password salah") agar akun tidak bisa ditebak.
- Pembatasan percobaan login (mis. 5 kali per 15 menit per IP + email), misalnya dengan Upstash Ratelimit.

## Otorisasi (RBAC)
Pemeriksaan dilakukan **di server**, di setiap handler dan Server Action, lewat `requireRole([...])`. Menyembunyikan tombol di UI bukan keamanan.

| Aksi | Admin | Manager | Staff | Viewer |
|---|:-:|:-:|:-:|:-:|
| Lihat stok, kartu stok, laporan | ✔ | ✔ | ✔ | ✔ |
| Ubah master data | ✔ | ✔ | ✘ | ✘ |
| Buat dan posting GR/DO | ✔ | ✔ | ✔ | ✘ |
| Batalkan dokumen | ✔ | ✔ | ✘ | ✘ |
| Isi hitung opname | ✔ | ✔ | ✔ | ✘ |
| Setujui penyesuaian opname | ✔ | ✔ | ✘ | ✘ |
| Export laporan | ✔ | ✔ | ✘ | ✘ |
| Kelola pengguna | ✔ | ✘ | ✘ | ✘ |

Ditambah: pemisahan tugas. Penyusun opname tidak boleh menyetujui opname miliknya sendiri.

`middleware.ts` hanya mengalihkan pengguna yang belum login; keputusan akses akhir tetap di handler.

## Validasi dan injeksi
- Semua input dari luar divalidasi Zod (tipe, panjang, rentang, enum).
- Prisma memakai query berparameter. Untuk `$queryRaw` gunakan tagged template (`Prisma.sql`), **jangan pernah** menyambung string.
- Output React otomatis di-escape; hindari `dangerouslySetInnerHTML`.
- Pencarian: batasi panjang dan escape karakter `%` `_` untuk `ILIKE`.

## Integritas data
- Transaksi tunggal untuk setiap mutasi stok; kunci baris `FOR UPDATE`.
- Constraint `CHECK (quantity >= 0)` dan unik di database.
- `stock_movements` tidak bisa diubah/dihapus oleh role aplikasi.
- Idempotency-Key pada POST transaksi.
- Audit log: siapa, apa, kapan, nilai sebelum dan sesudah (Tahap 3).

## Rahasia
- Tidak ada rahasia di repo. `.env*` ada di `.gitignore`; hanya `.env.example` (tanpa nilai nyata) yang di-commit.
- Aktifkan secret scanning GitHub dan jalankan `gitleaks` di CI.
- Jika rahasia pernah ter-commit, anggap bocor: ganti nilainya, bukan hanya menghapus commit.
- Akun database aplikasi memakai hak minimum (tanpa `DROP`, tanpa `SUPERUSER`).

## Header dan transport
Atur di `next.config.ts`:
- `Strict-Transport-Security`
- `Content-Security-Policy` (mulai dari mode report-only, lalu perketat)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY` (atau `frame-ancestors 'none'`)

HTTPS wajib; Vercel menyediakannya otomatis.

## CSRF dan CORS
- Cookie `SameSite=Lax` dan Server Actions bawaan Next.js sudah memeriksa origin. Untuk Route Handler yang mengubah data, periksa header `Origin` sama dengan `AUTH_URL`.
- API tidak dibuka ke origin lain; jangan memakai `Access-Control-Allow-Origin: *`.

## Logging dan privasi
- Log tidak boleh memuat password, token, atau isi cookie.
- Pesan error ke klien umum; detail teknis hanya di log server.
- Data pribadi (nama/alamat customer, supplier) dibatasi sesuai kebutuhan; sediakan cara menghapus/menganonimkan bila diminta.

## Dependensi
- `npm audit` dan Dependabot aktif.
- Pasang versi lock (`package-lock.json`) dan gunakan `npm ci` di CI.

## Demo publik
- Akun demo hanya hak minimal dan data fiktif.
- Reset data demo terjadwal; nonaktifkan fitur kelola user pada demo bila perlu.
- Batasi laju agar demo tidak disalahgunakan.

## Daftar periksa sebelum publikasi
- [ ] Semua endpoint diuji dengan role yang salah (harus 403)
- [ ] Tidak ada `.env` atau kunci di riwayat Git
- [ ] Header keamanan aktif
- [ ] Rate limit login aktif
- [ ] Password demo bukan password yang dipakai di tempat lain
- [ ] `npm audit` tanpa temuan tinggi/kritis
