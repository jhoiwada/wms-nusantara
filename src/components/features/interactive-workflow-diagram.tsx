'use client';

import React, { useState } from 'react';

interface WorkflowStep {
  id: string;
  number: string;
  title: string;
  shortDesc: string;
  badge: string;
  detail: {
    description: string;
    keyPoints: string[];
    actionLabel: string;
    actionHref: string;
  };
}

const STEPS: WorkflowStep[] = [
  {
    id: 'receipt',
    number: '01',
    title: 'Penerimaan Barang (Goods Receipt)',
    shortDesc: 'Pemeriksaan fisik dari pemasok, pencatatan batch & tanggal kedaluwarsa.',
    badge: 'Barang Masuk',
    detail: {
      description:
        'Staf gudang menerima kiriman, memvalidasi nomor purchase order dan surat jalan pemasok, mencatat tanggal kedaluwarsa (FEFO), serta mencetak label barcode per item sebelum barang dipindahkan ke rak.',
      keyPoints: [
        'Validasi nomor PO dan referensi surat jalan pemasok',
        'Pencatatan nomor batch unik dan tanggal kedaluwarsa',
        'Pencetakan label barcode SKU standar gudang',
        'Pemberian status Draft ke Received dengan audit log tercatat',
      ],
      actionLabel: 'Lihat Modul Goods Receipt',
      actionHref: '/goods-receipts',
    },
  },
  {
    id: 'storage',
    number: '02',
    title: 'Penempatan Rak Spasial (Putaway)',
    shortDesc: 'Alokasi stok ke koordinat 3D Zona-Rak-Level di Jakarta & Bekasi.',
    badge: 'Manajemen Lokasi',
    detail: {
      description:
        'Setiap unit diarahkan ke lokasi rak presisi dengan format Zona-Rak-Level (contoh: A-01-02). Sistem memantau tingkat keterisian (occupancy) spasial dan dapat membekukan rak saat proses stock opname.',
      keyPoints: [
        'Format rak presisi Zona-Rak-Level terstandarisasi',
        'Peta visual 2D denah gudang untuk memantau kapasitas',
        'Pembekuan lokasi otomatis saat opname berlangsung',
        'Pemisahan inventaris antar fasilitas Jakarta dan Bekasi',
      ],
      actionLabel: 'Buka Denah Gudang Interaktif',
      actionHref: '/warehouse-map',
    },
  },
  {
    id: 'allocation',
    number: '03',
    title: 'Alokasi FEFO & Pengiriman (Delivery Order)',
    shortDesc: 'Otomatisasi pengeluaran batch terdekat kedaluwarsa untuk meminimalkan susut.',
    badge: 'Barang Keluar',
    detail: {
      description:
        'Saat pesanan pengiriman dibuat, algoritma FEFO (First Expired, First Out) memilih batch dengan tanggal kedaluwarsa terdekat. Pengurangan stok berjalan atomik sehingga saldo fisik tidak pernah menjadi negatif.',
      keyPoints: [
        'Prioritas otomatis batch yang mendekati tanggal kedaluwarsa',
        'Pengurangan stok atomik dengan penguncian baris database',
        'Validasi ketersediaan stok fisik sebelum pengesahan surat jalan',
        'Cetak dokumen Berita Acara dan Surat Jalan Pengiriman',
      ],
      actionLabel: 'Lihat Modul Delivery Order',
      actionHref: '/delivery-orders',
    },
  },
  {
    id: 'audit',
    number: '04',
    title: 'Stock Opname & Penyesuaian Fisik',
    shortDesc: 'Pemeriksaan fisik berkala, rekonsiliasi selisih, dan mutasi retur.',
    badge: 'Pengawasan Stok',
    detail: {
      description:
        'Auditor dan staf menghitung stok fisik di rak yang dibekukan, membandingkannya dengan saldo sistem, dan membuat dokumen penyesuaian (adjustment) jika ditemukan selisih riil disertai otorisasi manajer.',
      keyPoints: [
        'Isolasi rak saat penghitungan fisik untuk mencegah mutasi silang',
        'Perhitungan otomatis selisih fisik vs saldo berjalan di sistem',
        'Alur persetujuan bertingkat dari staf ke manajer gudang',
        'Pencatatan retur pelanggan kembali ke kartu stok secara terperinci',
      ],
      actionLabel: 'Periksa Modul Stock Opname',
      actionHref: '/stock-opname',
    },
  },
];

