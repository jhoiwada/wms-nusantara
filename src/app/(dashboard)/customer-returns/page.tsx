'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';

interface CustomerReturnListItem {
  returnNo: string;
  refId: string;
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
  notes: string | null;
  itemsCount: number;
  totalUnits: number;
  sampleProducts: string[];
}

export default function CustomerReturnsListPage() {
  const [returns, setReturns] = useState<CustomerReturnListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/customer-returns?pageSize=100')
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.data) {
          setReturns(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const totalReturnsCount = returns.length;
  const totalUnitsReturned = returns.reduce((sum, r) => sum + r.totalUnits, 0);

  const columns: Column<CustomerReturnListItem>[] = [
    {
      key: 'returnNo',
      header: 'No. Retur (RET)',
      sortable: true,
      render: (row) => (
        <div>
          <Link
            href={`/customer-returns/${encodeURIComponent(row.returnNo)}`}
            className="font-mono font-bold text-indigo-600 hover:underline"
          >
            {row.returnNo}
          </Link>
          <div className="text-[11px] text-slate-500">
            {new Date(row.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      ),
    },
    {
      key: 'warehouse',
      header: 'Gudang Tujuan',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800">{row.warehouse.name}</span>
          <span className="ml-1.5 rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-500">
            {row.warehouse.code}
          </span>
        </div>
      ),
    },
    {
      key: 'sampleProducts',
      header: 'Produk Diretur',
      render: (row) => (
        <div>
          <div className="text-xs font-medium text-slate-800">
            {row.sampleProducts.join(', ')}
            {row.itemsCount > row.sampleProducts.length && (
              <span className="text-slate-400">
                {' '}
                +{row.itemsCount - row.sampleProducts.length} lainnya
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500">{row.itemsCount} baris item / batch</div>
        </div>
      ),
    },
    {
      key: 'totalUnits',
      header: 'Total Unit',
      sortable: true,
      render: (row) => (
        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-xs font-bold text-emerald-700">
          +{row.totalUnits.toLocaleString('id-ID')} unit
        </span>
      ),
    },
    {
      key: 'notes',
      header: 'Keterangan & Alasan',
      render: (row) => (
        <div className="max-w-xs truncate text-xs text-slate-600" title={row.notes || ''}>
          {row.notes || '-'}
        </div>
      ),
    },
    {
      key: 'user',
      header: 'Petugas',
      render: (row) => (
        <div className="text-xs">
          <div className="font-medium text-slate-800">{row.user.name}</div>
          <Badge variant="neutral" className="mt-0.5 text-[10px]">
            {row.user.role}
          </Badge>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (row) => (
        <Link href={`/customer-returns/${encodeURIComponent(row.returnNo)}`}>
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-indigo-200 text-xs text-indigo-600 hover:bg-indigo-50"
          >
            Rincian
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Retur Penjualan (Customer Returns)
            </h1>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
              {totalReturnsCount} Dokumen
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Pencatatan penerimaan kembali barang dari Delivery Order (DO) yang sudah dikirim ke
            customer (BR-18).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRefreshKey((k) => k + 1)}
            title="Muat Ulang"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </Button>

          <Link href="/customer-returns/new">
            <Button className="gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Buat Retur Customer
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Total Dokumen Retur</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalReturnsCount}</span>
            <span className="text-xs text-slate-500">transaksi</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">
            Total Unit Fisik Diterima Kembali
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">
              +{totalUnitsReturned.toLocaleString('id-ID')}
            </span>
            <span className="text-xs text-slate-500">unit</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Kepatuhan Aturan Bisnis</div>
          <div className="mt-1 text-xs text-slate-600">
            Mengacu pada <strong>BR-18</strong>: DO status SHIPPED diverifikasi dan stok
            dikembalikan ke rak tujuan dengan mutasi IN yang tercatat di kartu stok.
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={returns}
        isLoading={isLoading}
        searchPlaceholder="Cari nomor retur (RET-...), produk, atau catatan..."
        searchField={(item) =>
          `${item.returnNo} ${item.warehouse.name} ${item.warehouse.code} ${item.notes || ''} ${item.sampleProducts.join(' ')}`
        }
        pageSize={15}
        emptyTitle="Belum ada transaksi retur customer"
        emptyDescription="Klik 'Buat Retur Customer' untuk memproses penerimaan barang retur dari Delivery Order (DO) yang telah terkirim."
      />
    </div>
  );
}
