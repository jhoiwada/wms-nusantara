# Aturan Bisnis

> **Status: DISETUJUI** oleh pemilik proyek (keputusan diserahkan ke asisten dengan prinsip: sederhana, aman, mudah dijelaskan). Perubahan aturan harus dilakukan di file ini lebih dulu, lalu kode menyesuaikan. Asisten AI yang menemukan situasi yang tidak tercakup harus bertanya, lalu menambahkan aturan baru di sini.

Setiap aturan punya ID (BR-xx) agar bisa dirujuk di kode, tes, dan PR.

## Glosarium

| Istilah             | Arti                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------- |
| SKU                 | Kode unik internal untuk satu produk                                                    |
| GR (Goods Receipt)  | Dokumen penerimaan barang dari supplier, `GR-TAHUN-URUT`                                |
| DO (Delivery Order) | Dokumen pengiriman ke customer, `DO-TAHUN-URUT`                                         |
| Lokasi              | Posisi rak dengan format `Zona-Rak-Level`, mis. `A-01-02`, milik satu gudang            |
| Batch               | Kelompok barang dari produksi/penerimaan yang sama, punya nomor dan tanggal kedaluwarsa |
| Stok                | Jumlah satu produk, di satu lokasi, pada satu batch                                     |
| Pergerakan stok     | Satu baris riwayat perubahan stok (kartu stok)                                          |
| Opname              | Penghitungan fisik untuk dibandingkan dengan stok sistem                                |
| Selisih             | `hitung fisik − stok sistem`                                                            |
| FEFO                | First Expired, First Out: batch yang paling dekat kedaluwarsa keluar lebih dulu         |

## Stok

- **BR-01** Stok tidak boleh negatif, di aplikasi maupun di database (`CHECK (quantity >= 0)`).
- **BR-02** Satu produk boleh punya stok di banyak lokasi dan banyak gudang. Baris stok unik per (produk, lokasi, batch).
- **BR-03** Jumlah selalu bilangan bulat positif pada dokumen dan pergerakan; arah ditentukan oleh jenis pergerakan. (Satuan pecahan tidak didukung pada versi awal.)
- **BR-04** Stok menipis dihitung dari **total stok produk di semua gudang** dibanding `min_stock` produk. Stok yang sudah expired tidak dihitung sebagai stok tersedia.
- **BR-05** Nilai persediaan = jumlah stok × harga beli produk saat ini (`cost_price`). Tidak memakai metode rata-rata bergerak pada versi awal.

## Batch dan kedaluwarsa

- **BR-06** Produk punya penanda `track_expiry`. Jika aktif, GR wajib mengisi nomor batch dan tanggal kedaluwarsa; tanggal kedaluwarsa tidak boleh sebelum tanggal terima.
- **BR-07** Produk tanpa `track_expiry` memakai satu batch bawaan (`DEFAULT`) agar struktur stok tetap seragam.
- **BR-08** Saat DO tidak menyebut batch, sistem memilih batch dengan urutan **FEFO**, lalu lokasi yang sama dulu, lalu stok terbanyak. Staf boleh mengganti pilihan batch secara manual.
- **BR-09** Batch yang sudah kedaluwarsa **tidak boleh dikirim**. Penanganannya lewat penyesuaian stok (pemusnahan), bukan DO.
- **BR-10** Peringatan "hampir expired" muncul untuk batch dengan stok > 0 dan sisa umur ≤ 30 hari (angka bisa diatur).

## Barang masuk (GR)

- **BR-11** Alur status: `DRAFT → RECEIVED` atau `DRAFT → CANCELLED`. Hanya DRAFT yang boleh diedit.
- **BR-12** Menekan "Terima" dalam satu transaksi: tambah stok, catat pergerakan `IN`, ubah status. Gagal di mana pun = tidak ada yang berubah.
- **BR-13** Setiap item GR wajib menyebut lokasi tujuan yang aktif dan berada di gudang yang dipilih pada dokumen.
- **BR-14** GR yang sudah `RECEIVED` **tidak bisa dibatalkan atau diedit**. Kesalahan dikoreksi lewat penyesuaian stok oleh Manager/Admin yang tercatat dengan alasan.
- **BR-15** Nomor dokumen diberikan saat dokumen dibuat dan tidak dipakai ulang, meskipun dibatalkan.

## Barang keluar (DO)

