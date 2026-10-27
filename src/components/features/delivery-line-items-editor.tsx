'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarcodeScannerModal } from '@/components/features/barcode-scanner-modal';

export interface ProductOption {
  id: string;
  sku: string;
  barcode?: string | null;
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
  daysRemaining?: number | null;
  isNearExpiry?: boolean;
}

interface DeliveryLineItemsEditorProps {
  items: DeliveryLineItemRow[];
  onChange: (items: DeliveryLineItemRow[]) => void;
  products: ProductOption[];
  locations: LocationOption[];
  warehouseId: string;
  disabled?: boolean;
}

let deliveryKeyCounter = 0;
function getNextDeliveryKey(): string {
  deliveryKeyCounter += 1;
  return `deliv-${deliveryKeyCounter}`;
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

  // Barcode scanning states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [quickBarcodeInput, setQuickBarcodeInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleScanBarcode = (code: string): boolean => {
    const clean = code.trim().toLowerCase();
    if (!clean) return false;

    // Search product by barcode or SKU
    const matchedProduct = products.find(
      (p) => (p.barcode && p.barcode.toLowerCase() === clean) || p.sku.toLowerCase() === clean,
    );

    if (matchedProduct) {
      const existingIndex = items.findIndex((it) => it.productId === matchedProduct.id);
      if (existingIndex !== -1) {
        const currentQty = Number(items[existingIndex]?.quantity) || 1;
        handleUpdateItem(existingIndex, { quantity: currentQty + 1 });
        setScanFeedback({
          text: `+1 Qty: ${matchedProduct.name} (Total: ${currentQty + 1})`,
          type: 'success',
        });
      } else {
        const defaultLocation = availableLocations[0];
        const newItem: DeliveryLineItemRow = {
          key: getNextDeliveryKey(),
          productId: matchedProduct.id,
          locationId: defaultLocation?.id || '',
          batchId: '', // Automatic FEFO
          quantity: 1,
        };
        onChange([...items, newItem]);
        setScanFeedback({
          text: `Ditambahkan ke pengiriman: ${matchedProduct.name}`,
          type: 'success',
        });
      }
      return true;
    }

    // Check if location was scanned
    const matchedLocation = availableLocations.find((l) => l.code.toLowerCase() === clean);
    if (matchedLocation && items.length > 0) {
      handleUpdateItem(items.length - 1, { locationId: matchedLocation.id });
      setScanFeedback({
        text: `Lokasi rak asal diatur ke ${matchedLocation.code}`,
        type: 'success',
      });
      return true;
    }

    setScanFeedback({
      text: `Barcode '${code}' tidak ditemukan di katalog produk atau lokasi rak gudang`,
      type: 'error',
    });
    return false;
  };

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
      key: getNextDeliveryKey(),
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Input
                placeholder="Scan / Ketik barcode..."
                value={quickBarcodeInput}
                onChange={(e) => setQuickBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (quickBarcodeInput.trim()) {
                      handleScanBarcode(quickBarcodeInput.trim());
                      setQuickBarcodeInput('');
                    }
                  }
                }}
                disabled={disabled}
                className="h-8 w-44 font-mono text-xs"
              />
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsScannerOpen(true)}
              disabled={disabled || products.length === 0}
              className="h-8 gap-1.5 border-indigo-200 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Scan Kamera HP
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              disabled={products.length === 0 || availableLocations.length === 0}
              className="h-8 text-xs sm:self-auto"
            >
              + Tambah Baris
            </Button>
          </div>
        )}
      </div>

      {/* Scan Feedback Banner */}
      {scanFeedback && (
        <div
          className={`flex items-center justify-between rounded-md p-2.5 text-xs font-medium ${
            scanFeedback.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{scanFeedback.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{scanFeedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setScanFeedback(null)}
            className="ml-2 text-slate-400 hover:text-slate-700"
          >
            &times;
          </button>
        </div>
      )}

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
                          const expiryNote = b.isNearExpiry
                            ? ` ⚠️ [Hampir Expired - Sisa ${b.daysRemaining} hari]`
                            : b.daysRemaining !== null && b.daysRemaining !== undefined
                              ? ` [Sisa ${b.daysRemaining} hari]`
                              : '';
                          return (
                            <option key={b.batchId} value={b.batchId}>
                              {b.isFefoRecommended ? '★ [FEFO] ' : ''}
                              {b.batchNo} | Exp: {expStr}
                              {expiryNote} (Stok: {b.availableQuantity})
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

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanBarcode}
        title="Scan Barcode Barang Keluar (DO)"
        subtitle="Arahkan kamera HP ke barcode kemasan barang yang akan dikirim"
      />
    </div>
  );
}
