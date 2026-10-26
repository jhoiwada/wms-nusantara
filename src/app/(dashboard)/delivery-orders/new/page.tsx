'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DeliveryLineItemsEditor,
  type DeliveryLineItemRow,
  type ProductOption,
  type LocationOption,
} from '@/components/features/delivery-line-items-editor';

interface CustomerOption {
  id: string;
  code: string;
  name: string;
}

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}

export default function NewDeliveryOrderPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(true);

  // Form states
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DeliveryLineItemRow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Load all master data for the form
  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetch('/api/v1/customers?activeOnly=true&pageSize=100').then((r) => r.json()),
      fetch('/api/v1/warehouses?activeOnly=true&pageSize=100').then((r) => r.json()),
      fetch('/api/v1/products?activeOnly=true&pageSize=100').then((r) => r.json()),
      fetch('/api/v1/locations?activeOnly=true&pageSize=200').then((r) => r.json()),
    ])
      .then(([custJson, whJson, prodJson, locJson]) => {
        if (!isMounted) return;

        if (custJson.data) {
          setCustomers(custJson.data);
          if (custJson.data.length > 0) setCustomerId(custJson.data[0].id);
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

    if (!customerId) {
      setFormError('Customer wajib dipilih');
      return;
    }

    if (!warehouseId) {
      setFormError('Gudang asal wajib dipilih');
      return;
    }

    if (items.length === 0) {
      setFormError('Minimal harus ada 1 item barang yang dikirim');
      return;
    }

    for (const [idx, item] of items.entries()) {
      if (!item.productId) {
        setFormError(`Baris ${idx + 1}: Produk belum dipilih`);
        return;
      }
      if (!item.locationId) {
        setFormError(`Baris ${idx + 1}: Lokasi rak asal belum dipilih`);
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        setFormError(`Baris ${idx + 1}: Jumlah barang harus lebih besar dari 0 (BR-03)`);
        return;
      }
    }

    startTransition(async () => {
      try {
        const payload = {
          customerId,
          warehouseId,
          notes: notes.trim() || undefined,
          items: items.map((it) => ({
            productId: it.productId,
            locationId: it.locationId,
            batchId: it.batchId.trim() || null,
            quantity: it.quantity,
          })),
        };

        const res = await fetch('/api/v1/delivery-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.message || 'Gagal membuat dokumen Delivery Order');
        }

        router.push(`/delivery-orders/${json.data.id}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
        setFormError(message);
      }
    });
  };

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Link
              href="/delivery-orders"
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              ← Kembali ke Daftar DO
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Buat Dokumen Pengiriman Baru (DO)
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Dokumen akan berstatus DRAFT dan nomor dokumen diberikan secara otomatis (BR-15, BR-16).
            Stok baru dikurangi saat status diubah ke SHIPPED.
          </p>
        </div>
      </div>

      {formError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="mb-0.5 font-semibold">Terjadi Kesalahan:</div>
          <div>{formError}</div>
        </div>
      )}

      {isLoadingMaster ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400">
          Memuat data master...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card: Informasi Utama */}
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h2 className="border-b border-slate-100 pb-2 text-sm font-semibold tracking-wider text-slate-900 uppercase dark:border-slate-800 dark:text-slate-100">
              Informasi Pengiriman
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Customer */}
              <div>
                <label
                  htmlFor="customer-select"
                  className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Customer Penerima *
                </label>
                <select
                  id="customer-select"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:ring-slate-950 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-slate-300"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                {customers.length === 0 && (
                  <p className="mt-1 text-xs text-rose-500">
                    Belum ada data customer aktif. Harap input master customer terlebih dahulu.
                  </p>
                )}
              </div>

              {/* Warehouse */}
              <div>
                <label
                  htmlFor="warehouse-select"
                  className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Gudang Asal Barang *
                </label>
                <select
                  id="warehouse-select"
                  value={warehouseId}
                  onChange={(e) => {
                    setWarehouseId(e.target.value);
                    setItems([]); // Clear line items when warehouse changes to prevent invalid location cross-referencing
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:ring-slate-950 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-slate-300"
                >
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="notes-input"
                  className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Catatan / Keterangan Pengiriman (Opsional)
                </label>
                <Input
                  id="notes-input"
                  placeholder="Mis. Nomor PO Customer, alamat pengantaran, atau ekspedisi..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={255}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Card: Item Barang Keluar */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <DeliveryLineItemsEditor
              items={items}
              onChange={setItems}
              products={products}
              locations={locations}
              warehouseId={warehouseId}
              disabled={isPending}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/delivery-orders">
              <Button type="button" variant="outline" disabled={isPending}>
                Batal
              </Button>
            </Link>
            <Button type="submit" disabled={isPending || items.length === 0}>
              {isPending ? 'Menyimpan Draft...' : 'Simpan Draft DO'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
