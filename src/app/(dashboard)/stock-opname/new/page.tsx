'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}

interface LocationOption {
  id: string;
  code: string;
  zone: string;
  rack: string;
  level: string;
  isFrozen: boolean;
  _count: {
    stocks: number;
  };
}

export default function NewStockOpnamePage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');

  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch warehouses
  useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/warehouses?activeOnly=true&pageSize=100')
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.data) {
          setWarehouses(json.data);
          if (json.data.length > 0) {
            setSelectedWarehouseId(json.data[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingWarehouses(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleWarehouseChange = (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId);
    setErrorMessage(null);
    if (!warehouseId) {
      setLocations([]);
      setSelectedLocationIds([]);
    } else {
      setIsLoadingLocations(true);
    }
  };

  // Fetch locations when warehouse changes
  useEffect(() => {
    if (!selectedWarehouseId) {
      return;
    }

    let isMounted = true;

    fetch(`/api/v1/stock-opnames/locations?warehouseId=${selectedWarehouseId}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.data) {
          setLocations(json.data);
          // By default, select all available (non-frozen) locations
          const availableIds = (json.data as LocationOption[])
            .filter((l) => !l.isFrozen)
            .map((l) => l.id);
          setSelectedLocationIds(availableIds);
        }
      })
      .catch((err) => {
        if (isMounted)
          setErrorMessage(err instanceof Error ? err.message : 'Gagal memuat lokasi rak');
      })
      .finally(() => {
        if (isMounted) setIsLoadingLocations(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedWarehouseId]);

  const toggleLocation = (id: string, isFrozen: boolean) => {
    if (isFrozen) return;
    setSelectedLocationIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      const available = locations.filter((l) => !l.isFrozen).map((l) => l.id);
      setSelectedLocationIds(available);
    } else {
      setSelectedLocationIds([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouseId) {
      setErrorMessage('Pilih gudang terlebih dahulu');
      return;
    }
    if (selectedLocationIds.length === 0) {
      setErrorMessage('Pilih minimal satu lokasi rak untuk dihitung (opname)');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/stock-opnames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId: selectedWarehouseId,
          locationIds: selectedLocationIds,
          notes: notes.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error?.message || json.message || 'Gagal membuat dokumen stock opname',
        );
      }

      router.push(`/stock-opname/${json.data.id}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
      setIsSubmitting(false);
    }
  };

  const availableLocations = locations.filter((l) => !l.isFrozen);
  const frozenLocations = locations.filter((l) => l.isFrozen);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Breadcrumb & Title */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link
          href="/stock-opname"
          className="transition-colors hover:text-emerald-600 dark:hover:text-white"
        >
          Stock Opname
        </Link>
        <span>/</span>
        <span className="font-medium text-slate-800 dark:text-slate-200">Buat Dokumen Baru</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Buat Stock Opname Baru</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Inisialisasi dokumen opname, ambil snapshot stok sistem, dan bekukan lokasi rak terpilih.
        </p>

        {errorMessage && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Warehouse Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Gudang Target <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              disabled={isLoadingWarehouses || isSubmitting}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {/* Location Freezing Alert */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/30 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="text-xs leading-relaxed text-amber-900 dark:text-amber-200/90">
                <strong className="font-semibold text-amber-800 dark:text-amber-300">
                  Peringatan Pembekuan Lokasi:
                </strong>
                <p className="mt-1">
                  Semua lokasi rak yang Anda centang di bawah ini akan otomatis{' '}
                  <strong>DIBEKUKAN (frozen)</strong> saat dokumen dibuat. Selama berstatus DRAFT
                  atau SUBMITTED, transaksi Barang Masuk (GR), Barang Keluar (DO), dan Transfer pada
                  lokasi tersebut akan <strong>ditolak oleh sistem</strong> untuk menjamin akurasi
                  snapshot stok fisik.
                </p>
              </div>
            </div>
          </div>

          {/* Location Scope Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Pilih Lokasi Rak yang Dihitung ({selectedLocationIds.length} dari{' '}
                {availableLocations.length} lokasi aktif)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="text-xs text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-400 dark:text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-300"
                >
                  Batal Pilih
                </button>
              </div>
            </div>

            {isLoadingLocations ? (
              <div className="py-8 text-center text-sm text-slate-500">
                Memuat daftar lokasi rak...
              </div>
            ) : locations.length === 0 ? (
              <div className="rounded-lg border border-slate-200 p-4 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Tidak ada lokasi aktif di gudang ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                {locations.map((loc) => {
                  const isChecked = selectedLocationIds.includes(loc.id);
                  return (
                    <div
                      key={loc.id}
                      onClick={() => toggleLocation(loc.id, loc.isFrozen)}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition ${
                        loc.isFrozen
                          ? 'cursor-not-allowed border-rose-200 bg-rose-50/60 opacity-60 dark:border-rose-900/40 dark:bg-rose-950/20'
                          : isChecked
                            ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 dark:border-emerald-500/60 dark:bg-emerald-950/30 dark:text-white'
                            : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={loc.isFrozen}
                          onChange={() => {}} // handled by parent div
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:text-emerald-500 dark:focus:ring-emerald-400"
                        />
                        <div>
                          <div className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-200">
                            {loc.code}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Zona {loc.zone} · Rak {loc.rack} · Level {loc.level}
                          </div>
                        </div>
                      </div>

                      <div>
                        {loc.isFrozen ? (
                          <Badge variant="danger">DIBEKUKAN</Badge>
                        ) : (
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                            {loc._count.stocks} batch stok
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {frozenLocations.length > 0 && (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                * {frozenLocations.length} lokasi rak tidak dapat dipilih karena saat ini sedang
                dibekukan oleh opname lain.
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Catatan / Instruksi Opname (Opsional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Opname rutin akhir bulan Januari, fokus zona fast-moving..."
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:placeholder-slate-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Link href="/stock-opname">
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Batal
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || selectedLocationIds.length === 0}
            >
              {isSubmitting ? 'Memproses Snapshot...' : 'Ambil Snapshot & Mulai Opname'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
