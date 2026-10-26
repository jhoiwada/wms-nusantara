# Database

PostgreSQL 15+. Sumber kebenaran skema awal: `db/wms_schema_seed_postgres.sql` (14 tabel). Dokumen ini menjelaskan model konsepnya; **jika nama tabel di file SQL berbeda, ikuti file SQL dan perbarui dokumen ini.**

## Tabel

| Kelompok   | Tabel                                                                         |
| ---------- | ----------------------------------------------------------------------------- |
| Akses      | `users`                                                                       |
| Master     | `categories`, `products`, `suppliers`, `customers`, `warehouses`, `locations` |
| Stok       | `stock` (stok per produk + lokasi + batch), `stock_movements` (kartu stok)    |
| Penerimaan | `goods_receipts`, `goods_receipt_items`                                       |
| Pengiriman | `delivery_orders`, `delivery_order_items`                                     |
| Opname     | `stock_opnames`, `stock_opname_items`                                         |

Untuk Tahap 2 mungkin perlu tambahan: `batches` (nomor batch, expired), `stock_transfers`, `document_counters`, `audit_logs`.

## Relasi utama

```
categories 1─* products
warehouses 1─* locations
products   1─* stock *─1 locations
products   1─* stock_movements *─1 users
suppliers  1─* goods_receipts 1─* goods_receipt_items *─1 products
customers  1─* delivery_orders 1─* delivery_order_items *─1 products
warehouses 1─* stock_opnames 1─* stock_opname_items *─1 products
```

## Aturan data

- **Uang:** `NUMERIC(14,2)`, jangan `FLOAT`. Di Prisma gunakan `Decimal`.
- **Waktu:** `TIMESTAMPTZ`, simpan UTC, tampilkan di zona Asia/Jakarta.
- **Primary key:** `BIGINT GENERATED ALWAYS AS IDENTITY` atau UUID; pilih satu dan konsisten.
- **Kolom audit:** `created_at`, `updated_at`, dan `created_by` pada tabel transaksi.
- **Soft delete master data:** kolom `is_active`. Produk yang sudah punya riwayat tidak boleh dihapus permanen.

## Constraint penting

```sql
ALTER TABLE stock ADD CONSTRAINT stock_qty_non_negative CHECK (quantity >= 0);
ALTER TABLE products ADD CONSTRAINT products_sku_unique UNIQUE (sku);
ALTER TABLE products ADD CONSTRAINT products_barcode_unique UNIQUE (barcode);
ALTER TABLE stock ADD CONSTRAINT stock_unique_row UNIQUE (product_id, location_id, batch_id);
ALTER TABLE stock_movements ADD CONSTRAINT movement_qty_positive CHECK (quantity > 0);
```

Pergerakan stok:

- `movement_type`: `IN`, `OUT`, `ADJUST_IN`, `ADJUST_OUT`, `TRANSFER_IN`, `TRANSFER_OUT`
- Kolom: `product_id`, `location_id`, `batch_id`, `quantity`, `balance_after`, `ref_type`, `ref_id`, `ref_no`, `user_id`, `created_at`
- Cabut hak `UPDATE` dan `DELETE` pada tabel ini untuk role aplikasi (atau pasang trigger penolak).

## Indeks yang disarankan

- `stock (product_id)`, `stock (location_id)`
- `stock_movements (product_id, created_at DESC)` untuk kartu stok
- `stock (batch_id)` dan `batches (expiry_date)` untuk peringatan expired
- `locations (warehouse_id, code)` unik
- Kolom status pada dokumen: `goods_receipts (status, created_at)`

## Status dokumen

| Dokumen        | Status                                          |
| -------------- | ----------------------------------------------- |
| Goods Receipt  | `DRAFT` → `RECEIVED` / `CANCELLED`              |
| Delivery Order | `DRAFT` → `SHIPPED` / `CANCELLED`               |
| Stock Opname   | `DRAFT` → `SUBMITTED` → `APPROVED` / `REJECTED` |

Dokumen yang sudah final tidak bisa diedit.

## Migrasi dan seed

- Prisma Migrate untuk perubahan skema: `npx prisma migrate dev` (lokal), `npx prisma migrate deploy` (CI/produksi).
- Jangan ubah file migrasi yang sudah di-commit; buat migrasi baru.
- Jika memulai dari file SQL: `npx prisma db pull`, rapikan nama model, lalu buat migrasi baseline.
- Seed: akun demo per role dan data contoh dari file SQL.

## Query penting

Kartu stok:

```sql
SELECT created_at, movement_type, ref_no, quantity, balance_after, u.name
FROM stock_movements m JOIN users u ON u.id = m.user_id
WHERE m.product_id = $1 ORDER BY m.created_at DESC;
```

Stok menipis: jumlah stok semua lokasi per produk lebih kecil dari `min_stock`.
Hampir expired: batch dengan `expiry_date <= now() + interval '30 days'` dan stok > 0.
