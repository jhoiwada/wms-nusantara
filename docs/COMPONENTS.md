# Komponen dan Halaman

## Prinsip

- Server Component secara default; `"use client"` hanya untuk form, dialog, dan grafik.
- Komponen di `components/ui` tidak tahu apa-apa tentang gudang. Komponen di `components/features` boleh.
- Satu komponen satu file, nama file `kebab-case.tsx`, nama komponen `PascalCase`.
- Form memakai React Hook Form + skema Zod dari `src/schemas`.

## Komponen dasar (`components/ui`)

| Komponen                                            | Fungsi                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| `Button`, `Input`, `Select`, `Textarea`, `Checkbox` | Elemen form                                                      |
| `DataTable`                                         | Tabel dengan sort, paginasi, pencarian, state kosong dan loading |
| `Dialog`, `ConfirmDialog`                           | Modal dan konfirmasi aksi berbahaya                              |
| `Badge`                                             | Status (DRAFT, RECEIVED, SHIPPED, dst.)                          |
| `Toast`                                             | Notifikasi sukses/gagal                                          |
| `Skeleton`, `EmptyState`, `ErrorState`              | Kondisi non-normal                                               |
| `DatePicker`, `Combobox`                            | Pilih tanggal, pilih produk/lokasi dengan pencarian              |

shadcn/ui direkomendasikan sebagai dasar karena berbasis Tailwind dan kodenya ada di repo.

## Komponen fitur (`components/features`)

| Komponen                          | Dipakai di                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `AppShell`, `Sidebar`, `Topbar`   | Layout dashboard; menu disaring menurut role                                               |
| `RoleGate`                        | Menyembunyikan tombol/menu untuk role tertentu (hanya UX; pengamanan sebenarnya di server) |
| `ProductPicker`, `LocationPicker` | Form GR, DO, opname                                                                        |
| `LineItemsEditor`                 | Tabel item dinamis (tambah/hapus baris, jumlah, rak, batch, expired)                       |
| `StockBadge`                      | Hijau/kuning/merah menurut stok vs minimum                                                 |
| `ExpiryBadge`                     | Menandai batch hampir expired                                                              |
| `StockCardTable`                  | Riwayat pergerakan dengan saldo berjalan                                                   |
| `DocumentHeader`                  | Nomor dokumen, status, tombol aksi (Terima, Kirim, Batal)                                  |
| `SummaryCard`, `MovementChart`    | Dashboard (Recharts)                                                                       |
| `OpnameTable`                     | Kolom sistem, fisik, selisih (otomatis), catatan                                           |
| `BarcodeScanner`                  | Tahap 3, kamera HP                                                                         |
| `WarehouseMap`                    | Tahap 3, denah interaktif                                                                  |

## Halaman

| Rute                                            | Isi                                                                      | Role                  |
| ----------------------------------------------- | ------------------------------------------------------------------------ | --------------------- |
| `/login`                                        | Form login                                                               | publik                |
| `/dashboard`                                    | Kartu ringkasan, grafik masuk vs keluar, transaksi terbaru, stok menipis | semua                 |
| `/products`                                     | Daftar, cari, filter kategori; form tambah/edit                          | lihat semua, ubah A M |
| `/categories` `/suppliers` `/customers`         | CRUD sederhana                                                           | lihat semua, ubah A M |
| `/warehouses`                                   | Gudang dan lokasi rak                                                    | lihat semua, ubah A M |
| `/goods-receipts` `/goods-receipts/new` `/[id]` | Daftar, form, detail                                                     | A M S (V lihat)       |
| `/delivery-orders` `/new` `/[id]`               | Sama seperti GR                                                          | A M S (V lihat)       |
| `/stock`                                        | Tab per produk dan per lokasi                                            | semua                 |
| `/stock-card/[productId]`                       | Kartu stok                                                               | semua                 |
| `/stock-opname`                                 | Daftar, hitung, persetujuan                                              | A M S                 |
| `/reports`                                      | Laporan dan export                                                       | semua (export A M)    |
| `/users`                                        | Kelola pengguna                                                          | A                     |

## Status UI yang wajib ada di setiap halaman data

Loading (skeleton), kosong (ada ajakan aksi), error (ada tombol coba lagi), dan tidak punya akses.

## Aksesibilitas dan responsif

- Label di setiap input, fokus terlihat, tombol bisa dipakai keyboard.
- Form barang masuk/keluar harus nyaman di HP karena staf gudang memakainya di lapangan.
