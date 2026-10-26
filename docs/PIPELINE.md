# Pipeline CI/CD

## Alur

```
push / PR ─► GitHub Actions: install → lint → typecheck → test → build
                                  │
                  PR ─────────────┴─► Vercel Preview (+ cabang database)
                  merge ke main ───► migrate deploy → Vercel Production
```

## CI (`.github/workflows/ci.yml`)

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: wms
          POSTGRES_PASSWORD: wms
          POSTGRES_DB: wms_test
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U wms"
          --health-interval 5s --health-timeout 5s --health-retries 10
    env:
      DATABASE_URL: postgresql://wms:wms@localhost:5432/wms_test
      DIRECT_URL: postgresql://wms:wms@localhost:5432/wms_test
      AUTH_SECRET: ci-only-secret-not-for-production
      AUTH_URL: http://localhost:3000
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma migrate deploy
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build

  e2e:
    needs: check
    runs-on: ubuntu-latest
    # Playwright: jalankan setelah check lolos; opsional di awal proyek
```

Versi action di atas dapat berubah; gunakan versi mayor terbaru yang stabil.

## Aturan branch (GitHub → Settings → Branches)

- `main` terproteksi: wajib PR, wajib CI hijau, tanpa force-push.
- Squash merge agar riwayat bersih.

## Deploy

- **Vercel** terhubung ke repo: PR → Preview, `main` → Production.
- **Migrasi produksi:** jalankan `prisma migrate deploy` sebelum rilis baru aktif (langkah terpisah di workflow, atau skrip build). Jangan pernah memakai `migrate dev` atau `migrate reset` di produksi.
- **Database:** Neon mendukung cabang per PR; pakai itu untuk Preview agar tidak menyentuh data produksi.
- **Rollback:** Vercel bisa mengembalikan ke deployment sebelumnya; migrasi harus _backward compatible_ (tambah kolom dulu, hapus kolom di rilis berikutnya).

## Pemeriksaan tambahan (bertahap)

| Pemeriksaan      | Alat                                       | Kapan                   |
| ---------------- | ------------------------------------------ | ----------------------- |
| Audit dependensi | `npm audit --audit-level=high`, Dependabot | Tahap 1                 |
| Deteksi rahasia  | gitleaks                                   | Tahap 1                 |
| E2E              | Playwright                                 | Setelah alur GR/DO jadi |
| Cakupan tes      | Vitest coverage                            | Tahap 2                 |
| Analisis kode    | CodeQL                                     | Tahap 3                 |

## Rilis

Versi `v0.1.0` setelah Tahap 1, `v0.2.0` setelah Tahap 2, dst. Tag di Git dan ringkas perubahan di `CHANGELOG.md`.

## Backup

Neon menyediakan point-in-time restore pada paket tertentu; pada paket gratis lakukan `pg_dump` terjadwal (GitHub Actions cron) bila data penting.
