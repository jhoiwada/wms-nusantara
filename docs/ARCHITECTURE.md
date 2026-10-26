# Arsitektur

## Gambaran

Monolit Next.js (App Router). Satu repo, satu deploy. UI dan API hidup di aplikasi yang sama; database PostgreSQL terpisah.

```
Browser
  │
  ▼
Next.js
  ├─ app/(auth)/…        halaman login
  ├─ app/(dashboard)/…   halaman terproteksi (Server Components)
  └─ app/api/v1/…        Route Handlers (REST)
        │
        ▼
   Service layer   ← aturan bisnis + transaksi
        │
        ▼
   Prisma Client   ← akses data
        │
        ▼
   PostgreSQL (Neon/Supabase)
```

## Lapisan dan tanggung jawab

| Lapisan                       | Boleh                                                                    | Tidak boleh                          |
| ----------------------------- | ------------------------------------------------------------------------ | ------------------------------------ |
| Route Handler / Server Action | Validasi input (Zod), cek sesi dan role, panggil service, bentuk respons | Query Prisma langsung, aturan bisnis |
| Service                       | Aturan bisnis, `prisma.$transaction`, melempar `AppError`                | Mengakses `Request`/`Response`, UI   |
| Repository (opsional)         | Query Prisma yang dipakai ulang                                          | Aturan bisnis                        |
| Komponen UI                   | Menampilkan data, memanggil API                                          | Logika stok                          |

Alasan: aturan stok hanya ada di satu tempat (service), sehingga tidak bisa dilewati dari halaman atau endpoint lain.

## Struktur folder

```
src/
├─ app/
│  ├─ (auth)/login/
│  ├─ (dashboard)/
│  │  ├─ dashboard/ products/ categories/ suppliers/ customers/
│  │  ├─ warehouses/ goods-receipts/ delivery-orders/
│  │  ├─ stock/ stock-card/ stock-opname/ reports/ users/
│  └─ api/v1/…
├─ components/
│  ├─ ui/            komponen dasar (Button, Input, Table, Dialog)
│  └─ features/      komponen per fitur
├─ server/
│  ├─ services/      goods-receipt.service.ts, delivery-order.service.ts, …
│  ├─ repositories/
│  ├─ auth/          konfigurasi Auth.js, guard role
│  ├─ db.ts          singleton Prisma
│  └─ errors.ts      AppError dan kode error
├─ lib/              util murni (format tanggal, rupiah, penomoran dokumen)
├─ schemas/          skema Zod bersama (client dan server)
└─ types/
prisma/  schema.prisma  migrations/  seed.ts
db/      wms_schema_seed_postgres.sql
```

## Alur transaksi stok

Semua mutasi stok melewati satu fungsi inti, `applyStockMovement`, agar aturan tidak terduplikasi.

```
postGoodsReceipt(id, userId)
 └─ prisma.$transaction
     1. kunci dokumen (status harus DRAFT)
     2. untuk setiap item:
        a. upsert baris stok (produk + lokasi + batch)
        b. tambah quantity
        c. insert stock_movements (type=IN, ref=GR-…, user, waktu)
     3. ubah status dokumen → RECEIVED
     (gagal di mana pun → rollback semua)

postDeliveryOrder(id, userId)
 └─ prisma.$transaction
     1. kunci baris stok: SELECT … FOR UPDATE
     2. jika quantity < diminta → throw AppError('INSUFFICIENT_STOCK')
     3. kurangi stok, insert stock_movements (type=OUT)
     4. ubah status → SHIPPED
```

Prinsip:

- **Kunci baris** (`FOR UPDATE` lewat `$queryRaw`) mencegah dua pengiriman bersamaan membuat stok minus.
- **Constraint `CHECK (quantity >= 0)`** di database menjadi pengaman terakhir.
- **`stock_movements` hanya ditambah, tidak pernah diubah atau dihapus.** Koreksi dilakukan dengan pergerakan baru.
- Stok sistem = hasil jumlah pergerakan; tabel stok adalah salinan cepat yang harus selalu cocok.

## Penomoran dokumen

Format `GR-2026-0001`, `DO-2026-0001`. Nomor urut diambil dari tabel counter di dalam transaksi yang sama agar tidak ada nomor ganda.

## Keputusan desain

| Keputusan     | Pilihan                                                      | Alasan                                                      |
| ------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| Gaya API      | REST di Route Handlers                                       | Mudah diuji dan didokumentasikan untuk portofolio           |
| ORM           | Prisma                                                       | Migrasi dan tipe otomatis; raw SQL tetap bisa untuk locking |
| Sesi          | Auth.js, JWT                                                 | Cocok dengan Vercel serverless                              |
| Validasi      | Zod di server, skema dipakai ulang di form                   | Satu sumber kebenaran                                       |
| Tampilan data | Server Components untuk daftar, Client Components untuk form | Muat awal cepat                                             |
