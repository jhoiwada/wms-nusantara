# API

REST, prefix `/api/v1`, format JSON. Semua endpoint (kecuali login) butuh sesi yang valid.

## Format respons
Sukses:
```json
{ "data": { }, "meta": { "page": 1, "pageSize": 20, "total": 134 } }
```
`meta` hanya ada pada daftar.

Gagal:
```json
{ "error": { "code": "INSUFFICIENT_STOCK", "message": "Stok SKU-001 di A-01-02 tidak cukup", "details": [ ] } }
```

## Kode error
| HTTP | Code | Arti |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Input tidak lolos Zod; `details` berisi field |
| 401 | `UNAUTHENTICATED` | Belum login |
| 403 | `FORBIDDEN` | Role tidak punya akses |
| 404 | `NOT_FOUND` | Data tidak ada |
| 409 | `INSUFFICIENT_STOCK` | Stok tidak cukup |
| 409 | `INVALID_STATE` | Status dokumen tidak mengizinkan aksi ini |
| 409 | `DUPLICATE` | SKU/barcode/kode sudah dipakai |
| 500 | `INTERNAL_ERROR` | Kesalahan tak terduga (detail hanya di log) |

## Konvensi
- Daftar: `?page=1&pageSize=20&q=kata&sort=-createdAt`
- Filter: `?status=DRAFT&warehouseId=1`
- Aksi pada dokumen memakai sub-resource: `POST /goods-receipts/:id/receive`
- `POST` yang membuat transaksi stok menerima header `Idempotency-Key` agar klik ganda tidak menggandakan data.

## Endpoint
Peran: **A** Admin, **M** Manager, **S** Staff, **V** Viewer.

### Auth
| Method | Path | Keterangan |
|---|---|---|
| POST | `/auth/login` | Email + password |
| POST | `/auth/logout` | Akhiri sesi |
| GET | `/auth/me` | Profil dan role |

### Master data
Pola sama untuk `products`, `categories`, `suppliers`, `customers`, `warehouses`, `locations`.

| Method | Path | Peran |
|---|---|---|
| GET | `/products` | A M S V |
| GET | `/products/:id` | A M S V |
| POST | `/products` | A M |
| PATCH | `/products/:id` | A M |
| DELETE | `/products/:id` | A (nonaktifkan, bukan hapus) |

### Barang masuk
| Method | Path | Peran | Keterangan |
|---|---|---|---|
| GET | `/goods-receipts` | A M S V | Daftar |
| POST | `/goods-receipts` | A M S | Buat draft |
| GET | `/goods-receipts/:id` | A M S V | Detail + item |
| PATCH | `/goods-receipts/:id` | A M S | Edit saat DRAFT |
| POST | `/goods-receipts/:id/receive` | A M S | Stok bertambah |
| POST | `/goods-receipts/:id/cancel` | A M | Batalkan draft |

Contoh body `POST /goods-receipts`:
```json
{
  "supplierId": 3,
  "receivedAt": "2026-03-10",
  "items": [
    { "productId": 12, "locationId": 5, "quantity": 100, "batchNo": "B2603A", "expiryDate": "2027-03-01" }
  ]
}
```

### Barang keluar
| Method | Path | Peran |
|---|---|---|
| GET/POST | `/delivery-orders` | lihat A M S V, buat A M S |
| GET/PATCH | `/delivery-orders/:id` | |
| POST | `/delivery-orders/:id/ship` | A M S |
| POST | `/delivery-orders/:id/cancel` | A M |

### Stok
| Method | Path | Keterangan |
|---|---|---|
| GET | `/stock` | Per produk, `?groupBy=product\|location` |
| GET | `/stock/:productId/card` | Kartu stok, `?from=&to=` |
| GET | `/stock/low` | Di bawah stok minimum |
| GET | `/stock/expiring` | `?days=30` |

### Stock opname
| Method | Path | Peran |
|---|---|---|
| POST | `/stock-opnames` | A M S (snapshot stok sistem) |
| PATCH | `/stock-opnames/:id` | A M S (isi hitung fisik) |
| POST | `/stock-opnames/:id/submit` | A M S |
| POST | `/stock-opnames/:id/approve` | A M |
| POST | `/stock-opnames/:id/reject` | A M |

### Transfer (Tahap 2)
`POST /stock-transfers`, `POST /stock-transfers/:id/execute`

### Dashboard dan laporan
| Method | Path |
|---|---|
| GET | `/dashboard/summary` |
| GET | `/dashboard/movement-chart?range=30d` |
| GET | `/reports/inventory-value` |
| GET | `/reports/movements?from=&to=&format=json\|xlsx\|pdf` |

### Pengguna
`GET/POST /users`, `PATCH /users/:id`, `POST /users/:id/reset-password`. Hanya Admin.

## Contoh handler
```ts
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole(['ADMIN', 'MANAGER', 'STAFF']);
  const doc = await receiveGoodsReceipt(Number(params.id), session.user.id);
  return Response.json({ data: doc });
}
```
Kesalahan `AppError` diubah menjadi respons di satu fungsi `handleError` yang dipakai semua handler.
