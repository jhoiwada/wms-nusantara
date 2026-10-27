'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
  warehouseId: string;
}

interface ProductStock {
  id: string;
  quantity: number;
  product: {
    id: string;
    sku: string;
    name: string;
    uom: string;
  };
  batch: {
    id: string;
    batchNo: string;
    expiryDate: string | null;
  };
}

export default function NewStockTransferPage() {
  const router = useRouter();

  // Master options
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>('');
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>('');

  const [sourceLocations, setSourceLocations] = useState<LocationOption[]>([]);
  const [targetLocations, setTargetLocations] = useState<LocationOption[]>([]);

  const [selectedSourceLocationId, setSelectedSourceLocationId] = useState<string>('');
  const [selectedTargetLocationId, setSelectedTargetLocationId] = useState<string>('');

  // Available stocks at source location
  const [availableStocks, setAvailableStocks] = useState<ProductStock[]>([]);
  const [selectedStockId, setSelectedStockId] = useState<string>('');

  const [quantity, setQuantity] = useState<string>('1');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch warehouses on mount
  useEffect(() => {
    fetch('/api/v1/warehouses?activeOnly=true&pageSize=100')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setWarehouses(json.data);
          if (json.data.length > 0) {
            setSourceWarehouseId(json.data[0].id);
            setTargetWarehouseId(json.data[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Fetch source locations when source warehouse changes
  useEffect(() => {
    if (!sourceWarehouseId) return;

    fetch(`/api/v1/locations?warehouseId=${sourceWarehouseId}&activeOnly=true&pageSize=100`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setSourceLocations(json.data);
          if (json.data.length > 0) {
            setSelectedSourceLocationId(json.data[0].id);
          } else {
            setSelectedSourceLocationId('');
          }
        }
      })
      .catch(() => {});
  }, [sourceWarehouseId]);

  // Fetch target locations when target warehouse changes
  useEffect(() => {
    if (!targetWarehouseId) return;

    fetch(`/api/v1/locations?warehouseId=${targetWarehouseId}&activeOnly=true&pageSize=100`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setTargetLocations(json.data);
          if (json.data.length > 0) {
            setSelectedTargetLocationId(json.data[0].id);
          } else {
            setSelectedTargetLocationId('');
          }
        }
      })
      .catch(() => {});
  }, [targetWarehouseId]);

  const handleSourceLocationChange = (locId: string) => {
    setSelectedSourceLocationId(locId);
    if (!locId) {
      setAvailableStocks([]);
      setSelectedStockId('');
    }
  };

  // Fetch available stocks at source location
  useEffect(() => {
    if (!selectedSourceLocationId) return;

    fetch(`/api/v1/stock?locationId=${selectedSourceLocationId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          const inStock = (json.data as ProductStock[]).filter((s) => s.quantity > 0);
          setAvailableStocks(inStock);
          if (inStock.length > 0) {
            setSelectedStockId(inStock[0]!.id);
          } else {
            setSelectedStockId('');
          }
        }
      })
      .catch(() => {});
  }, [selectedSourceLocationId]);

  const selectedStockRow = availableStocks.find((s) => s.id === selectedStockId);
  const sourceLocObj = sourceLocations.find((l) => l.id === selectedSourceLocationId);
  const targetLocObj = targetLocations.find((l) => l.id === selectedTargetLocationId);

  const isSameLocation =
    selectedSourceLocationId !== '' && selectedSourceLocationId === selectedTargetLocationId;

  const isFrozenConflict = (sourceLocObj?.isFrozen ?? false) || (targetLocObj?.isFrozen ?? false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isSameLocation) {
      setErrorMessage('Lokasi asal dan tujuan tidak boleh sama (BR-28).');
      return;
    }

    if (isFrozenConflict) {
      setErrorMessage('Lokasi rak asal atau tujuan sedang dibekukan karena proses opname (BR-22).');
      return;
    }

    if (!selectedStockRow) {
      setErrorMessage('Pilih barang/batch stok di lokasi asal terlebih dahulu.');
      return;
    }

    const qtyNumber = Number(quantity);
    if (isNaN(qtyNumber) || qtyNumber <= 0 || !Number.isInteger(qtyNumber)) {
      setErrorMessage('Jumlah transfer harus bilangan bulat positif (BR-03).');
      return;
    }

    if (qtyNumber > selectedStockRow.quantity) {
      setErrorMessage(
        `Jumlah transfer (${qtyNumber}) melebihi stok yang tersedia di rak asal (${selectedStockRow.quantity} ${selectedStockRow.product.uom}) (BR-01).`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/stock-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes.trim() || null,
          items: [
            {
              productId: selectedStockRow.product.id,
              sourceLocationId: selectedSourceLocationId,
              targetLocationId: selectedTargetLocationId,
              batchId: selectedStockRow.batch.id,
              quantity: qtyNumber,
            },
          ],
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Gagal mengeksekusi transfer stok');
      }

      router.push('/stock-transfers');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/stock-transfers" className="hover:text-white">
          Transfer Stok
        </Link>
        <span>/</span>
        <span className="text-slate-200">Buat Transfer Baru</span>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
        <h1 className="text-xl font-bold text-white">Buat Transfer Stok</h1>
        <p className="mt-1 text-sm text-slate-400">
          Pindahkan stok antar rak atau antar gudang secara atomik. Batch dan tanggal kedaluwarsa
          ikut berpindah (BR-27, BR-28).
        </p>

        {/* Business Rule Alert Banner */}
        <div className="mt-4 rounded-xl border border-sky-500/30 bg-sky-950/20 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 text-sky-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-xs leading-relaxed text-sky-200/90">
              <strong className="font-semibold text-sky-300">
                Prinsip Mutasi Atomik (BR-27 & BR-28):
              </strong>
              <p className="mt-1">
                Transfer stok mengeksekusi mutasi <strong>TRANSFER_OUT</strong> pada lokasi asal dan{' '}
                <strong>TRANSFER_IN</strong> pada lokasi tujuan dalam satu transaksi database. Tidak
                ada status &ldquo;dalam perjalanan&rdquo;. Lokasi asal dan tujuan tidak boleh sama.
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-300">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Section 1: Lokasi Asal */}
          <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <h2 className="text-xs font-bold tracking-wider text-amber-400 uppercase">
              1. Lokasi Rak Asal (Sumber Stok)
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Gudang Asal</label>
                <select
                  value={sourceWarehouseId}
                  onChange={(e) => setSourceWarehouseId(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Rak Asal</label>
                <select
                  value={selectedSourceLocationId}
                  onChange={(e) => handleSourceLocationChange(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  {sourceLocations.map((loc) => (
                    <option key={loc.id} value={loc.id} disabled={loc.isFrozen}>
                      {loc.code} {loc.isFrozen ? '(DIBEKUKAN)' : ''}
                    </option>
                  ))}
                </select>
                {sourceLocObj?.isFrozen && (
                  <p className="text-xs text-rose-400">
                    Rak asal sedang dibekukan karena opname (BR-22).
                  </p>
                )}
              </div>
            </div>

            {/* Select product/batch from source location */}
            <div className="space-y-1.5 border-t border-slate-800/80 pt-2">
              <label className="text-xs font-semibold text-slate-300">
                Pilih Barang & Batch Stok di Rak Asal <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedStockId}
                onChange={(e) => setSelectedStockId(e.target.value)}
                disabled={isSubmitting || availableStocks.length === 0}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                {availableStocks.length === 0 ? (
                  <option value="">(Tidak ada stok di rak asal ini)</option>
                ) : (
                  availableStocks.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.product.name} [{s.product.sku}] · Batch: {s.batch.batchNo} · Tersedia:{' '}
                      {s.quantity} {s.product.uom}{' '}
                      {s.batch.expiryDate
                        ? `· Exp: ${new Date(s.batch.expiryDate).toLocaleDateString('id-ID')}`
                        : ''}
                    </option>
                  ))
                )}
              </select>

              {selectedStockRow && (
                <div className="mt-2 flex items-center gap-4 rounded border border-slate-800 bg-slate-900/40 p-2.5 text-xs text-slate-300">
                  <div>
                    Stok Tersedia:{' '}
                    <strong className="font-mono text-emerald-400">
                      {selectedStockRow.quantity} {selectedStockRow.product.uom}
                    </strong>
                  </div>
                  <div>
                    Batch:{' '}
                    <strong className="font-mono text-slate-200">
                      {selectedStockRow.batch.batchNo}
                    </strong>
                  </div>
                  {selectedStockRow.batch.expiryDate && (
                    <div>
                      Exp:{' '}
                      <strong className="text-slate-200">
                        {new Date(selectedStockRow.batch.expiryDate).toLocaleDateString('id-ID')}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Lokasi Tujuan */}
          <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <h2 className="text-xs font-bold tracking-wider text-sky-400 uppercase">
              2. Lokasi Rak Tujuan (Penerima Stok)
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Gudang Tujuan</label>
                <select
                  value={targetWarehouseId}
                  onChange={(e) => setTargetWarehouseId(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Rak Tujuan</label>
                <select
                  value={selectedTargetLocationId}
                  onChange={(e) => setSelectedTargetLocationId(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  {targetLocations.map((loc) => (
                    <option key={loc.id} value={loc.id} disabled={loc.isFrozen}>
                      {loc.code} {loc.isFrozen ? '(DIBEKUKAN)' : ''}
                    </option>
                  ))}
                </select>
                {targetLocObj?.isFrozen && (
                  <p className="text-xs text-rose-400">
                    Rak tujuan sedang dibekukan karena opname (BR-22).
                  </p>
                )}
              </div>
            </div>

            {isSameLocation && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300">
                Peringatan BR-28: Lokasi asal dan tujuan tidak boleh sama. Pilih rak atau gudang
                tujuan yang berbeda.
              </div>
            )}
          </div>

          {/* Section 3: Quantity & Notes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Jumlah Dipindahkan <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={selectedStockRow?.quantity || 999999}
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={isSubmitting || !selectedStockRow}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Catatan Transfer (Opsional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Pemindahan stok ke area display..."
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <Link href="/stock-transfers">
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Batal
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              disabled={
                isSubmitting ||
                !selectedStockRow ||
                isSameLocation ||
                isFrozenConflict ||
                availableStocks.length === 0
              }
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {isSubmitting ? 'Memproses Transfer...' : 'Eksekusi Transfer Stok (Atomik)'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
