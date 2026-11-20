# Panduan Deployment Produksi & Hosting Publik — WMS PT Nusantara Logistik Distribusi

Dokumen ini adalah panduan komprehensif untuk mempublikasikan aplikasi **Warehouse Management System (WMS)** ke layanan hosting publik agar dapat diakses oleh recruiter, klien, dan komunitas secara aman dan stabil.

---

## 🎯 Pilihan Arsitektur Hosting

| Platform                                      | Database                        | Biaya                | Keunggulan                                                                |
| :-------------------------------------------- | :------------------------------ | :------------------- | :------------------------------------------------------------------------ |
| **Vercel + Neon** _(Sangat Direkomendasikan)_ | Neon.tech (Serverless Postgres) | **Gratis**           | Performa CDN global tercepat, zero-server management, Vercel Cron bawaan. |
| **Vercel + Supabase**                         | Supabase PostgreSQL             | **Gratis**           | Antarmuka GUI database yang sangat lengkap, backup otomatis.              |
| **Railway**                                   | Railway Managed PostgreSQL      | Freemium / Pay-as-go | Full containerized, deploy 1-klik untuk database dan Next.js.             |
| **VPS (Ubuntu / Docker)**                     | PostgreSQL lokal di Docker      | \$4 - \$6 / bulan    | Kontrol penuh sistem operasi, tanpa batas serverless timeout.             |

---

## 🚀 Opsi 1: Vercel + Neon.tech (Paling Praktis & Gratis)

### Langkah 1: Buat Database Serverless di Neon.tech

1. Buka [https://neon.tech](https://neon.tech) dan login menggunakan akun GitHub Anda.
2. Buat proyek baru (misal: `wms-production`, pilih region terdekat: `Singapore (ap-southeast-1)`).
3. Salin **Connection String** yang disediakan, contoh:
   ```text
   postgresql://wms_owner:xxxxxx@ep-sample-123.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

### Langkah 2: Dorong (_Push_) Skema & Inisialisasi Data

Dari terminal lokal proyek ini, jalankan migrasi ke database Neon Anda:

```bash
# Set connection string database Neon di terminal lokal sementara
export DATABASE_URL="postgresql://wms_owner:xxxxxx@ep-sample-123.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
export DIRECT_URL="$DATABASE_URL"

# Push struktur tabel Prisma ke database produksi
npx prisma db push

# Suntikkan dataset resmi FMCG & akun pejabat operasional
npx tsx scripts/reset-demo.ts
```

### Langkah 3: Deploy ke Vercel

1. Pastikan kode Anda sudah di-_commit_ dan di-_push_ ke repository GitHub Anda:
   ```bash
   git add .
   git commit -m "feat: production hardening & universal deployment kit"
   git push origin main
   ```
2. Buka [https://vercel.com](https://vercel.com) $\rightarrow$ Klik **"Add New Project"** $\rightarrow$ Impor repositori GitHub Anda.
3. Pada bagian **Environment Variables**, tambahkan variabel berikut:
   - `DATABASE_URL`: `postgresql://wms_owner:xxxxxx@.../neondb?sslmode=require`
   - `DIRECT_URL`: `postgresql://wms_owner:xxxxxx@.../neondb?sslmode=require`
   - `AUTH_SECRET`: Generate 32 karakter acak (di Linux/Mac jalankan `openssl rand -base64 32`).
   - `AUTH_URL`: Domain Vercel Anda (misal `https://wms-nusantara.vercel.app`).
   - `CRON_SECRET`: String acak aman untuk melindungi cron pemulihan otomatis (misal `nld-cron-secret-production-2026`).
   - `SEED_DEMO_PASSWORD`: `Juntak12345!`
4. Klik tombol **Deploy**. Vercel akan otomatis membaca berkas `vercel.json` dan menjadwalkan Cron Job pemulihan berkala setiap 4 jam.

---

## 🐳 Opsi 2: Railway (Containerized Docker)

1. Buka [https://railway.app](https://railway.app) dan buat proyek baru.
2. Tambahkan layanan **PostgreSQL** dari menu template Railway.
3. Tambahkan layanan kedua: **GitHub Repo** Anda.
4. Railway akan mendeteksi `Dockerfile` yang telah kita siapkan.
5. Tambahkan variabel lingkungan yang merujuk ke database Railway (`${{Postgres.DATABASE_URL}}`).
6. Jalankan build dan aktifkan Public Domain.

---

## 🛡️ Fitur Keamanan Publik yang Telah Aktif

Aplikasi WMS ini telah dilengkapi proteksi tingkat militer untuk portofolio publik:

1. **Immutable Core Accounts**: Akun resmi (`admin@nldlogistics.co.id`, `manager`, `staff`, `auditor`) dikunci dari pengubahan sandi dan penonaktifan.
2. **Rate Limiting**: Mitigasi brute force maksimal 5 kali percobaan gagal per IP/email.
3. **HTTP Security Headers**: HSTS, CSP, X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff, Referrer-Policy.
4. **Audit Logging Real-Time**: IP address dan peramban pengunjung otomatis terekam pada tabel `AuditLog`.
5. **Anti-Storage Flooding Quota**: Maksimal 100 dokumen aktif per tabel transaksi sebelum siklus pemulihan otomatis, mencegah pembobolan batas penyimpanan hosting gratis.
6. **Health Check Gateway**: Endpoint publik `GET /api/health` untuk pemantauan uptime server tanpa memerlukan autentikasi sesi.