export function InteractiveWorkflowDiagram() {
  const [activeStepId, setActiveStepId] = useState<string>('receipt');
  const [demoBatchExpDays, setDemoBatchExpDays] = useState<number>(14);
  const [demoSelectedRack, setDemoSelectedRack] = useState<string>('A-01-02');
  const [demoPhysicalCount, setDemoPhysicalCount] = useState<number>(48);

  const activeStep: WorkflowStep =
    STEPS.find((s) => s.id === activeStepId) ?? (STEPS[0] as WorkflowStep);

  return (
    <div className="space-y-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8 dark:border-zinc-800 dark:bg-zinc-900/70">
      {/* Header section */}
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end dark:border-zinc-800">
        <div>
          <span className="text-xs font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400">
            Arsitektur Operasional
          </span>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Diagram Alur Pengendalian Inventaris
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Eksplorasi empat tahapan utama dari penerimaan barang, tata letak rak, hingga pengiriman
            pelanggan.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          Klik tahapan untuk melihat simulasi interaktif
        </div>
      </div>

      {/* Step Navigation Pills */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => {
          const isActive = step.id === activeStepId;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStepId(step.id)}
              className={`group flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                isActive
                  ? 'border-amber-500/80 bg-amber-50/50 shadow-sm dark:border-amber-500/60 dark:bg-amber-950/20'
                  : 'border-zinc-200 bg-zinc-50/60 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={`font-mono text-xs font-bold ${
                    isActive
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  {step.number}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                      : 'bg-zinc-200/70 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {step.badge}
                </span>
              </div>
              <h3
                className={`mt-2 text-sm font-bold ${
                  isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {(step.title.split('(')[0] ?? step.title).trim()}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                {step.shortDesc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Step Content & Interactive Simulator Box */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Step Details and Business Rules (5 cols) */}
        <div className="flex flex-col justify-between space-y-5 rounded-xl border border-zinc-200 bg-zinc-50/70 p-6 lg:col-span-5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-xs font-bold text-zinc-950">
                {activeStep.number}
              </span>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {activeStep.title}
              </h3>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {activeStep.detail.description}
            </p>

            <div className="mt-5 space-y-2.5">
              <span className="text-xs font-semibold tracking-wider text-zinc-700 uppercase dark:text-zinc-300">
                Prinsip Operasional:
              </span>
              <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
                {activeStep.detail.keyPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-2">
            <a
              href={activeStep.detail.actionHref}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              {activeStep.detail.actionLabel}
            </a>
          </div>
        </div>

        {/* Right: Live Interactive Simulation Playground (7 cols) */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-7 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <span className="font-mono text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Simulasi Interaktif Komponen
            </span>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              Uji Coba Langsung
            </span>
          </div>

          {/* SIMULATOR 1: GOODS RECEIPT & BARCODE */}
          {activeStepId === 'receipt' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Formulir Penerimaan Batch &amp; Tanggal Kedaluwarsa:
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      SKU &amp; Nama Produk:
                    </label>
                    <div className="mt-1 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      PRD-SGR-01 (Minyak Goreng 2L)
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Masa Kedaluwarsa (Hari):
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="range"
                        min="5"
                        max="180"
                        step="5"
                        value={demoBatchExpDays}
                        onChange={(e) => setDemoBatchExpDays(Number(e.target.value))}
                        className="h-1.5 w-full cursor-pointer accent-amber-500"
                      />
                      <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                        {demoBatchExpDays}h
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barcode & Label Physical Preview */}
              <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-900/30">
                <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  Label Barcode Fisik yang Dihasilkan:
                </div>
                <div className="mt-2 flex flex-col items-center justify-between gap-3 rounded border border-zinc-300 bg-white p-3 text-zinc-900 sm:flex-row">
                  <div className="space-y-0.5 text-left">
                    <div className="text-xs font-bold">Minyak Goreng Sawit 2L</div>
                    <div className="font-mono text-[11px] text-zinc-600">SKU: PRD-SGR-01</div>
                    <div className="font-mono text-[10px] text-zinc-500">
                      Batch: BTH-2026-X1 | Exp: {demoBatchExpDays} hari lagi
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    {/* SVG barcode representation */}
                    <div className="flex h-9 items-end gap-0.5 px-2">
                      <span className="h-full w-1 bg-zinc-900" />
                      <span className="h-full w-0.5 bg-zinc-900" />
                      <span className="h-full w-1.5 bg-zinc-900" />
                      <span className="h-full w-0.5 bg-zinc-900" />
                      <span className="h-full w-2 bg-zinc-900" />
                      <span className="h-full w-0.5 bg-zinc-900" />
                      <span className="h-full w-1 bg-zinc-900" />
                      <span className="h-full w-1.5 bg-zinc-900" />
                      <span className="h-full w-0.5 bg-zinc-900" />
                      <span className="h-full w-2 bg-zinc-900" />
                    </div>
                    <span className="font-mono text-[9px] text-zinc-700">899275300189</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SIMULATOR 2: RACK PUTAWAY & CAPACITY */}
          {activeStepId === 'storage' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 dark:text-zinc-300">Pilih Rak Penyimpanan:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  Terpilih: {demoSelectedRack}
                </span>
              </div>

              {/* 2D Mini Rack Visual Grid */}
              <div className="grid grid-cols-4 gap-2.5">
                {[
                  { code: 'A-01-01', cap: '90%', status: 'Padat', frozen: false },
                  { code: 'A-01-02', cap: '45%', status: 'Tersedia', frozen: false },
                  { code: 'A-02-01', cap: '15%', status: 'Tersedia', frozen: false },
                  { code: 'A-02-02', cap: '100%', status: 'Penuh', frozen: false },
                  { code: 'B-01-01', cap: '0%', status: 'Kosong', frozen: false },
                  { code: 'B-01-02', cap: '60%', status: 'Opname', frozen: true },
                  { code: 'B-02-01', cap: '30%', status: 'Tersedia', frozen: false },
                  { code: 'B-02-02', cap: '80%', status: 'Padat', frozen: false },
                ].map((rack) => {
                  const isSelected = demoSelectedRack === rack.code;
                  return (
                    <button
                      key={rack.code}
                      type="button"
                      onClick={() => setDemoSelectedRack(rack.code)}
                      className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-center transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20 dark:bg-amber-950/40'
                          : rack.frozen
                            ? 'border-rose-200 bg-rose-50/50 dark:border-rose-900/30 dark:bg-rose-950/20'
                            : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50'
                      }`}
                    >
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {rack.code}
                      </span>
                      <span
                        className={`mt-1 font-mono text-[10px] font-semibold ${
                          rack.frozen
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        {rack.cap}
                      </span>
                      <span
                        className={`mt-0.5 rounded px-1 text-[9px] font-medium ${
                          rack.frozen
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : rack.status === 'Penuh'
                              ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {rack.status}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Keterangan Lokasi {demoSelectedRack}:
                </div>
                <div className="mt-1 text-zinc-500 dark:text-zinc-400">
                  {demoSelectedRack === 'B-01-02'
                    ? 'Lokasi sedang dibekukan karena ada sesi Stock Opname aktif. Mutasi masuk/keluar dicegah sementara.'
                    : 'Lokasi aktif siap menerima putaway barang dari proses Goods Receipt.'}
                </div>
              </div>
            </div>
          )}

          {/* SIMULATOR 3: FEFO AUTO ALLOCATION */}
          {activeStepId === 'allocation' && (
            <div className="space-y-4">
              <div className="text-xs text-zinc-600 dark:text-zinc-300">
                Logika Seleksi Batch Otomatis (First Expired, First Out):
              </div>

              <div className="space-y-2.5">
                {/* Batch 1 - Prioritas Utama */}
                <div className="flex items-center justify-between rounded-lg border border-amber-500/80 bg-amber-50/50 p-3 text-xs dark:border-amber-500/50 dark:bg-amber-950/20">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        Batch #A102
                      </span>
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        PRIORITAS 1 (FEFO)
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      Exp: 10 Nov 2026 (14 hari lagi) | Stok: 60 Unit
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Dialokasikan: 40 Unit
                    </span>
                  </div>
                </div>

                {/* Batch 2 - Batch Lebih Baru */}
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs opacity-75 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        Batch #A103
                      </span>
                      <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        STANDBY
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      Exp: 28 Feb 2027 (120 hari lagi) | Stok: 150 Unit
                    </div>
                  </div>
                  <div className="text-right text-zinc-400">0 Unit Diambil</div>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                Sistem secara otomatis menguras stok batch tertua terlebih dahulu untuk meminimalkan
                risiko stok kedaluwarsa di gudang.
              </div>
            </div>
          )}

          {/* SIMULATOR 4: STOCK OPNAME RECONCILIATION */}
          {activeStepId === 'audit' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Rekonsiliasi Fisik Rak A-01-02:
                  </span>
                  <span className="font-mono text-zinc-500">Gudang Jakarta</span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                    <span className="text-[10px] text-zinc-500">Saldo Sistem:</span>
                    <div className="mt-0.5 font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
                      50
                    </div>
                  </div>
                  <div className="rounded border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                    <span className="text-[10px] text-zinc-500">Fisik Dihitung:</span>
                    <div className="mt-0.5 font-mono text-base font-bold text-amber-600 dark:text-amber-400">
                      {demoPhysicalCount}
                    </div>
                  </div>
                  <div className="rounded border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                    <span className="text-[10px] text-zinc-500">Selisih:</span>
                    <div
                      className={`mt-0.5 font-mono text-base font-bold ${
                        demoPhysicalCount - 50 === 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {demoPhysicalCount - 50 > 0
                        ? `+${demoPhysicalCount - 50}`
                        : demoPhysicalCount - 50}
                    </div>
                  </div>
                </div>

                {/* Adjust physical count slider */}
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500">Sesuaikan Hitungan:</span>
                  <input
                    type="range"
                    min="40"
                    max="60"
                    value={demoPhysicalCount}
                    onChange={(e) => setDemoPhysicalCount(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer accent-amber-500"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                {demoPhysicalCount === 50 ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Cocok sempurna: Saldo sistem persis sama dengan stok fisik di rak.
                  </span>
                ) : (
                  <span>
                    Selisih {demoPhysicalCount - 50} unit akan otomatis dibuatkan draf{' '}
                    <strong className="text-zinc-800 dark:text-zinc-200">
                      {demoPhysicalCount - 50 < 0
                        ? 'Stock Adjustment (OUT)'
                        : 'Stock Adjustment (IN)'}
                    </strong>{' '}
                    untuk diverifikasi manajer.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
