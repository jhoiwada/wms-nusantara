'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import type { StockOpnameStatus } from '@/types/document';

interface StockOpnameSummaryItem {
  id: string;
  opnameNo: string;
  status: StockOpnameStatus;
  displayNotes: string | null;
  targetLocationCount: number;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  approvedBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  _count: {
    items: number;
  };
}

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}

export default function StockOpnameListPage() {
  const [opnames, setOpnames] = useState<StockOpnameSummaryItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

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

  // Fetch stock opname records
  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams({ pageSize: '100' });
    if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
    if (selectedWarehouse !== 'ALL') params.append('warehouseId', selectedWarehouse);

    fetch(`/api/v1/stock-opnames?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.data) {
          setOpnames(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey, selectedStatus, selectedWarehouse]);

  const getStatusBadge = (status: StockOpnameStatus) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="warning">DRAFT (PENGHITUNGAN)</Badge>;
      case 'SUBMITTED':
        return <Badge variant="info">SUBMITTED (MENUNGGU REVIEW)</Badge>;
      case 'APPROVED':
        return <Badge variant="success">APPROVED (PENYESUAIAN SELESAI)</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">REJECTED (DITOLAK)</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const columns: Column<StockOpnameSummaryItem>[] = [
    {
      key: 'opnameNo',
      header: 'No. Opname',
      sortable: true,
      render: (row) => (
        <Link
          href={`/stock-opname/${row.id}`}
          className="font-mono font-semibold text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          {row.opnameNo}
        </Link>
      ),
    },
    {
      key: 'warehouse',
      header: 'Gudang',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium text-slate-900 dark:text-slate-200">
            {row.warehouse.name}
          </span>
          <span className="ml-2 font-mono text-xs text-slate-500">[{row.warehouse.code}]</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => getStatusBadge(row.status),
    },
    {
      key: 'itemsCount',
      header: 'Jumlah Item',
      sortable: true,
      render: (row) => (
        <div className="font-mono text-slate-800 dark:text-slate-300">{row._count.items} item</div>
      ),
    },
    {
      key: 'createdBy',
      header: 'Dibuat Oleh',
      sortable: true,
      render: (row) => (
        <div>
          <div className="text-slate-900 dark:text-slate-200">{row.createdBy.name}</div>
          <div className="text-xs text-slate-500">Role: {row.createdBy.role}</div>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Tanggal Dibuat',
      sortable: true,
      render: (row) => (
        <span className="text-slate-600 dark:text-slate-400">
          {new Date(row.createdAt).toLocaleString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Link href={`/stock-opname/${row.id}`}>
            <Button size="sm" variant={row.status === 'SUBMITTED' ? 'primary' : 'outline'}>
              {row.status === 'DRAFT'
                ? 'Input Hitung'
                : row.status === 'SUBMITTED'
                  ? 'Review & Approve'
                  : 'Lihat Detail'}
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const draftCount = opnames.filter((o) => o.status === 'DRAFT').length;
  const submittedCount = opnames.filter((o) => o.status === 'SUBMITTED').length;
  const approvedCount = opnames.filter((o) => o.status === 'APPROVED').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Stock Opname
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Penghitungan fisik stok gudang, snapshot sistem, pembekuan lokasi rak, dan rekonsiliasi
            penyesuaian otomatis.
          </p>
        </div>
        <div>
          <Link href="/stock-opname/new">
            <Button variant="primary" className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Buat Stock Opname
            </Button>
          </Link>
        </div>
      </div>

      {/* Highlights / KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Dokumen Opname
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {opnames.length}
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="text-xs font-medium text-amber-800 dark:text-amber-400">
            Draft (Dalam Penghitungan)
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">
            {draftCount}
          </div>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 shadow-xs dark:border-sky-900/40 dark:bg-sky-950/20">
          <div className="text-xs font-medium text-sky-800 dark:text-sky-400">
            Submitted (Menunggu Approval)
          </div>
          <div className="mt-1 text-2xl font-bold text-sky-700 dark:text-sky-300">
            {submittedCount}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="text-xs font-medium text-emerald-800 dark:text-emerald-400">
            Approved (Selesai Disesuaikan)
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {approvedCount}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider text-slate-600 uppercase dark:text-slate-400">
            Status:
          </span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="ALL">Semua Status</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider text-slate-600 uppercase dark:text-slate-400">
            Gudang:
          </span>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="ALL">Semua Gudang</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={opnames}
        isLoading={isLoading}
        searchPlaceholder="Cari nomor opname, gudang, pembuat..."
        searchField={(row) => `${row.opnameNo} ${row.warehouse.name} ${row.createdBy.name}`}
        emptyTitle="Belum ada dokumen stock opname"
        emptyDescription="Belum ada dokumen stock opname yang sesuai dengan filter."
      />
    </div>
  );
}
