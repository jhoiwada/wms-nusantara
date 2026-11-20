'use client';

import React, { useState } from 'react';

type PreviewTab = 'fefo' | 'racks' | 'opname';

export function HomepageInteractivePreview() {
  const [activeTab, setActiveTab] = useState<PreviewTab>('fefo');

  // FEFO Simulation State
  const [orderQty, setOrderQty] = useState<number>(45);

  // Rack Inspection State
  const [selectedRack, setSelectedRack] = useState<string>('B-02-01');

  // 4-Eyes Opname State
  const [opnameApproved, setOpnameApproved] = useState<boolean>(false);

  // FEFO Calculation logic for preview
  const batch1Max = 30; // Expiry 15 days
  const batch2Max = 40; // Expiry 90 days
  const batch1Allocated = Math.min(orderQty, batch1Max);
  const remainingAfterBatch1 = Math.max(0, orderQty - batch1Allocated);
  const batch2Allocated = Math.min(remainingAfterBatch1, batch2Max);

  const RACKS_DATA: Record<
    string,
    {
      code: string;
      zone: string;
      occupancy: number;
      isFrozen: boolean;
      product: string;
      stock: number;
    }
  > = {
    'A-01-01': {
      code: 'A-01-01',
      zone: 'Zona Dingin',
      occupancy: 85,
      isFrozen: false,
      product: 'Susu UHT Cokelat 1L',
      stock: 120,
    },
    'A-01-02': {
      code: 'A-01-02',
      zone: 'Zona Dingin',
      occupancy: 92,
      isFrozen: false,
      product: 'Keju Cheddar 200g',
      stock: 240,
    },
    'B-02-01': {
      code: 'B-02-01',
      zone: 'Zona Kering',
      occupancy: 65,
      isFrozen: true,
      product: 'Minyak Goreng 2L',
      stock: 85,
    },
    'B-02-02': {
      code: 'B-02-02',
      zone: 'Zona Kering',
      occupancy: 40,
      isFrozen: false,
      product: 'Biskuit Gandum 300g',
      stock: 95,
    },
    'C-01-01': {
      code: 'C-01-01',
      zone: 'Karantina',
      occupancy: 100,
      isFrozen: false,
      product: 'Retur Transit (Damaged)',
      stock: 50,
    },
    'C-01-02': {
      code: 'C-01-02',
      zone: 'Fast Moving',
      occupancy: 25,
      isFrozen: false,
      product: 'Kopi Bubuk 250g',
      stock: 45,
    },
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-xl dark:border-zinc-800 dark:bg-[#151518]">
      {/* Interactive Topbar & Tab Navigation */}
      <div className="flex flex-col border-b border-zinc-200 bg-zinc-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
          </span>
          <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
            KONSOL TELEMETRI FASILITAS NLD
          </span>
          <span className="rounded bg-zinc-200/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            DC PULOGADUNG &amp; MM2100
          </span>
        </div>

        {/* Tab Buttons */}
        <div className="mt-2.5 flex items-center gap-1 sm:mt-0">
          <button
            type="button"
            onClick={() => setActiveTab('fefo')}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              activeTab === 'fefo'
                ? 'bg-amber-500 text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            1. Alokasi FEFO
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('racks')}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              activeTab === 'racks'
                ? 'bg-amber-500 text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            2. Okupansi Rak 2D
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('opname')}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              activeTab === 'opname'
                ? 'bg-amber-500 text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            3. 4-Eyes Opname
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div className="p-5">
        {/* TAB 1: FEFO ALLOCATION ENGINE */}
        {activeTab === 'fefo' && (
          <div className="space-y-4">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h4 className="text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                  Algoritma First-Expired, First-Out
                </h4>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                  Sistem otomatis mengalokasikan batch tertua untuk pesanan pengiriman.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="preview-order-qty"
                  className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
                  Permintaan DO:
                </label>
                <div className="flex items-center rounded-lg border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800">
                  <input
                    id="preview-order-qty"
                    type="range"
                    min="10"
                    max="70"
                    step="5"
                    value={orderQty}
                    onChange={(e) => setOrderQty(Number(e.target.value))}
                    className="h-2 w-20 cursor-pointer accent-amber-500"
                  />
                  <span className="ml-2 font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {orderQty} karton
                  </span>
                </div>
              </div>
            </div>

            {/* Batch Breakdown Rows */}
            <div className="space-y-2.5">
              {/* Batch 1: Expiring Soonest */}
              <div className="rounded-xl border border-rose-300/80 bg-rose-50/50 p-3.5 transition dark:border-rose-900/40 dark:bg-rose-950/20">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-rose-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-900 dark:bg-rose-900/60 dark:text-rose-200">
                      BATCH #B2026-001
                    </span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      ED: 15 Hari Lagi (Prioritas 1)
                    </span>
                  </div>
                  <span className="font-mono font-bold text-rose-700 dark:text-rose-400">
                    Alokasi: {batch1Allocated} / 30
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-rose-200 dark:bg-rose-950">
                  <div
                    className="h-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${(batch1Allocated / 30) * 100}%` }}
                  />
                </div>
              </div>

              {/* Batch 2: Intermediate Expiry */}
              <div className="rounded-xl border border-amber-300/80 bg-amber-50/50 p-3.5 transition dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-amber-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                      BATCH #B2026-002
                    </span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      ED: 90 Hari Lagi (Prioritas 2)
                    </span>
                  </div>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                    Alokasi: {batch2Allocated} / 40
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-amber-200 dark:bg-amber-950">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${(batch2Allocated / 40) * 100}%` }}
                  />
                </div>
              </div>

              {/* Batch 3: Fresh Batch (Safe) */}
              <div className="rounded-xl border border-emerald-300/80 bg-emerald-50/50 p-3.5 transition dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-emerald-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200">
                      BATCH #B2026-003
                    </span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      ED: 180 Hari Lagi (Aman di Rak)
                    </span>
                  </div>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    Alokasi: 0 / 50 (Disimpan)
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-200 dark:bg-emerald-950">
                  <div className="h-full w-0 bg-emerald-500" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-zinc-100 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              <span className="font-medium">Hasil Otomatisasi FEFO:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                Batch kedaluwarsa terdekat terkuras 100% pertama tanpa intervensi manual
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: RACK OCCUPANCY 2D */}
        {activeTab === 'racks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                  Visualisasi Okupansi Rak 2D (DC Pulogadung)
                </h4>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                  Klik sel rak untuk memeriksa informasi kapasitas dan status pembekuan fisik.
                </p>
              </div>
              <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                Pilih Sel Rak &darr;
              </span>
            </div>

            {/* 6 Rack Cells Grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {Object.values(RACKS_DATA).map((rack) => {
                const isSelected = selectedRack === rack.code;
                return (
                  <button
                    key={rack.code}
                    type="button"
                    onClick={() => setSelectedRack(rack.code)}
                    className={`flex flex-col justify-between rounded-xl p-3 text-left transition ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500'
                        : 'border border-zinc-200 bg-zinc-50/80 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {rack.code}
                      </span>
                      {rack.isFrozen && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-700 dark:text-amber-400">
                          BEKU (SO)
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500">{rack.zone}</span>
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          {rack.occupancy}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <div
                          className={`h-full ${
                            rack.isFrozen
                              ? 'bg-amber-500'
                              : rack.occupancy > 90
                                ? 'bg-rose-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${rack.occupancy}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Rack Inspector Box */}
            {selectedRack && RACKS_DATA[selectedRack] && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-900/80">
                <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                  <div>
                    <span className="text-[11px] text-zinc-500">
                      Isi Rak Terpilih ({selectedRack}):
                    </span>
                    <span className="ml-2 font-bold text-zinc-900 dark:text-zinc-100">
                      {RACKS_DATA[selectedRack].product}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                      Stok: {RACKS_DATA[selectedRack].stock} unit
                    </span>
                    {RACKS_DATA[selectedRack].isFrozen ? (
                      <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        Status: Terkunci untuk Mutasi
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        Status: Siap Picking / Putaway
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: 4-EYES OPNAME AUDIT */}
        {activeTab === 'opname' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                  Prinsip 4-Mata (Four-Eyes Principle) Stock Opname
                </h4>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                  Staf lapangan melakukan hitung fisik murni tanpa melihat target sistem; Manajer
                  melakukan verifikasi &amp; approval.
                </p>
              </div>
              <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                SO-2026-0004
              </span>
            </div>

            {/* Split Comparison Columns */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60">
                <span className="text-[11px] text-zinc-500">Tahap 1: Blind Count Fisik</span>
                <div className="mt-1 font-mono text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  98 Karton
                </div>
                <div className="mt-1 text-[11px] text-zinc-500">Dihitung oleh: Staff Gudang</div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60">
                <span className="text-[11px] text-zinc-500">Tahap 2: Catatan Sistem</span>
                <div className="mt-1 font-mono text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  100 Karton
                </div>
                <div className="mt-1 text-[11px] text-zinc-500">Saldo Buku Besar Berjalan</div>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 dark:border-rose-900/40 dark:bg-rose-950/20">
                <span className="text-[11px] text-rose-700 dark:text-rose-400">
                  Variansi Selisih
                </span>
                <div className="mt-1 font-mono text-xl font-bold text-rose-600 dark:text-rose-400">
                  -2 Karton
                </div>
                <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                  Wajib Otorisasi Manajer
                </div>
              </div>
            </div>

            {/* Manager Approval Action Trigger */}
            <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900/80">
              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Status Otorisasi:{' '}
                  {opnameApproved ? 'DISETUJUI & MUTASI POSTED' : 'MENUNGGU APPROVAL MANAJER'}
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {opnameApproved
                    ? 'Mutasi penyesuaian ADJUST_OUT (-2) berhasil dicatat ke kartu stok secara permanen.'
                    : 'Aturan BR-23: Pembuat dokumen dilarang menyetujui dokumennya sendiri.'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpnameApproved(!opnameApproved)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold shadow-xs transition ${
                  opnameApproved
                    ? 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                    : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                }`}
              >
                {opnameApproved ? 'Reset Status' : 'Setujui Dokumen (Role: Manager) \u2192'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HomepageInteractivePreview;
