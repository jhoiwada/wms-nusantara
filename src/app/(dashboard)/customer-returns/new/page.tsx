'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CustomerReturnReasonLabels,
  type CustomerReturnReasonType,
} from '@/schemas/customer-return.schema';
import type { ReturnableDeliveryOrderItem } from '@/server/services/customer-return.service';

interface ShippedDOOption {
  id: string;
  orderNo: string;
  shippedAt: string | null;
  customer: {
    id: string;
    code: string;
    name: string;
  };
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  _count: {
    items: number;
  };
}

interface ReturnableItem {
  productId: string;
  productSku: string;
  productName: string;
  uom: string;
  batchId: string;
  batchNo: string;
  expiryDate: string | null;
  shippedLocationId: string;
  shippedLocationCode: string;
  shippedQuantity: number;
  returnedQuantity: number;
  returnableQuantity: number;
  // Form input states
  isSelected: boolean;
  returnQty: number;
  targetLocationId: string;
  itemNotes: string;
}

interface WarehouseLocationOption {
  id: string;
  code: string;
  zone: string;
  rack: string;
  level: string;
  isFrozen: boolean;
}

export default function NewCustomerReturnPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Step 1: DO selection
  const [shippedDOs, setShippedDOs] = useState<ShippedDOOption[]>([]);
  const [selectedDoId, setSelectedDoId] = useState<string>('');
  const [isDosLoading, setIsDosLoading] = useState(true);

  // Step 2: Loaded DO return details
  const [returnItems, setReturnItems] = useState<ReturnableItem[]>([]);
  const [availableLocations, setAvailableLocations] = useState<WarehouseLocationOption[]>([]);
  const [customerInfo, setCustomerInfo] = useState<{
    id: string;
    name: string;
    code: string;
  } | null>(null);
  const [warehouseInfo, setWarehouseInfo] = useState<{
    id: string;
    name: string;
    code: string;
  } | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  // Step 3: Return reason & general notes
  const [reasonCategory, setReasonCategory] = useState<CustomerReturnReasonType>('DAMAGED');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Load available shipped DOs on mount
  useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/customer-returns/delivery-orders')
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.data) {
          setShippedDOs(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsDosLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // When a DO is selected, load its items and returnable quantities
  const handleSelectDO = async (doId: string) => {
    setSelectedDoId(doId);
    setFormError(null);
    if (!doId) {
      setReturnItems([]);
      setCustomerInfo(null);
      setWarehouseInfo(null);
      return;
    }

    try {
      setIsDetailsLoading(true);
      const res = await fetch(`/api/v1/customer-returns/delivery-orders/${doId}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal memuat rincian DO');
      }

      const data = json.data;
      setCustomerInfo(data.customer);
      setWarehouseInfo(data.warehouse);
      setAvailableLocations(data.warehouse.locations || []);

      const mapped: ReturnableItem[] = data.items.map((i: ReturnableDeliveryOrderItem) => ({
        ...i,
        expiryDate: i.expiryDate ? String(i.expiryDate) : null,
        isSelected: i.returnableQuantity > 0,
        returnQty: i.returnableQuantity > 0 ? 1 : 0,
        targetLocationId: i.shippedLocationId,
        itemNotes: '',
      }));
      setReturnItems(mapped);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal memuat data DO');
    } finally {
      setIsDetailsLoading(false);
    }
  };

  // Item handlers
  const handleToggleItem = (index: number) => {
    setReturnItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, isSelected: !item.isSelected } : item)),
    );
  };

  const handleUpdateQty = (index: number, qty: number) => {
    setReturnItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, returnQty: Math.max(0, qty) } : item)),
    );
  };

  const handleUpdateLocation = (index: number, locId: string) => {
    setReturnItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, targetLocationId: locId } : item)),
    );
  };

  const handleUpdateItemNotes = (index: number, val: string) => {
    setReturnItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, itemNotes: val } : item)),
    );
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedDoId) {
      setFormError('Pilih Delivery Order (DO) yang akan diretur terlebih dahulu.');
      return;
    }

    const selectedItems = returnItems.filter((i) => i.isSelected && i.returnQty > 0);
    if (selectedItems.length === 0) {
      setFormError('Pilih minimal 1 item barang yang akan diretur dengan kuantitas > 0.');
      return;
    }

    for (const item of selectedItems) {
      if (item.returnQty > item.returnableQuantity) {
        setFormError(
          `Kuantitas retur (${item.returnQty} ${item.uom}) untuk '${item.productName}' melebihi batas maksimal sisa (${item.returnableQuantity} ${item.uom}).`,
        );
        return;
      }
      if (!item.targetLocationId) {
        setFormError(`Pilih lokasi rak tujuan pengembalian untuk '${item.productName}'.`);
        return;
      }
    }

    if (!notes.trim() || notes.trim().length < 5) {
      setFormError('Keterangan & alasan retur wajib diisi minimal 5 karakter (BR-18).');
      return;
    }

    const payload = {
      deliveryOrderId: selectedDoId,
      reasonCategory,
      notes: notes.trim(),
      items: selectedItems.map((i) => ({
        productId: i.productId,
        batchId: i.batchId,
        locationId: i.targetLocationId,
        quantity: i.returnQty,
        itemNotes: i.itemNotes.trim() || undefined,
      })),
    };

    startTransition(async () => {
      try {
        const res = await fetch('/api/v1/customer-returns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok) {
          setFormError(json.error?.message || 'Gagal memproses retur customer');
          return;
        }

        const returnNo = json.data?.returnNo;
        if (returnNo) {
          router.push(`/customer-returns/${encodeURIComponent(returnNo)}`);
        } else {
          router.push('/customer-returns');
        }
      } catch {
        setFormError('Terjadi kesalahan jaringan');
      }
    });
  };

  const selectedCount = returnItems.filter((i) => i.isSelected && i.returnQty > 0).length;
  const totalReturnUnits = returnItems
    .filter((i) => i.isSelected)
    .reduce((sum, i) => sum + (Number(i.returnQty) || 0), 0);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/customer-returns"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              ← Kembali ke Daftar Retur
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Penerimaan Retur Customer
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Form penerimaan kembali barang dari customer berdasarkan dokumen Delivery Order (DO)
            yang telah terkirim (BR-18).
          </p>
        </div>
      </div>

      {formError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 shadow-sm">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-rose-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <strong>Terjadi Kesalahan:</strong>
          </div>
          <p className="mt-1 ml-6">{formError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Shipped Delivery Order */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              1
            </span>
            <h2 className="text-sm font-bold text-slate-900">Pilih Delivery Order (DO) Terkirim</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Pilih Dokumen DO (Status SHIPPED) <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedDoId}
                onChange={(e) => handleSelectDO(e.target.value)}
                disabled={isDosLoading || isPending}
                aria-label="Pilih Delivery Order"
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- Pilih Nomor DO Terkirim --</option>
                {shippedDOs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.orderNo} — {d.customer.name} ({d.warehouse.name})
                  </option>
                ))}
              </select>
              {isDosLoading && (
                <p className="mt-1 text-[11px] text-slate-400">Memuat daftar DO terkirim...</p>
              )}
            </div>

            {customerInfo && warehouseInfo && (
              <div className="space-y-1 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-xs">
                <div>
                  <span className="text-slate-500">Customer:</span>{' '}
                  <strong className="text-slate-900">{customerInfo.name}</strong> (
                  {customerInfo.code})
                </div>
                <div>
                  <span className="text-slate-500">Gudang Asal DO:</span>{' '}
                  <strong className="text-slate-900">{warehouseInfo.name}</strong> (
                  {warehouseInfo.code})
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Items Table */}
        {selectedDoId && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  2
                </span>
                <h2 className="text-sm font-bold text-slate-900">
                  Rincian Barang yang Diretur ({selectedCount} dipilih, +{totalReturnUnits} unit)
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                Centang item dan tentukan jumlah yang dikembalikan
              </span>
            </div>

            {isDetailsLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Memuat rincian item barang dari DO...
              </div>
            ) : returnItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Semua item pada DO ini telah selesai diretur sebelumnya.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full rounded-lg border border-slate-200 text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase">
                    <tr>
                      <th className="w-10 p-3 text-center">Pilih</th>
                      <th className="p-3">Produk &amp; SKU</th>
                      <th className="p-3">Batch &amp; Expired</th>
                      <th className="p-3 text-right">Terkirim</th>
                      <th className="p-3 text-right">Sudah Diretur</th>
                      <th className="p-3 text-right">Maks Sisa</th>
                      <th className="w-28 p-3 text-right">Jumlah Retur</th>
                      <th className="w-44 p-3">Lokasi Rak Masuk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returnItems.map((item, idx) => {
                      const isDisabled = item.returnableQuantity <= 0;
                      return (
                        <tr
                          key={`${item.productId}-${item.batchId}-${idx}`}
                          className={item.isSelected ? 'bg-indigo-50/30' : 'opacity-70'}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.isSelected}
                              disabled={isDisabled || isPending}
                              onChange={() => handleToggleItem(idx)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-900">{item.productName}</div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {item.productSku}
                            </div>
                            {item.isSelected && (
                              <input
                                type="text"
                                placeholder="Catatan kondisi item..."
                                value={item.itemNotes}
                                disabled={isDisabled || isPending}
                                onChange={(e) => handleUpdateItemNotes(idx, e.target.value)}
                                className="mt-1 h-6 w-full rounded border border-slate-200 px-1.5 text-[10px] text-slate-600 focus:border-indigo-500 focus:outline-none"
                              />
                            )}
                          </td>
                          <td className="p-3">
                            <div className="font-mono font-medium text-slate-800">
                              {item.batchNo}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {item.expiryDate
                                ? new Date(item.expiryDate).toLocaleDateString('id-ID')
                                : 'No Expiry'}
                            </div>
                          </td>
                          <td className="p-3 text-right font-medium text-slate-700">
                            {item.shippedQuantity} {item.uom}
                          </td>
                          <td className="p-3 text-right text-slate-500">
                            {item.returnedQuantity} {item.uom}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            {item.returnableQuantity} {item.uom}
                          </td>
                          <td className="p-3 text-right">
                            <Input
                              type="number"
                              min={1}
                              max={item.returnableQuantity}
                              disabled={!item.isSelected || isDisabled || isPending}
                              value={item.returnQty}
                              onChange={(e) => handleUpdateQty(idx, parseInt(e.target.value) || 0)}
                              className="h-8 text-right text-xs font-bold"
                            />
                          </td>
                          <td className="p-3">
                            <select
                              value={item.targetLocationId}
                              disabled={!item.isSelected || isDisabled || isPending}
                              onChange={(e) => handleUpdateLocation(idx, e.target.value)}
                              aria-label={`Lokasi tujuan untuk ${item.productName}`}
                              className="h-8 w-full rounded border border-slate-300 bg-white px-2 font-mono text-xs text-slate-800"
                            >
                              {availableLocations.map((loc) => (
                                <option key={loc.id} value={loc.id} disabled={loc.isFrozen}>
                                  {loc.code} {loc.isFrozen ? '(Dibekukan)' : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Reason & General Notes */}
        {selectedDoId && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                3
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                Alasan &amp; Keterangan Retur (BR-18)
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Kategori Alasan Retur <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value as CustomerReturnReasonType)}
                  disabled={isPending}
                  aria-label="Kategori Alasan Retur"
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none"
                >
                  {Object.entries(CustomerReturnReasonLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Penjelasan &amp; Berita Acara Retur <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isPending}
                  required
                  rows={3}
                  placeholder="Contoh: Barang retur dari customer PT ABC dikarenakan 5 karton rusak penyok saat dibongkar di gudang customer..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Wajib diisi minimal 5 karakter sebagai dasar mutasi penerimaan kembali ke stok.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {selectedDoId && (
          <div className="flex items-center justify-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <Link href="/customer-returns">
              <Button type="button" variant="outline" disabled={isPending}>
                Batal
              </Button>
            </Link>

            <Button type="submit" disabled={isPending || selectedCount === 0} className="gap-2">
              {isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Memproses Retur...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Terima Retur &amp; Tambah Stok ({totalReturnUnits} Unit)
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
