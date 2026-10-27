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
          className="text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          ← Kembali ke Daftar Retur
        </Link>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <h2 className="text-base font-bold text-rose-900">Dokumen Tidak Ditemukan</h2>
          <p className="mt-1 text-xs text-rose-600">{error || 'Data retur tidak tersedia'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/customer-returns"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              ← Kembali ke Daftar Retur
            </Link>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Dokumen Retur {data.returnNo}
            </h1>
            <Badge variant="success">DITERIMA (IN)</Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Diterima pada{' '}
            {new Date(data.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            oleh {data.user.name} ({data.user.role})
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
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 text-xs shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="text-slate-500">No. Delivery Order (DO):</span>
          <div className="mt-0.5">
            {data.deliveryOrder ? (
              <Link
                href={`/delivery-orders/${data.deliveryOrder.id}`}
                className="font-mono font-bold text-indigo-600 hover:underline"
              >
                {data.deliveryOrder.orderNo}
              </Link>
            ) : (
              <span className="font-mono font-bold text-slate-800">-</span>
            )}
          </div>
        </div>

        <div>
          <span className="text-slate-500">Customer:</span>
          <div className="mt-0.5 font-bold text-slate-900">
            {data.deliveryOrder?.customer.name || '-'}
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            {data.deliveryOrder?.customer.code}
          </div>
        </div>

        <div>
          <span className="text-slate-500">Gudang Penerimaan:</span>
          <div className="mt-0.5 font-bold text-slate-900">{data.warehouse.name}</div>
          <div className="font-mono text-[11px] text-slate-500">{data.warehouse.code}</div>
        </div>

        <div>
          <span className="text-slate-500">Total Kuantitas Masuk:</span>
          <div className="mt-0.5 text-base font-bold text-emerald-600">
            +{data.totalUnits.toLocaleString('id-ID')} unit
          </div>
          <div className="text-[11px] text-slate-500">{data.items.length} item barang</div>
        </div>
      </div>

      {/* Reason Card */}
      {data.rawNotes && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs">
          <div className="font-bold text-indigo-900">Keterangan &amp; Berita Acara:</div>
          <p className="mt-1 whitespace-pre-wrap text-slate-700">{data.rawNotes}</p>
        </div>
      )}

      {/* Items Table */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">
          Rincian Barang yang Diterima Kembali ke Stok
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full rounded-lg border border-slate-200 text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase">
              <tr>
                <th className="p-3">SKU &amp; Nama Produk</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Batch &amp; Expired</th>
                <th className="p-3">Lokasi Rak Masuk</th>
                <th className="p-3 text-right">Kuantitas Retur</th>
                <th className="p-3 text-right">Saldo Berjalan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="p-3">
                    <div className="font-semibold text-slate-900">{item.productName}</div>
                    <div className="font-mono text-[11px] text-slate-500">{item.productSku}</div>
                  </td>
                  <td className="p-3 text-slate-600">{item.categoryName}</td>
                  <td className="p-3">
                    <div className="font-mono font-medium text-slate-800">{item.batchNo}</div>
                    <div className="text-[10px] text-slate-400">
                      {item.expiryDate
                        ? new Date(item.expiryDate).toLocaleDateString('id-ID')
                        : 'No Expiry'}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono font-semibold text-slate-700">
                      {item.locationCode}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-emerald-600">
                    +{item.quantity} {item.uom}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-700">
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