- **BR-16** Alur status: `DRAFT → SHIPPED` atau `DRAFT → CANCELLED`.
- **BR-17** Saat "Kirim", stok di setiap lokasi/batch dikunci lalu diperiksa. Jika ada item yang stoknya kurang, **seluruh DO ditolak** dengan kode `INSUFFICIENT_STOCK` dan pesan yang menyebut produk serta lokasinya. Tidak ada pengiriman sebagian.
- **BR-18** DO yang sudah `SHIPPED` tidak bisa dibatalkan atau diedit. Retur dari customer di luar cakupan versi awal; bila terjadi, dicatat sebagai GR khusus dengan alasan retur (usulan fitur Tahap 3).
- **BR-19** Draft DO tidak mencadangkan stok. Pemeriksaan hanya terjadi saat "Kirim".

## Stock opname

- **BR-20** Alur status: `DRAFT → SUBMITTED → APPROVED` atau `REJECTED`.
- **BR-21** Saat opname dibuat, sistem menyimpan **snapshot** stok sistem per lokasi/batch yang dihitung. Staf hanya mengisi hitung fisik; selisih dihitung otomatis.
- **BR-22** Selama opname berstatus `DRAFT` atau `SUBMITTED`, lokasi yang dihitung **dibekukan**: GR, DO, dan transfer yang menyentuh lokasi itu ditolak (`INVALID_STATE`). Ini menghindari snapshot menjadi basi.
- **BR-23** Hanya Manager/Admin yang boleh `APPROVE` atau `REJECT`, dan **bukan orang yang sama yang menyusun/mengisi** opname tersebut.
- **BR-24** `APPROVED` dalam satu transaksi: untuk setiap selisih ≠ 0, catat pergerakan `ADJUST_IN` atau `ADJUST_OUT` dan ubah stok menjadi hitung fisik. Lokasi dibuka kembali.
- **BR-25** `REJECTED`: stok tidak berubah, lokasi dibuka, catatan penolakan wajib diisi. Opname baru harus dibuat untuk menghitung ulang.
- **BR-26** Penyesuaian stok di luar opname (mis. pemusnahan expired, koreksi GR salah) hanya oleh Manager/Admin, wajib ada alasan, dan tercatat sebagai pergerakan `ADJUST_*`.

## Transfer stok (Tahap 2)

- **BR-27** Transfer antar rak atau antar gudang dilakukan atomik: `TRANSFER_OUT` di asal dan `TRANSFER_IN` di tujuan dalam satu transaksi. Tidak ada status "dalam perjalanan" pada versi awal.
- **BR-28** Lokasi asal dan tujuan tidak boleh sama. Batch dan tanggal kedaluwarsa ikut berpindah.

## Kartu stok

- **BR-29** Setiap pergerakan menyimpan: produk, lokasi, batch, jenis, jumlah, saldo setelahnya, referensi dokumen, pengguna, dan waktu. Saldo setelahnya adalah saldo stok produk+lokasi+batch tersebut.
- **BR-30** Pergerakan tidak pernah diubah atau dihapus (lihat CLAUDE.md aturan 3).

## Master data

- **BR-31** SKU dan barcode unik. Master data yang sudah punya riwayat tidak dihapus, hanya dinonaktifkan (`is_active = false`).
- **BR-32** Produk, lokasi, supplier, atau customer yang nonaktif tidak bisa dipilih di dokumen baru, tetapi tetap tampil di riwayat.
- **BR-33** Kode lokasi unik per gudang dan mengikuti pola `^[A-Z]-\d{2}-\d{2}$`.

## Pengguna dan akses

- **BR-34** Matriks akses mengikuti `docs/SECURITY.md`. Admin terakhir yang aktif tidak boleh dinonaktifkan atau diturunkan role-nya.
- **BR-35** Viewer tidak bisa membuat atau mengubah data apa pun.

## Keputusan yang sudah diambil

- [x] BR-04: stok menipis dihitung per total semua gudang.
- [x] BR-05: nilai persediaan memakai `cost_price` produk saat ini.
- [x] BR-08: FEFO otomatis, bisa diganti manual.
- [x] BR-14/18: dokumen final dikoreksi lewat penyesuaian stok, bukan pembatalan.
- [x] BR-17: seluruh DO ditolak bila ada item kurang; tanpa pengiriman sebagian.
- [x] BR-22: lokasi dibekukan selama opname.
- [x] BR-27: transfer langsung, tanpa status "dalam perjalanan".
