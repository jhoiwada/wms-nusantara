'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  AdjustmentReasonCategoryEnum,
  AdjustmentReasonLabels,
  type AdjustmentReasonCategory,
} from '@/schemas/stock-adjustment.schema';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'VIEWER';
}

interface ProductOption {
  id: string;
  sku: string;
  name: string;
  uom: string;
  trackExpiry: boolean;
}

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
}

interface StockRecord {
  id: string;
  quantity: number;
  batch: {
    id: string;
    batchNo: string;
    expiryDate: string | null;
  };
}

export default function NewStockAdjustmentPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [reasonCategory, setReasonCategory] = useState<AdjustmentReasonCategory>('DAMAGED_GOODS');
  const [notes, setNotes] = useState<string>('');

  // Dropdown options
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [availableStocks, setAvailableStocks] = useState<StockRecord[]>([]);

  // Selected item line
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [movementType, setMovementType] = useState<'ADJUST_IN' | 'ADJUST_OUT'>('ADJUST_OUT');
  const [quantity, setQuantity] = useState<string>('1');
  const [itemNotes, setItemNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load current user
  useEffect(() => {
    fetch('/api/v1/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.user) {
          setCurrentUser(json.data.user);
        }
      })
      .catch(() => {});
  }, []);

  // Load master warehouses and products
  useEffect(() => {
    fetch('/api/v1/warehouses?activeOnly=true&pageSize=100')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setWarehouses(json.data);
          if (json.data.length > 0) {
            setSelectedWarehouseId(json.data[0].id);
          }
        }
      })
      .catch(() => {});

    fetch('/api/v1/products?activeOnly=true&pageSize=100')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setProducts(json.data);
          if (json.data.length > 0) {
            setSelectedProductId(json.data[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Load locations when warehouse changes
  useEffect(() => {
    if (!selectedWarehouseId) return;

    fetch(`/api/v1/locations?warehouseId=${selectedWarehouseId}&activeOnly=true&pageSize=100`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setLocations(json.data);
          if (json.data.length > 0) {
            setSelectedLocationId(json.data[0].id);
          }
        }
      })
      .catch(() => {});
  }, [selectedWarehouseId]);

  // Load available stocks/batches when product and location change
  useEffect(() => {
    if (!selectedProductId || !selectedLocationId) return;

    fetch(`/api/v1/stock?productId=${selectedProductId}&locationId=${selectedLocationId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setAvailableStocks(json.data);
          if (json.data.length > 0) {
            setSelectedBatchId(json.data[0].batch.id);
          } else {
            setSelectedBatchId('');
          }
        }
      })
      .catch(() => {});
  }, [selectedProductId, selectedLocationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (currentUser && currentUser.role !== 'MANAGER' && currentUser.role !== 'ADMIN') {
      setErrorMessage(
        'Akses ditolak: Hanya Manager atau Admin yang boleh melakukan penyesuaian stok.',
      );
      return;
    }

    if (!notes.trim() || notes.trim().length < 5) {
      setErrorMessage('Alasan penyesuaian wajib diisi minimal 5 karakter.');
      return;
    }

    if (!selectedProductId) {
      setErrorMessage('Pilih produk terlebih dahulu.');
      return;
    }
    if (!selectedLocationId) {
      setErrorMessage('Pilih lokasi rak terlebih dahulu.');
      return;
    }
    if (!selectedBatchId) {
      setErrorMessage('Pilih batch stok terlebih dahulu.');
      return;
    }

    const qtyNumber = Number(quantity);
    if (isNaN(qtyNumber) || qtyNumber <= 0 || !Number.isInteger(qtyNumber)) {
      setErrorMessage('Jumlah penyesuaian harus bilangan bulat positif.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/stock-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reasonCategory,
          notes: notes.trim(),
          items: [
            {
              productId: selectedProductId,
              locationId: selectedLocationId,
              batchId: selectedBatchId,
              movementType,
              quantity: qtyNumber,
              itemNotes: itemNotes.trim() || null,
            },
          ],
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Gagal menyimpan penyesuaian stok');
      }

      router.push('/stock-adjustments');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
      setIsSubmitting(false);
    }
  };

  const selectedLocObj = locations.find((l) => l.id === selectedLocationId);
  const currentStockRow = availableStocks.find((s) => s.batch.id === selectedBatchId);
  const isAuthorized = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link
          href="/stock-adjustments"
          className="transition-colors hover:text-emerald-600 dark:hover:text-white"
        >
          Penyesuaian Stok
        </Link>
        <span>/</span>
        <span className="font-medium text-slate-800 dark:text-slate-200">
          Buat Penyesuaian Baru
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Buat Penyesuaian Stok Manual
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Pencatatan mutasi penyesuaian (ADJUST_IN / ADJUST_OUT) di luar stock opname. Wajib
          memiliki alasan jelas.
        </p>

        {!isAuthorized && currentUser && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300">
            Peran Anda ({currentUser.role}) tidak diizinkan. Hanya <strong>Manager</strong> atau{' '}
            <strong>Admin</strong> yang berhak melakukan penyesuaian stok manual.
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Reason Category */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Kategori Alasan Penyesuaian <span className="text-rose-500">*</span>
            </label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value as AdjustmentReasonCategory)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              {AdjustmentReasonCategoryEnum.options.map((cat) => (
                <option key={cat} value={cat}>
                  {AdjustmentReasonLabels[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Explanation Notes */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Uraian Alasan Penyesuaian (Wajib Diisi) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Pemusnahan 10 pcs produk yang kedaluwarsa sesuai berita acara BA-2026/01..."
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:placeholder-slate-600"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Wajib minimal 5 karakter sebagai penjelasan audit.
            </p>
          </div>

          <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
            <h2 className="text-sm font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
              Detail Barang &amp; Lokasi Penyesuaian
            </h2>
          </div>

          {/* Warehouse and Location */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Gudang
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Lokasi Rak
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id} disabled={loc.isFrozen}>
                    {loc.code} {loc.isFrozen ? '(DIBEKUKAN)' : ''}
                  </option>
                ))}
              </select>
              {selectedLocObj?.isFrozen && (
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  Lokasi ini sedang dibekukan karena proses opname dan tidak dapat dimutasi.
                </p>
              )}
            </div>
          </div>

          {/* Product and Batch */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Produk
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.sku}]
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Batch Stok di Rak Ini
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                disabled={isSubmitting || availableStocks.length === 0}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {availableStocks.length === 0 ? (
                  <option value="">(Tidak ada stok di lokasi ini)</option>
                ) : (
                  availableStocks.map((s) => (
                    <option key={s.batch.id} value={s.batch.id}>
                      {s.batch.batchNo} · Stok: {s.quantity}{' '}
                      {s.batch.expiryDate
                        ? `· Exp: ${new Date(s.batch.expiryDate).toLocaleDateString('id-ID')}`
                        : ''}
                    </option>
                  ))
                )}
              </select>
              {currentStockRow && (
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Stok sistem saat ini:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {currentStockRow.quantity}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* Movement Type & Quantity */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Arah Penyesuaian
              </label>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-300">
                  <input
                    type="radio"
                    name="movementType"
                    value="ADJUST_OUT"
                    checked={movementType === 'ADJUST_OUT'}
                    onChange={() => setMovementType('ADJUST_OUT')}
                    className="text-rose-500 focus:ring-rose-400"
                  />
                  - ADJUST OUT (Pengurangan)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <input
                    type="radio"
                    name="movementType"
                    value="ADJUST_IN"
                    checked={movementType === 'ADJUST_IN'}
                    onChange={() => setMovementType('ADJUST_IN')}
                    className="text-emerald-500 focus:ring-emerald-400"
                  />
                  + ADJUST IN (Penambahan)
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Jumlah Mutasi (Bilangan Bulat) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {/* Item Extra Note */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Catatan Khusus Item (Opsional)
            </label>
            <input
              type="text"
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              placeholder="Contoh: Dus basah saat pengiriman..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:placeholder-slate-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Link href="/stock-adjustments">
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Batal
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !isAuthorized || (selectedLocObj?.isFrozen ?? false)}
              className={
                movementType === 'ADJUST_OUT'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }
            >
              {isSubmitting ? 'Memproses Mutasi...' : 'Eksekusi Penyesuaian Stok'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
