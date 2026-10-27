'use client';

import React, { useState } from 'react';
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
  costPrice: number | string;
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

export interface LineItemRow {
  key: string;
  productId: string;
  locationId: string;
  quantity: number;
  unitPrice: number;
  batchNo: string;
  expiryDate: string;
}

interface LineItemsEditorProps {
  items: LineItemRow[];
  onChange: (items: LineItemRow[]) => void;
  products: ProductOption[];
  locations: LocationOption[];
  warehouseId: string;
  disabled?: boolean;
}

let lineKeyCounter = 0;
function getNextLineKey(): string {
  lineKeyCounter += 1;
  return `item-${lineKeyCounter}`;
}

export function LineItemsEditor({
  items,
  onChange,
  products,
  locations,
  warehouseId,
  disabled = false,
}: LineItemsEditorProps) {
  // Filter locations belonging to the chosen warehouse and not frozen (BR-13, BR-22)
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
        const newItem: LineItemRow = {
          key: getNextLineKey(),
          productId: matchedProduct.id,
          locationId: defaultLocation?.id || '',
          quantity: 1,
          unitPrice: Number(matchedProduct.costPrice) || 0,
          batchNo: matchedProduct.trackExpiry ? '' : 'DEFAULT',
          expiryDate: '',
        };
        onChange([...items, newItem]);
        setScanFeedback({
          text: `Ditambahkan: ${matchedProduct.name}`,
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
        text: `Lokasi baris terakhir diatur ke ${matchedLocation.code}`,
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

  const handleAddItem = () => {
    const defaultProduct = products[0];
    const defaultLocation = availableLocations[0];

    const newItem: LineItemRow = {
      key: getNextLineKey(),
      productId: defaultProduct?.id || '',
      locationId: defaultLocation?.id || '',
      quantity: 1,
      unitPrice: Number(defaultProduct?.costPrice) || 0,
      batchNo: defaultProduct?.trackExpiry ? '' : 'DEFAULT',
      expiryDate: '',
    };

    onChange([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateItem = (index: number, patch: Partial<LineItemRow>) => {
    const updated = items.map((row, i) => {
      if (i !== index) return row;
      const next = { ...row, ...patch };

      // If product changed, update default batch, unitPrice, and clear expired
      if (patch.productId && patch.productId !== row.productId) {
        const prod = productMap.get(patch.productId);
        if (prod) {
          next.unitPrice = Number(prod.costPrice) || 0;
          if (prod.trackExpiry) {
            next.batchNo = '';
            next.expiryDate = '';
          } else {
            next.batchNo = 'DEFAULT';
            next.expiryDate = '';
          }
        }
      }

      return next;
    });

    onChange(updated);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalValue = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Daftar Item Barang ({items.length} Baris)
          </h3>
          <p className="text-xs text-slate-500">
            Tentukan produk, lokasi rak simpan, kuantitas, dan konfigurasi batch kedaluwarsa (BR-06,
            BR-07, BR-13).
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
              className="h-8 gap-1.5 border-indigo-200 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-50"
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
              size="sm"
              onClick={handleAddItem}
              disabled={products.length === 0 || availableLocations.length === 0}
              className="h-8 gap-1.5 text-xs"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Tambah Baris
            </Button>
          </div>
        )}
      </div>

      {/* Scan Feedback Banner */}
      {scanFeedback && (
        <div
          className={`flex items-center justify-between rounded-md p-2.5 text-xs font-medium ${
            scanFeedback.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-rose-200 bg-rose-50 text-rose-800'
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          ⚠️ Tidak ada lokasi rak aktif di gudang yang dipilih. Silakan buat lokasi rak di Master
          Gudang terlebih dahulu.
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 text-center">
          <svg
            className="mx-auto mb-2 h-8 w-8 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <p className="text-xs font-semibold text-slate-700">Belum ada item ditambahkan</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Tekan tombol &quot;Tambah Baris Item&quot; di atas untuk mengisi barang yang diterima.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <th className="w-12 px-3 py-2.5 text-center">#</th>
                <th className="min-w-[200px] px-3 py-2.5">Produk & SKU</th>
                <th className="min-w-[160px] px-3 py-2.5">Lokasi Rak (BR-13)</th>
                <th className="w-28 px-3 py-2.5">Kuantitas</th>
                <th className="min-w-[160px] px-3 py-2.5">Batch Kedaluwarsa (BR-06)</th>
                <th className="w-32 px-3 py-2.5">Harga Beli</th>
                <th className="w-32 px-3 py-2.5 text-right">Subtotal</th>
                {!disabled && <th className="w-12 px-3 py-2.5 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row, index) => {
                const prod = productMap.get(row.productId);
                const isTrackExpiry = prod?.trackExpiry ?? false;
                const subtotal = (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);

                return (
                  <tr key={row.key} className="transition-colors hover:bg-slate-50/60">
                    {/* Index */}
                    <td className="px-3 py-2 text-center font-mono text-slate-400">{index + 1}</td>

                    {/* Product */}
                    <td className="px-3 py-2">
                      <select
                        value={row.productId}
                        onChange={(e) => handleUpdateItem(index, { productId: e.target.value })}
                        disabled={disabled}
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} — {p.name} {p.trackExpiry ? '(FEFO)' : ''}
                          </option>
                        ))}
                      </select>
                      {prod?.trackExpiry ? (
                        <span className="py-0.2 mt-1 inline-block rounded border border-amber-200 bg-amber-50 px-1.5 text-[10px] font-medium text-amber-700">
                          FEFO Expired Aktif
                        </span>
                      ) : null}
                    </td>

                    {/* Location */}
                    <td className="px-3 py-2">
                      <select
                        value={row.locationId}
                        onChange={(e) => handleUpdateItem(index, { locationId: e.target.value })}
                        disabled={disabled}
                        className="h-8 w-full rounded border border-slate-300 bg-white px-2 font-mono text-xs text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        {availableLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.code} (Z:{loc.zone} R:{loc.rack} L:{loc.level})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Quantity */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) =>
                            handleUpdateItem(index, {
                              quantity: Math.max(1, parseInt(e.target.value) || 1),
                            })
                          }
                          disabled={disabled}
                          className="h-8 w-20 font-mono text-xs"
                        />
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">
                          {prod?.uom || 'PCS'}
                        </span>
                      </div>
                    </td>

                    {/* Batch & Expiry */}
                    <td className="px-3 py-2">
                      {isTrackExpiry ? (
                        <div className="space-y-1.5">
                          <Input
                            placeholder="Nomor Batch (mis. B2026A)"
                            value={row.batchNo === 'DEFAULT' ? '' : row.batchNo}
                            onChange={(e) =>
                              handleUpdateItem(index, { batchNo: e.target.value.toUpperCase() })
                            }
                            disabled={disabled}
                            required
                            className="h-7 font-mono text-xs uppercase"
                          />
                          <input
                            type="date"
                            value={row.expiryDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) =>
                              handleUpdateItem(index, { expiryDate: e.target.value })
                            }
                            disabled={disabled}
                            required
                            className="h-7 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                          {row.expiryDate && (
                            <div className="text-[10px]">
                              {(() => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const exp = new Date(row.expiryDate);
                                exp.setHours(0, 0, 0, 0);
                                const days = Math.ceil(
                                  (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                                );
                                return days >= 0 ? (
                                  <span
                                    className={
                                      days <= 30 ? 'font-medium text-amber-600' : 'text-slate-500'
                                    }
                                  >
                                    {days <= 30 ? '⚠️ ' : ''}Masa simpan: {days} hari
                                  </span>
                                ) : (
                                  <span className="font-semibold text-rose-600">
                                    Tanggal sudah terlewati!
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-1">
                          <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            DEFAULT (Non-Expired)
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Unit Price */}
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        value={row.unitPrice}
                        onChange={(e) =>
                          handleUpdateItem(index, {
                            unitPrice: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        disabled={disabled}
                        className="h-8 font-mono text-xs"
                      />
                    </td>

                    {/* Subtotal */}
                    <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                      {formatRupiah(subtotal)}
                    </td>

                    {/* Remove Action */}
                    {!disabled && (
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="rounded p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title="Hapus baris"
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
            {/* Table Summary Footer */}
            <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-800">
              <tr>
                <td colSpan={3} className="px-3 py-2.5 text-right">
                  Total Ringkasan:
                </td>
                <td className="px-3 py-2.5 font-mono text-indigo-700">
                  {totalQuantity.toLocaleString('id-ID')} Item
                </td>
                <td colSpan={2} className="px-3 py-2.5 text-right">
                  Total Nilai Barang:
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">
                  {formatRupiah(totalValue)}
                </td>
                {!disabled && <td />}
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
        title="Scan Barcode Barang Masuk (GR)"
        subtitle="Arahkan kamera HP ke barcode kemasan barang atau label rak"
      />
    </div>
  );
}
