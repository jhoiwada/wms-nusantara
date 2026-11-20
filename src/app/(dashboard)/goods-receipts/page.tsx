'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import type { GoodsReceiptStatus } from '@/types/document';

interface GoodsReceiptItemSummary {
  id: string;
  receiptNo: string;
  status: GoodsReceiptStatus;
  receivedAt: string | null;
  notes: string | null;
  createdAt: string;
  supplier: {
    id: string;
    code: string;
    name: string;
  };
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    items: number;
  };
}

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}

export default function GoodsReceiptsListPage() {
  const [receipts, setReceipts] = useState<GoodsReceiptItemSummary[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const reloadData = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Fetch warehouses for filter
  useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/warehouses?activeOnly=true&pageSize=100')
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.data) {
          setWarehouses(json.data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch goods receipts
  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams({ pageSize: '100' });
    if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
    if (selectedWarehouse !== 'ALL') params.append('warehouseId', selectedWarehouse);

    fetch(`/api/v1/goods-receipts?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.data) {
          setReceipts(json.data);
          setFetchError(null);
        } else if (isMounted && json.error) {
          setFetchError(json.error.message || 'Gagal memuat data');
        }
      })
      .catch(() => {
        if (isMounted) setFetchError('Gagal terhubung ke server');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey, selectedStatus, selectedWarehouse]);

  const getStatusBadge = (status: GoodsReceiptStatus) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="warning">DRAFT</Badge>;
      case 'RECEIVED':
        return <Badge variant="success">RECEIVED (DITERIMA)</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral">CANCELLED (DIBATALKAN)</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const columns: Column<GoodsReceiptItemSummary>[] = [
    {
      key: 'receiptNo',
      header: 'No. Dokumen (GR)',
      sortable: true,
      render: (item: GoodsReceiptItemSummary) => (
        <div>
          <Link
            href={`/goods-receipts/${item.id}`}
            className="font-mono text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {item.receiptNo}
          </Link>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Dibuat: {new Date(item.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
          </div>
        </div>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      sortable: true,
      render: (item: GoodsReceiptItemSummary) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            {item.supplier.name}
          </div>
          <span className="py-0.2 rounded bg-slate-100 px-1.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {item.supplier.code}
          </span>
        </div>
      ),
    },
    {
      key: 'warehouse',
      header: 'Gudang Tujuan',
      sortable: true,
      render: (item: GoodsReceiptItemSummary) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-200">
            {item.warehouse.name}
          </div>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {item.warehouse.code}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status Dokumen',
      sortable: true,
      render: (item: GoodsReceiptItemSummary) => getStatusBadge(item.status),
    },
    {
      key: 'itemsCount',
      header: 'Jumlah Item',
      sortable: true,
      render: (item: GoodsReceiptItemSummary) => (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {item._count.items} Macam Item
        </span>
      ),
    },
    {
      key: 'receivedAt',
      header: 'Tanggal Diterima',
      sortable: true,
      render: (item: GoodsReceiptItemSummary) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {item.receivedAt
            ? new Date(item.receivedAt).toLocaleDateString('id-ID', {
                dateStyle: 'medium',
              })
            : '-'}
        </span>
      ),
    },
    {
      key: 'createdBy',
      header: 'Petugas Input',
      render: (item: GoodsReceiptItemSummary) => (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {item.createdBy.name}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (item: GoodsReceiptItemSummary) => (
        <div className="flex items-center justify-end">
          <Link href={`/goods-receipts/${item.id}`}>
            <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs">
              Detail Dokumen
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Penerimaan Barang (Goods Receipt)
            </h1>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
              {receipts.length} Dokumen
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Catatan penerimaan barang masuk dari supplier, penataan ke lokasi rak gudang, dan
            penambahan stok resmi.
          </p>
        </div>

        <Link href="/goods-receipts/new">
          <Button className="gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Buat Dokumen Penerimaan (GR)
          </Button>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-8 rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="ALL">Semua Status</option>
            <option value="DRAFT">DRAFT</option>
            <option value="RECEIVED">RECEIVED (Diterima)</option>
            <option value="CANCELLED">CANCELLED (Dibatalkan)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Gudang Tujuan:
          </span>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="h-8 rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="ALL">Semua Gudang</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={reloadData}
          className="ml-auto flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Segarkan Data
        </button>
      </div>

      {/* Goods Receipt Table */}
      {fetchError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          {fetchError}
        </div>
      )}
      <DataTable
        columns={columns}
        data={receipts}
        isLoading={isLoading}
        searchPlaceholder="Cari nomor dokumen, supplier, atau catatan..."
        searchField={(item) =>
          `${item.receiptNo} ${item.supplier.name} ${item.supplier.code} ${item.warehouse.name} ${item.notes || ''}`
        }
        pageSize={15}
        emptyTitle="Belum ada dokumen penerimaan barang"
        emptyDescription="Buat dokumen GR pertama untuk mencatat barang masuk dari pemasok."
      />
    </div>
  );
}
