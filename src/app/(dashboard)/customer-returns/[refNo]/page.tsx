'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ReturnDetailMovementItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  categoryName: string;
  uom: string;
  batchNo: string;
  expiryDate: string | null;
  locationId: string;
  locationCode: string;
  quantity: number;
  balanceAfter: number;
  notes: string | null;
}

interface CustomerReturnDetail {
  returnNo: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
    email: string;
  };
  rawNotes: string | null;
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  deliveryOrder: {
    id: string;
    orderNo: string;
    customer: {
      id: string;
      code: string;
      name: string;
    };
    shippedAt: string | null;
  } | null;
  items: ReturnDetailMovementItem[];
  totalUnits: number;
}

export default function CustomerReturnDetailPage() {
  const params = useParams();
  const refNo = params?.refNo ? decodeURIComponent(params.refNo as string) : '';

  const [data, setData] = useState<CustomerReturnDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!refNo) return;
    let isMounted = true;
    fetch(`/api/v1/customer-returns/${encodeURIComponent(refNo)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Dokumen retur tidak ditemukan');
        return res.json();
      })
      .then((json) => {
        if (isMounted && json.data) {
          setData(json.data);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refNo]);

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/customer-returns"
          className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Kembali ke Daftar Retur
        </Link>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <h2 className="text-base font-bold text-rose-900 dark:text-rose-300">
            Dokumen Tidak Ditemukan
          </h2>
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            {error || 'Data retur tidak tersedia'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/customer-returns"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              ← Kembali ke Daftar Retur
            </Link>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Dokumen Retur {data.returnNo}
            </h1>
            <Badge variant="success">Diterima (IN)</Badge>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Diterima pada{' '}
            {new Date(data.createdAt).toLocaleString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            oleh{' '}
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{data.user.name}</span>{' '}
            ({data.user.role})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Cetak Berita Acara
          </Button>

          <Link href="/customer-returns/new">
            <Button size="sm">+ Buat Retur Baru</Button>
          </Link>
        </div>
      </div>

      {/* Info Card */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-200 bg-white p-5 text-xs shadow-xs sm:grid-cols-2 lg:grid-cols-4 dark:border-zinc-800 dark:bg-[#111113]">
        <div>
          <span className="text-zinc-500 dark:text-zinc-400">No. Delivery Order (DO):</span>
          <div className="mt-0.5">
            {data.deliveryOrder ? (
              <Link
                href={`/delivery-orders/${data.deliveryOrder.id}`}
                className="font-mono font-bold text-amber-600 hover:underline dark:text-amber-400"
              >
                {data.deliveryOrder.orderNo}
              </Link>
            ) : (
              <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">-</span>
            )}
          </div>
        </div>

        <div>
          <span className="text-zinc-500 dark:text-zinc-400">Customer:</span>
          <div className="mt-0.5 font-bold text-zinc-900 dark:text-zinc-100">
            {data.deliveryOrder?.customer.name || '-'}
          </div>
          <div className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
            {data.deliveryOrder?.customer.code}
          </div>
        </div>

        <div>
          <span className="text-zinc-500 dark:text-zinc-400">Gudang Penerimaan:</span>
          <div className="mt-0.5 font-bold text-zinc-900 dark:text-zinc-100">
            {data.warehouse.name}
          </div>
          <div className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
            {data.warehouse.code}
          </div>
        </div>

        <div>
          <span className="text-zinc-500 dark:text-zinc-400">Total Kuantitas Masuk:</span>
          <div className="mt-0.5 text-base font-bold text-emerald-600 dark:text-emerald-400">
            +{data.totalUnits.toLocaleString('id-ID')} unit
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {data.items.length} item barang
          </div>
        </div>
      </div>

      {/* Reason Card */}
      {data.rawNotes && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="font-bold text-amber-900 dark:text-amber-300">
            Keterangan &amp; Berita Acara:
          </div>
          <p className="mt-1 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
            {data.rawNotes}
          </p>
        </div>
      )}

      {/* Items Table */}
      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          Rincian Barang yang Diterima Kembali ke Stok
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full rounded-lg border border-zinc-200 text-left text-xs dark:border-zinc-800">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold text-zinc-600 uppercase dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
              <tr>
                <th className="p-3">SKU &amp; Nama Produk</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Batch &amp; Expired</th>
                <th className="p-3">Lokasi Rak Masuk</th>
                <th className="p-3 text-right">Kuantitas Retur</th>
                <th className="p-3 text-right">Saldo Berjalan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {data.items.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                  <td className="p-3">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.productName}
                    </div>
                    <div className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      {item.productSku}
                    </div>
                  </td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">{item.categoryName}</td>
                  <td className="p-3">
                    <div className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                      {item.batchNo}
                    </div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      {item.expiryDate
                        ? new Date(item.expiryDate).toLocaleDateString('id-ID')
                        : 'No Expiry'}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {item.locationCode}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    +{item.quantity} {item.uom}
                  </td>
                  <td className="p-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                    {item.balanceAfter} {item.uom}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
