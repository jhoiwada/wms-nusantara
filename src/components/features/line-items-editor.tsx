'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ProductOption {
  id: string;
  sku: string;
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

  const handleAddItem = () => {
    const defaultProduct = products[0];
    const defaultLocation = availableLocations[0];

    const newItem: LineItemRow = {
      key: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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
            Tambah Baris Item
          </Button>
        )}
      </div>

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
                            onChange={(e) =>
                              handleUpdateItem(index, { expiryDate: e.target.value })
                            }
                            disabled={disabled}
                            required
                            className="h-7 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
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
    </div>
  );
}
