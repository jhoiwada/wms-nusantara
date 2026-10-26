# Environment

## Prasyarat

- Node.js 20 LTS atau lebih baru
- npm (atau pnpm, pilih satu dan konsisten)
- PostgreSQL 15+ (lokal via Docker, atau database Neon/Supabase)
- Git

## Variabel lingkungan

Salin `.env.example` menjadi `.env`. **`.env` tidak boleh di-commit.**

| Variabel             | Contoh                                    | Keterangan                                        |
| -------------------- | ----------------------------------------- | ------------------------------------------------- |
| `DATABASE_URL`       | `postgresql://wms:wms@localhost:5432/wms` | Koneksi aplikasi (pada Neon gunakan URL _pooled_) |
| `DIRECT_URL`         | `postgresql://…`                          | Koneksi langsung untuk migrasi Prisma             |
| `AUTH_SECRET`        | hasil `openssl rand -base64 32`           | Penanda tangan sesi                               |
| `AUTH_URL`           | `http://localhost:3000`                   | URL dasar aplikasi                                |
| `NODE_ENV`           | `development`                             |                                                   |
| `LOG_LEVEL`          | `info`                                    | `debug` hanya untuk lokal                         |
| `SEED_DEMO_PASSWORD` | (isi sendiri)                             | Password akun demo saat seed                      |

Semua variabel divalidasi saat startup di `src/env.ts` memakai Zod; aplikasi gagal start jika ada yang hilang.

## Database lokal dengan Docker

`docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: wms
      POSTGRES_PASSWORD: wms
      POSTGRES_DB: wms
    ports: ['5432:5432']
    volumes: [pgdata:/var/lib/postgresql/data]
volumes:
  pgdata:
```

```bash
docker compose up -d
```

## Setup

```bash
npm install
npx prisma migrate dev     # buat tabel
npx prisma db seed         # data contoh + akun demo
npm run dev                # http://localhost:3000
```

## Skrip npm

| Skrip             | Fungsi                      |
| ----------------- | --------------------------- |
| `dev`             | Server pengembangan         |
| `build` / `start` | Build dan jalankan produksi |
| `lint`            | ESLint                      |
| `format`          | Prettier                    |
| `typecheck`       | `tsc --noEmit`              |
| `test`            | Tes unit dan integrasi      |
| `test:e2e`        | Playwright                  |
| `db:migrate`      | `prisma migrate dev`        |
| `db:seed`         | `prisma db seed`            |
| `db:studio`       | `prisma studio`             |

## Akun demo (hasil seed)

| Role    | Email               |
| ------- | ------------------- |
| Admin   | `admin@demo.test`   |
| Manager | `manager@demo.test` |
| Staff   | `staff@demo.test`   |
| Viewer  | `viewer@demo.test`  |

Password dari `SEED_DEMO_PASSWORD`. Pada demo online, gunakan password khusus demo dan reset data secara berkala.

## Lingkungan

| Lingkungan | Aplikasi              | Database                                   |
| ---------- | --------------------- | ------------------------------------------ |
| Lokal      | `npm run dev`         | Docker                                     |
| Preview    | Vercel preview per PR | Cabang Neon per PR (atau database staging) |
| Produksi   | Vercel `main`         | Neon produksi                              |

## Variabel di Vercel

Isi di Project Settings → Environment Variables, terpisah untuk Preview dan Production. Jangan memakai `DATABASE_URL` produksi di Preview.
