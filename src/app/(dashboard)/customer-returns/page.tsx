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
            className="font-mono font-bold text-amber-600 hover:underline dark:text-amber-400"
          >
            {row.returnNo}
          </Link>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {new Date(row.createdAt).toLocaleString('id-ID', {
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
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {row.warehouse.name}
          </span>
          <span className="ml-1.5 rounded bg-zinc-100 px-1 py-0.5 font-mono text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
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
          <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
            {row.sampleProducts.join(', ')}
            {row.itemsCount > row.sampleProducts.length && (
              <span className="text-zinc-400 dark:text-zinc-500">
                {' '}
                +{row.itemsCount - row.sampleProducts.length} lainnya
              </span>
            )}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {row.itemsCount} baris item / batch
          </div>
        </div>
      ),
    },
    {
      key: 'totalUnits',
      header: 'Total Unit',
      sortable: true,
      render: (row) => (
        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
          +{row.totalUnits.toLocaleString('id-ID')} unit
        </span>
      ),
    },
    {
      key: 'notes',
      header: 'Keterangan & Alasan',
      render: (row) => (
        <div
          className="max-w-xs truncate text-xs text-zinc-600 dark:text-zinc-400"
          title={row.notes || ''}
        >
          {row.notes || '-'}
        </div>
      ),
    },
    {
      key: 'user',
      header: 'Petugas',
      render: (row) => (
        <div className="text-xs">
          <div className="font-medium text-zinc-800 dark:text-zinc-200">{row.user.name}</div>
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
          <Button size="sm" variant="outline" className="h-7 text-xs">
            Rincian
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Retur Penjualan (Customer Returns)
            </h1>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
              {totalReturnsCount} Dokumen
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Pencatatan penerimaan kembali barang dari Delivery Order (DO) yang sudah dikirim ke
            customer.
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
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Total Dokumen Retur
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {totalReturnsCount}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">transaksi</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Total Unit Fisik Diterima Kembali
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              +{totalUnitsReturned.toLocaleString('id-ID')}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">unit</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Integritas Riwayat Stok
          </div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Pengembalian diverifikasi terhadap dokumen pengiriman dan stok dikembalikan ke rak
            tujuan dengan mutasi masuk yang tercatat resmi.
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
