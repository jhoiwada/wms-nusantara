'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ProductOption {
  id: string;
  sku: string;
  name: string;
  uom: string;
  trackExpiry: boolean;
}

export interface LocationOption {
  id: string;
  code: string;
  zone: string;
  rack: string;
  level: string;
  warehouseId: string;
  isFrozen: boolean;
  isActive: boolean;
}

export interface DeliveryLineItemRow {
  key: string;
  productId: string;
  locationId: string;
  batchId: string; // empty string = Otomatis (FEFO)
  quantity: number;
}

interface BatchOption {
  batchId: string;
  batchNo: string;
  expiryDate: string | null;
  availableQuantity: number;
  isFefoRecommended: boolean;
}

interface DeliveryLineItemsEditorProps {
  items: DeliveryLineItemRow[];
  onChange: (items: DeliveryLineItemRow[]) => void;
  products: ProductOption[];
  locations: LocationOption[];
  warehouseId: string;
  disabled?: boolean;
}

export function DeliveryLineItemsEditor({
  items,
  onChange,
  products,
  locations,
  warehouseId,
  disabled = false,
}: DeliveryLineItemsEditorProps) {
  // Available locations in chosen warehouse, active and unfrozen (BR-13, BR-22)
  const availableLocations = locations.filter(
    (loc) => loc.warehouseId === warehouseId && loc.isActive && !loc.isFrozen,
  );

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Cache available batches per productId+locationId
  const [batchesCache, setBatchesCache] = useState<Record<string, BatchOption[]>>({});
  const inFlightRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;

    for (const item of items) {
      if (item.productId && item.locationId) {
        const cacheKey = `${item.productId}_${item.locationId}`;
        if (!batchesCache[cacheKey] && !inFlightRef.current.has(cacheKey)) {
          inFlightRef.current.add(cacheKey);
          fetch(
            `/api/v1/delivery-orders/available-batches?productId=${item.productId}&locationId=${item.locationId}`,
          )
            .then((res) => (res.ok ? res.json() : { data: [] }))
            .then((res) => {
              if (isMounted) {
                setBatchesCache((prev) => ({ ...prev, [cacheKey]: res.data || [] }));
              }
            })
            .catch(() => {
              if (isMounted) {
                setBatchesCache((prev) => ({ ...prev, [cacheKey]: [] }));
              }
            })
            .finally(() => {
              inFlightRef.current.delete(cacheKey);
            });
        }
      }
    }

    return () => {
      isMounted = false;
    };
  }, [items, batchesCache]);

  const handleAddItem = () => {
    const defaultProduct = products[0];
    const defaultLocation = availableLocations[0];

    const newItem: DeliveryLineItemRow = {
      key: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productId: defaultProduct?.id || '',
      locationId: defaultLocation?.id || '',
      batchId: '', // Default to Otomatis (FEFO)
      quantity: 1,
    };

    onChange([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateItem = (index: number, patch: Partial<DeliveryLineItemRow>) => {
    const updated = items.map((row, i) => {
      if (i !== index) return row;
      const next = { ...row, ...patch };

      // If product or location changed, reset batch selection to Otomatis (FEFO)
      if (
        (patch.productId && patch.productId !== row.productId) ||
        (patch.locationId && patch.locationId !== row.locationId)
      ) {
        next.batchId = '';
      }

      return next;
    });

    onChange(updated);
  };

  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-2 border-b border-slate-200 pb-3 sm:flex-row sm:items-center dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold tracking-wider text-slate-900 uppercase dark:text-slate-100">
            Daftar Barang Keluar ({items.length} Item)
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Tentukan produk, lokasi rak asal, dan alokasi batch (FEFO otomatis atau manual).
          </p>
        </div>
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            disabled={products.length === 0 || availableLocations.length === 0}
            className="self-start text-xs sm:self-auto"
          >
            + Tambah Baris
          </Button>
        )}
      </div>

      {availableLocations.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Gudang yang dipilih belum memiliki lokasi rak aktif atau semua lokasi sedang dibekukan
          karena opname (BR-22).
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-200 py-8 text-center dark:border-slate-800">
          <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
            Belum ada item barang dalam dokumen ini.
          </p>
          {!disabled && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddItem}
              disabled={products.length === 0 || availableLocations.length === 0}
            >
              + Tambah Item Pertama
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <tr>
                <th className="w-12 px-3 py-2.5 text-center font-medium">#</th>
                <th className="min-w-[200px] px-3 py-2.5 font-medium">Produk *</th>
                <th className="min-w-[170px] px-3 py-2.5 font-medium">Lokasi Rak Asal *</th>
                <th className="min-w-[220px] px-3 py-2.5 font-medium">Alokasi Batch (BR-08)</th>
                <th className="w-28 px-3 py-2.5 text-right font-medium">Jumlah *</th>
                {!disabled && <th className="w-16 px-3 py-2.5 text-center font-medium">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
              {items.map((item, index) => {
                const prod = productMap.get(item.productId);
                const cacheKey = `${item.productId}_${item.locationId}`;
                const availableBatches = batchesCache[cacheKey] || [];
                const isBatchesLoaded = cacheKey in batchesCache;

                return (
                  <tr key={item.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <td className="px-3 py-2 text-center font-mono text-slate-400">{index + 1}</td>

                    {/* Product */}
                    <td className="px-3 py-2">
                      <select
                        aria-label={`Pilih produk baris ${index + 1}`}
                        value={item.productId}
                        disabled={disabled}
                        onChange={(e) => handleUpdateItem(index, { productId: e.target.value })}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:ring-1 focus:ring-slate-950 focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-slate-300"
                      >
                        <option value="">-- Pilih Produk --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {p.name} ({p.uom}){p.trackExpiry ? ' [FEFO]' : ''}
                          </option>
                        ))}
                      </select>
                      {prod && (
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span>Satuan: {prod.uom}</span>
                          {prod.trackExpiry && (
                            <span className="py-0.2 rounded border border-emerald-200 bg-emerald-50 px-1 font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                              Lacak Kedaluwarsa
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Location */}
                    <td className="px-3 py-2">
                      <select
                        aria-label={`Pilih lokasi rak baris ${index + 1}`}
                        value={item.locationId}
                        disabled={disabled}
                        onChange={(e) => handleUpdateItem(index, { locationId: e.target.value })}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:ring-1 focus:ring-slate-950 focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-slate-300"
                      >
                        <option value="">-- Pilih Lokasi --</option>
                        {availableLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.code} (Zona {loc.zone}, Rak {loc.rack}, Lv {loc.level})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Batch & FEFO */}
                    <td className="px-3 py-2">
                      <select
                        aria-label={`Pilih alokasi batch baris ${index + 1}`}
                        value={item.batchId}
                        disabled={disabled}
                        onChange={(e) => handleUpdateItem(index, { batchId: e.target.value })}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:ring-1 focus:ring-slate-950 focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-slate-300"
                      >
                        <option value="">
                          ⚡ Otomatis (FEFO - Prioritas Kedaluwarsa Terdekat)
                        </option>
                        {availableBatches.map((b) => {
                          const expStr = b.expiryDate
                            ? new Date(b.expiryDate).toLocaleDateString('id-ID')
                            : 'Tanpa Kadaluwarsa';
                          return (
                            <option key={b.batchId} value={b.batchId}>
                              {b.isFefoRecommended ? '★ ' : ''}
                              {b.batchNo} | Exp: {expStr} (Stok: {b.availableQuantity})
                            </option>
                          );
                        })}
                      </select>

                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        {item.productId && item.locationId && !isBatchesLoaded ? (
                          <span className="italic">Memuat batch tersedia...</span>
                        ) : availableBatches.length > 0 ? (
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            ✓ {availableBatches.length} batch tersedia di lokasi ini
                          </span>
                        ) : item.productId && item.locationId ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            Belum ada stok tercatat di lokasi ini
                          </span>
                        ) : (
                          <span>Pilih produk & lokasi untuk melihat batch</span>
                        )}
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity || ''}
                        disabled={disabled}
                        onChange={(e) =>
                          handleUpdateItem(index, {
                            quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                          })
                        }
                        className="h-8 text-right font-mono text-xs"
                      />
                    </td>

                    {/* Action */}
                    {!disabled && (
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="rounded p-1 text-rose-500 transition-colors hover:text-rose-700 dark:hover:text-rose-400"
                          title="Hapus baris"
                          aria-label={`Hapus baris ${index + 1}`}
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <tr>
                <td colSpan={4} className="px-3 py-2.5 text-right text-xs">
                  Total Jumlah Unit yang Dikirim:
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-sm text-slate-900 dark:text-slate-100">
                  {totalQuantity.toLocaleString('id-ID')}
                </td>
                {!disabled && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
