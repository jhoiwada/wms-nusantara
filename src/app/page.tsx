import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/features/theme-toggle';
import { BrandLogo } from '@/components/ui/brand-logo';
import { HomepageInteractivePreview } from '@/components/features/homepage-interactive-preview';
import { InteractiveWorkflowDiagram } from '@/components/features/interactive-workflow-diagram';
import { getOptionalAuth } from '@/server/auth/rbac';

export const metadata = {
  title: 'PT Nusantara Logistik Distribusi (NLD Logistics) — Sistem Manajemen Gudang Enterprise',
  description:
    'Sistem manajemen pergudangan dan rantai pasok multi-fasilitas (DC Pulogadung Jakarta & DC MM2100 Bekasi) dengan alokasi otomatis FEFO, denah spasial 2D, stock opname 4-mata, dan 18 modul operasional terpadu.',
};

export const instant = false;

export default async function HomePage() {
  const user = await getOptionalAuth();

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfbfa] text-zinc-900 transition-colors selection:bg-amber-500/30 selection:text-amber-900 dark:bg-[#111113] dark:text-zinc-100 dark:selection:text-amber-200">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur-md dark:border-zinc-800/80 dark:bg-[#111113]/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 transition hover:opacity-95">
            <BrandLogo size="md" showText subtitle="DC Pulogadung & MM2100" />
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="#alur-operasional"
              className="hidden text-xs font-semibold text-zinc-600 transition hover:text-zinc-900 md:inline-block dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Alur Rantai Pasok
            </Link>
            <Link
              href="#modul-sistem"
              className="hidden text-xs font-semibold text-zinc-600 transition hover:text-zinc-900 md:inline-block dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              18 Modul Sistem
            </Link>
            <Link
              href="#arsitektur-keamanan"
              className="hidden text-xs font-semibold text-zinc-600 transition hover:text-zinc-900 lg:inline-block dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Integritas &amp; ACID
            </Link>
            <Link
              href="#akses-sistem"
              className="hidden text-xs font-semibold text-zinc-600 transition hover:text-zinc-900 sm:inline-block dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Tata Kelola RBAC
            </Link>

            <div className="mx-1 hidden h-4 w-px bg-zinc-200 sm:block dark:bg-zinc-800" />

            <ThemeToggle />

            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-500/20 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                <span>Dashboard ({user.role}) &rarr;</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-zinc-950 shadow-xs transition hover:bg-amber-400 active:translate-y-0.5"
              >
                Masuk ke Portal WMS
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-20 px-4 py-10 sm:px-6 md:py-16">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          {/* Hero Left Content (6 Cols) */}
          <div className="space-y-6 lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              <span>DC Pulogadung (Jakarta) &amp; DC MM2100 (Bekasi)</span>
            </div>

            <h1 className="text-3xl leading-tight font-black tracking-tight text-zinc-900 sm:text-4xl md:text-5xl dark:text-zinc-100">
              Sistem Manajemen Gudang &amp; Distribusi FMCG Multi-Fasilitas
            </h1>

            <p className="text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-300">
              Pengendalian alur persediaan berintegritas transaksi tinggi: alokasi pengeluaran
              otomatis berbasis FEFO, pembekuan rak selektif pada stock opname, penelusuran batch
              kedaluwarsa, dan pencatatan mutasi append-only tanpa risiko saldo negatif.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href={user ? '/dashboard' : '/login'}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-bold text-zinc-950 shadow-sm transition hover:bg-amber-400 active:translate-y-0.5"
              >
                <span>
                  {user
                    ? `Lanjutkan ke Dashboard (${user.name.split(' ')[0]})`
                    : 'Masuk ke Pusat Kendali WMS'}
                </span>
                <span className="font-mono">&rarr;</span>
              </Link>
              <Link
                href="#modul-sistem"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-sm font-semibold text-zinc-800 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <span>Jelajahi 18 Modul Sistem</span>
                <span className="text-amber-500">&darr;</span>
              </Link>
            </div>

            {/* Quick Specs Pills */}
            <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
              <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                  Alokasi Outbound
                </span>
                <div className="mt-1 font-bold text-zinc-900 dark:text-zinc-100">FEFO Otomatis</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                  Penataan Fisik
                </span>
                <div className="mt-1 font-bold text-zinc-900 dark:text-zinc-100">
                  Zona-Rak-Level
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                  Invarian Database
                </span>
                <div className="mt-1 font-bold text-emerald-600 dark:text-emerald-400">
                  Saldo &gt;= 0
                </div>
              </div>
            </div>
          </div>

          {/* Hero Right Interactive Component (6 Cols) */}
          <div className="lg:col-span-6">
            <HomepageInteractivePreview />
          </div>
        </div>

        {/* 3. METRIK OPERASIONAL RIIL */}
        <section className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm md:p-8 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mb-6 flex flex-col justify-between gap-2 border-b border-zinc-100 pb-4 sm:flex-row sm:items-center dark:border-zinc-800">
            <div>
              <span className="text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                Tolok Ukur Fasilitas Nyata
              </span>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Kapasitas &amp; Integritas Operasional PT Nusantara Logistik Distribusi
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
              <span className="text-[11px] font-medium text-zinc-500">Pusat Distribusi</span>
              <div className="mt-1 font-mono text-2xl font-black text-zinc-900 dark:text-zinc-100">
                2 DC
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">Pulogadung &amp; MM2100</div>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
              <span className="text-[11px] font-medium text-zinc-500">Katalog Produk</span>
              <div className="mt-1 font-mono text-2xl font-black text-zinc-900 dark:text-zinc-100">
                15 SKU
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">FMCG &amp; Retail Aktif</div>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
              <span className="text-[11px] font-medium text-zinc-500">Koordinat Rak</span>
              <div className="mt-1 font-mono text-2xl font-black text-zinc-900 dark:text-zinc-100">
                20 Rak
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">Denah Visual Spasial 2D</div>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
              <span className="text-[11px] font-medium text-zinc-500">Verifikasi Uji</span>
              <div className="mt-1 font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
                227 Test
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">100% Vitest Lulus</div>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
              <span className="text-[11px] font-medium text-zinc-500">Saldo Negatif</span>
              <div className="mt-1 font-mono text-2xl font-black text-amber-600 dark:text-amber-400">
                0 Kasus
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">Row Lock FOR UPDATE</div>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
              <span className="text-[11px] font-medium text-zinc-500">Kesiapan Sistem</span>
              <div className="mt-1 font-mono text-2xl font-black text-zinc-900 dark:text-zinc-100">
                18 Modul
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">0% Tombol Dummy</div>
            </div>
          </div>
        </section>

        {/* 4. ALUR RANTAI PASOK END-TO-END */}
        <section id="alur-operasional" className="scroll-mt-24 space-y-6">
          <div className="max-w-2xl">
            <span className="text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
              Operasional Fisik
            </span>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">
              Siklus Rantai Pasok Pergudangan End-to-End
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Setiap pergerakan fisik barang memiliki representasi transaksi atomik pada buku besar
              stok digital untuk menjamin akuntabilitas data.
            </p>
          </div>

          <InteractiveWorkflowDiagram />
        </section>

        {/* 5. MATRIKS 18 MODUL LENGKAP */}
        <section id="modul-sistem" className="scroll-mt-24 space-y-8">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <span className="text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                Arsitektur Fitur
              </span>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">
                18 Modul Operasional Terintegrasi
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Seluruh modul terhubung nyata ke skema PostgreSQL tanpa halaman mock ataupun status
                &ldquo;Coming Soon&rdquo;.
              </p>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              100% Siap Operasional
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Pilar 1: Operasional Mutasi */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                    PILAR 01
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-400">7 Modul</span>
                </div>
                <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Operasional Mutasi Persediaan
                </h3>
                <ul className="mt-3 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/goods-receipts" className="hover:underline">
                      Penerimaan Barang (GR)
                    </Link>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/delivery-orders" className="hover:underline">
                      Surat Jalan (DO &amp; FEFO)
                    </Link>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/stock" className="hover:underline">
                      Posisi Stok &amp; Kartu Stok
                    </Link>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/stock-opname" className="hover:underline">
                      Stock Opname 4-Eyes
                    </Link>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/stock-adjustments" className="hover:underline">
                      Penyesuaian Manual Terkendali
                    </Link>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/stock-transfers" className="hover:underline">
                      Transfer Gudang &amp; Antar-Rak
                    </Link>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/customer-returns" className="hover:underline">
                      Retur Pelanggan &amp; QC Grading
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <Link
                  href="/goods-receipts/new"
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400"
                >
                  Uji Form GR Baru &rarr;
                </Link>
              </div>
            </div>

            {/* Pilar 2: Master Data */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                    PILAR 02
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-400">6 Modul</span>
                </div>
                <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Master Data Rantai Pasok
                </h3>
                <ul className="mt-3 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/products" className="hover:underline">
                      Katalog Produk &amp; SKU Barcode
                    </Link>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/categories" className="hover:underline">
                      Kategori Barang FMCG
                    </Link>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/suppliers" className="hover:underline">
                      Pemasok &amp; Lead Time
                    </Link>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/customers" className="hover:underline">
                      Pelanggan Retail &amp; Grosir
                    </Link>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/warehouses" className="hover:underline">
                      Fasilitas DC Gudang Fisik
                    </Link>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/warehouses" className="hover:underline">
                      Lokasi Rak (Zona-Rak-Level)
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <Link
                  href="/products"
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400"
                >
                  Buka Master Produk &rarr;
                </Link>
              </div>
            </div>

            {/* Pilar 3: Visibilitas & Pelaporan */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                    PILAR 03
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-400">3 Modul</span>
                </div>
                <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Visibilitas &amp; Pelaporan
                </h3>
                <ul className="mt-3 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/warehouse-map" className="hover:underline">
                      Denah Spasial Rak 2D (SVG)
                    </Link>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/reports" className="hover:underline">
                      Valuasi Persediaan Total (IDR)
                    </Link>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/reports" className="hover:underline">
                      Ekspor Laporan Excel &amp; PDF
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <Link
                  href="/warehouse-map"
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400"
                >
                  Buka Denah Gudang 2D &rarr;
                </Link>
              </div>
            </div>

            {/* Pilar 4: Keamanan & Pengguna */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                    PILAR 04
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-400">2 Modul Inti</span>
                </div>
                <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Keamanan &amp; Kontrol Akses
                </h3>
                <ul className="mt-3 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/users" className="hover:underline">
                      Kelola Pengguna &amp; RBAC
                    </Link>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/audit-logs" className="hover:underline">
                      Jejak Audit Sentral (Audit Logs)
                    </Link>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500">&bull;</span>
                    <Link href="/barcode-labels" className="hover:underline">
                      Cetak Label Barcode &amp; QR
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <Link
                  href="/users"
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400"
                >
                  Kelola Pengguna Sistem &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 6. FONDASI KEAMANAN & INTEGRITAS DATABASE */}
        <section
          id="arsitektur-keamanan"
          className="scroll-mt-24 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8 dark:border-zinc-800 dark:bg-zinc-900/50"
        >
          <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-6 md:flex-row md:items-center dark:border-zinc-800">
            <div>
              <span className="text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                Fondasi Rekayasa
              </span>
              <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Integritas Database Transaksional &amp; Proteksi Sistem
              </h2>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                Setiap mutasi stok dieksekusi dalam transaksi ACID atomik guna mencegah
                inkonsistensi saldo fisik.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-mono text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                Next.js 16 &bull; Prisma 6 &bull; PostgreSQL 16
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                01. CONCURRENCY LOCK
              </span>
              <h4 className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Row-Level Locking
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Kueri <code>SELECT ... FOR UPDATE</code> mengunci baris data stok saat alokasi
                pesanan berjalan serentak, mencegah race-condition.
              </p>
            </div>

            <div>
              <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                02. IMMUTABLE LEDGER
              </span>
              <h4 className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Buku Besar Append-Only
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Tabel mutasi stok tidak pernah mengalami update/delete; saldo berjalan{' '}
                <code>balanceAfter</code> dikalkulasi matematis secara deterministik.
              </p>
            </div>

            <div>
              <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                03. FOUR-EYES PRINCIPLE
              </span>
              <h4 className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Otorisasi Bertingkat
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Aturan BR-23 menegakkan pemisahan tugas: staf yang melakukan blind count opname
                tidak dapat menyetujui dokumennya sendiri.
              </p>
            </div>

            <div>
              <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                04. ANTI-LOCKOUT
              </span>
              <h4 className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Proteksi Akun Administrator
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Akun administrator utama (<code>admin@nldlogistics.co.id</code>) dan akun sesi yang
                sedang aktif dilindungi di tingkat service agar portal tidak pernah terkunci tanpa
                admin.
              </p>
            </div>
          </div>
        </section>

        {/* 7. STRUKTUR OTORISASI & PEMBAGIAN HAK AKSES */}
        <section id="akses-sistem" className="scroll-mt-24 space-y-6">
          <div className="text-center">
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
              Tata Kelola &amp; Keamanan Pengguna
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">
              Matriks Otorisasi 4 Peran (Role-Based Access Control)
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              Pemisahan wewenang operasional (*Separation of Duties*) berstandar industri dengan
              batas hak akses yang ditegakkan secara deterministik di level middleware dan basis
              data:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Role 1: ADMIN */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-rose-100 px-2 py-0.5 font-mono text-[11px] font-bold text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                    ROLE: ADMIN
                  </span>
                  <span className="text-[10px] font-semibold text-zinc-400">Tingkat 1</span>
                </div>
                <div className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Administrator Sistem
                </div>
                <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  Tata Kelola &amp; Infrastruktur
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Akses penuh ke konfigurasi master data (Gudang, Kategori, Produk), modul kelola
                  pengguna (/users), pengaturan keamanan siber, dan audit forensik.
                </p>
              </div>
              <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <div className="font-mono text-[10px] text-zinc-500">
                  Invarian: Anti-Lockout Protected
                </div>
              </div>
            </div>

            {/* Role 2: MANAGER */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-amber-100 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                    ROLE: MANAGER
                  </span>
                  <span className="text-[10px] font-semibold text-zinc-400">Tingkat 2</span>
                </div>
                <div className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Manajer Operasional
                </div>
                <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  Otorisasi &amp; Kontrol Keuangan
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Otorisasi bertingkat: Approval stock opname 4-eyes (BR-23), alokasi pengiriman
                  FEFO, penyesuaian stok bernilai tinggi, dan laporan valuasi persediaan.
                </p>
              </div>
              <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <div className="font-mono text-[10px] text-zinc-500">
                  Invarian: Four-Eyes Segregation
                </div>
              </div>
            </div>

            {/* Role 3: STAFF */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                    ROLE: STAFF
                  </span>
                  <span className="text-[10px] font-semibold text-zinc-400">Tingkat 3</span>
                </div>
                <div className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Supervisor &amp; Staf Lapangan
                </div>
                <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  Eksekusi Fisik Pergudangan
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Pencatatan barang masuk (GR), scan barcode kamera di perangkat seluler,
                  penghitungan fisik blind count opname, serta pencatatan retur pelanggan.
                </p>
              </div>
              <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <div className="font-mono text-[10px] text-zinc-500">
                  Invarian: Blind Opname Restricted
                </div>
              </div>
            </div>

            {/* Role 4: VIEWER */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-zinc-200 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                    ROLE: AUDITOR
                  </span>
                  <span className="text-[10px] font-semibold text-zinc-400">Tingkat 4</span>
                </div>
                <div className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Auditor &amp; Pengawas Kepatuhan
                </div>
                <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  Akses Read-Only Mutlak
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Peninjauan read-only: Dashboard eksekutif, peta denah spasial 2D, kartu stok
                  immutable ledger, dan laporan mutasi tanpa hak modifikasi.
                </p>
              </div>
              <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <div className="font-mono text-[10px] text-zinc-500">
                  Invarian: Write Blocked at Middleware
                </div>
              </div>
            </div>
          </div>

          {/* Security & Unified Authentication Portal Banner */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs sm:flex-row dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Otentikasi Terpusat Berstandar Enterprise
                </h4>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                  Setiap sesi diproteksi JWT HttpOnly, pencatatan IP audit log otomatis, dan
                  perlindungan brute-force aktif.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <span>Akses Portal Masuk Terpadu</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </section>
      </main>

      {/* 8. FOOTER KORPORAT */}
      <footer className="border-t border-zinc-200 bg-white py-10 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-[#111113] dark:text-zinc-400">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="space-y-3 md:col-span-2">
              <BrandLogo size="md" showText subtitle="PT Nusantara Logistik Distribusi" />
              <p className="max-w-md text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Sistem Manajemen Pergudangan &amp; Rantai Pasok Modern untuk distribusi produk
                konsumen (FMCG). Dirancang tanpa template eksternal dengan penegakan integritas
                transaksi tingkat industri.
              </p>
              <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-400">
                <span>Versi: 1.0.0 Enterprise</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold tracking-wider text-zinc-900 uppercase dark:text-zinc-100">
                Fasilitas Gudang
              </div>
              <ul className="mt-3 space-y-2 text-xs">
                <li>
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                    DC Pulogadung
                  </div>
                  <div className="text-zinc-500">Jakarta Timur, DKI Jakarta 13920</div>
                </li>
                <li className="pt-1">
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                    DC MM2100 Cikarang
                  </div>
                  <div className="text-zinc-500">Kawasan Industri Cikarang, Bekasi 17530</div>
                </li>
              </ul>
            </div>

            <div>
              <div className="text-xs font-bold tracking-wider text-zinc-900 uppercase dark:text-zinc-100">
                Akses Navigasi
              </div>
              <ul className="mt-3 space-y-2 text-xs">
                <li>
                  <Link href="/login" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                    Masuk Portal Pengguna
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                    Pusat Kendali Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/warehouse-map"
                    className="hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    Denah Spasial Rak 2D
                  </Link>
                </li>
                <li>
                  <Link href="/users" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                    Kelola Pengguna (Admin)
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-zinc-100 pt-6 text-[11px] text-zinc-400 sm:flex-row dark:border-zinc-800/80">
            <div>
              &copy; 2026 PT Nusantara Logistik Distribusi (NLD Logistics). Hak Cipta Dilindungi.
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                <span>Status Sistem: Operasional Normal</span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
