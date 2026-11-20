'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  LineItemsEditor,
  type LineItemRow,
  type ProductOption,
  type LocationOption,
} from '@/components/features/line-items-editor';

interface SupplierOption {
  id: string;
  code: string;
  name: string;
}

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}

export default function NewGoodsReceiptPage() {
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(true);

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItemRow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Load all master data for the form
  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetch('/api/v1/suppliers?activeOnly=true&pageSize=100').then((r) => r.json()),
      fetch('/api/v1/warehouses?activeOnly=true&pageSize=100').then((r) => r.json()),
      fetch('/api/v1/products?activeOnly=true&pageSize=100').then((r) => r.json()),
      fetch('/api/v1/locations?activeOnly=true&pageSize=200').then((r) => r.json()),
    ])
      .then(([supJson, whJson, prodJson, locJson]) => {
        if (!isMounted) return;

        if (supJson.data) {
          setSuppliers(supJson.data);
          if (supJson.data.length > 0) setSupplierId(supJson.data[0].id);
        }

        if (whJson.data) {
          setWarehouses(whJson.data);
          if (whJson.data.length > 0) setWarehouseId(whJson.data[0].id);
        }

        if (prodJson.data) setProducts(prodJson.data);
        if (locJson.data) setLocations(locJson.data);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingMaster(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!supplierId) {
      setFormError('Supplier wajib dipilih');
      return;
    }

    if (!warehouseId) {
      setFormError('Gudang tujuan wajib dipilih');
      return;
    }

    if (items.length === 0) {
      setFormError('Minimal harus ada 1 item barang yang diterima');
      return;
    }

    // Client-side rule check
    for (const [i, it] of items.entries()) {
      const prod = products.find((p) => p.id === it.productId);
      if (prod?.trackExpiry) {
        if (!it.batchNo || it.batchNo === 'DEFAULT') {
          setFormError(`Baris #${i + 1}: Produk '${prod.name}' wajib mengisi nomor batch.`);
          return;
        }
        if (!it.expiryDate) {
          setFormError(`Baris #${i + 1}: Produk '${prod.name}' wajib mengisi tanggal kedaluwarsa.`);
          return;
        }
      }
    }

    const payload = {
      supplierId,
      warehouseId,
      receivedAt: receivedAt || null,
      notes: notes.trim() || null,
      items: items.map((it) => ({
        productId: it.productId,
        locationId: it.locationId,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        batchNo: it.batchNo || 'DEFAULT',
        expiryDate: it.expiryDate || null,
      })),
    };

    startTransition(async () => {
      try {
        const res = await fetch('/api/v1/goods-receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok) {
          setFormError(json.error?.message || 'Gagal membuat dokumen penerimaan barang');
          return;
        }

        // Navigate to document detail
        router.push(`/goods-receipts/${json.data.id}`);
      } catch {
        setFormError('Terjadi kesalahan koneksi jaringan');
      }
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Link
              href="/goods-receipts"
              className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              Penerimaan Barang
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Buat Baru</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Penerimaan Barang Baru (GR Draft)
          </h1>
        </div>

        <Link href="/goods-receipts">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Kembali
          </Button>
        </Link>
      </div>

      {formError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <svg
            className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400"
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
          {formError}
        </div>
      )}

      {isLoadingMaster ? (
        <div className="py-20 text-center text-xs text-slate-500 dark:text-slate-400">
          Memuat data master supplier, gudang, dan katalog produk...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Document Header Card */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="border-b border-slate-100 pb-3 text-sm font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">
              Informasi Pengiriman & Pemasok
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Supplier */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pemasok / Supplier <span className="text-rose-500">*</span>
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  required
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Warehouse */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Gudang Tujuan Masuk <span className="text-rose-500">*</span>
                </label>
                <select
                  value={warehouseId}
                  onChange={(e) => {
                    setWarehouseId(e.target.value);
                    // Clear items if warehouse changed to preserve BR-13
                    setItems([]);
                  }}
                  required
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Lokasi rak item otomatis dibatasi hanya pada fasilitas gudang yang dipilih.
                </p>
              </div>

              {/* Received Date */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tanggal Kedatangan Barang
                </label>
                <Input
                  type="date"
                  value={receivedAt}
                  onChange={(e) => setReceivedAt(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Catatan Dokumen / No. Surat Jalan Supplier (Opsional)
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="mis. PO-2026-091, Surat Jalan SJ/IND/88712"
                className="text-xs"
              />
            </div>
          </div>

          {/* Line Items Editor Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <LineItemsEditor
              items={items}
              onChange={setItems}
              products={products}
              locations={locations}
              warehouseId={warehouseId}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
            <Link href="/goods-receipts">
              <Button type="button" variant="ghost">
                Batal
              </Button>
            </Link>

            <Button type="submit" isLoading={isPending} className="gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Simpan Dokumen DRAFT
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
