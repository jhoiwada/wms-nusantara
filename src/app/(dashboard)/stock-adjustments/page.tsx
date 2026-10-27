'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';

interface AdjustmentMovementItem {
  id: string;
  refNo: string;
  movementType: 'ADJUST_IN' | 'ADJUST_OUT';
  quantity: number;
  balanceAfter: number;
  notes: string | null;
  createdAt: string;
  product: {
    id: string;
    sku: string;
    name: string;
    uom: string;
  };
  location: {
    id: string;
    code: string;
    zone: string;
    rack: string;
    level: string;
    warehouse: {
      id: string;
      code: string;
      name: string;
    };
  };
  batch: {
    id: string;
    batchNo: string;
    expiryDate: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function StockAdjustmentsListPage() {
  const [adjustments, setAdjustments] = useState<AdjustmentMovementItem[]>([]);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams({ pageSize: '100' });
    if (selectedType !== 'ALL') {
      params.append('movementType', selectedType);
    }

    fetch(`/api/v1/stock-adjustments?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.data) {
          setAdjustments(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey, selectedType]);

  const columns: Column<AdjustmentMovementItem>[] = [
    {
      key: 'refNo',
      header: 'No. Dokumen',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-mono font-semibold text-emerald-400">{row.refNo}</span>
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
      key: 'movementType',
      header: 'Jenis Penyesuaian',
      sortable: true,
      render: (row) =>
        row.movementType === 'ADJUST_IN' ? (
          <Badge variant="success">+ ADJUST IN (TAMBAH)</Badge>
        ) : (
          <Badge variant="danger">- ADJUST OUT (KURANG)</Badge>
        ),
    },
    {
      key: 'product',
      header: 'Produk & SKU',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-slate-200">{row.product.name}</div>
          <div className="font-mono text-xs text-slate-500">
            {row.product.sku} · {row.product.uom}
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Gudang & Lokasi',
      sortable: true,
      render: (row) => (
        <div>
          <div className="text-slate-200">{row.location.warehouse.name}</div>
          <div className="font-mono text-xs text-slate-400">Rak {row.location.code}</div>
        </div>
      ),
    },
    {
      key: 'batch',
      header: 'Batch',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-mono text-xs text-slate-300">{row.batch.batchNo}</span>
          {row.batch.expiryDate && (
            <div className="text-[11px] text-slate-500">
              Exp: {new Date(row.batch.expiryDate).toLocaleDateString('id-ID')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Jumlah',
      sortable: true,
      render: (row) => (
        <div className="text-right">
          <span
            className={`font-mono font-bold ${
              row.movementType === 'ADJUST_IN' ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {row.movementType === 'ADJUST_IN' ? `+${row.quantity}` : `-${row.quantity}`}
          </span>
          <div className="font-mono text-[11px] text-slate-500">Saldo: {row.balanceAfter}</div>
        </div>
      ),
    },
    {
      key: 'notes',
      header: 'Kategori & Alasan (BR-26)',
      render: (row) => <div className="max-w-xs text-xs text-slate-300">{row.notes || '-'}</div>,
    },
    {
      key: 'user',
      header: 'Otorisator',
      sortable: true,
      render: (row) => (
        <div>
          <div className="text-xs font-medium text-slate-200">{row.user.name}</div>
          <div className="text-[11px] text-slate-500">Role: {row.user.role}</div>
        </div>
      ),
    },
  ];

  const inCount = adjustments.filter((a) => a.movementType === 'ADJUST_IN').length;
  const outCount = adjustments.filter((a) => a.movementType === 'ADJUST_OUT').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Penyesuaian Stok Manual</h1>
          <p className="text-sm text-slate-400">
            Pencatatan penyesuaian stok di luar opname (pemusnahan expired, barang rusak, koreksi
            dokumen) oleh Manager/Admin (BR-26).
          </p>
        </div>
        <div>
          <Link href="/stock-adjustments/new">
            <Button variant="primary" className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Buat Penyesuaian Stok
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur">
          <div className="text-xs font-medium text-slate-400">Total Mutasi Penyesuaian</div>
          <div className="mt-1 text-2xl font-bold text-white">{adjustments.length}</div>
        </div>
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 backdrop-blur">
          <div className="text-xs font-medium text-emerald-400">Penambahan Stok (ADJUST_IN)</div>
          <div className="mt-1 text-2xl font-bold text-emerald-300">{inCount}</div>
        </div>
        <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-4 backdrop-blur">
          <div className="text-xs font-medium text-rose-400">Pengurangan Stok (ADJUST_OUT)</div>
          <div className="mt-1 text-2xl font-bold text-rose-300">{outCount}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Jenis:
          </span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="ALL">Semua Jenis</option>
            <option value="ADJUST_IN">ADJUST IN (Penambahan)</option>
            <option value="ADJUST_OUT">ADJUST OUT (Pengurangan)</option>
          </select>
        </div>

        <div className="ml-auto">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="text-slate-400 hover:text-white"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur">
        <DataTable
          columns={columns}
          data={adjustments}
          isLoading={isLoading}
          searchPlaceholder="Cari no. dokumen, produk, batch, alasan, otorisator..."
          searchField={(row) =>
            `${row.refNo} ${row.product.name} ${row.product.sku} ${row.batch.batchNo} ${row.notes || ''} ${row.user.name}`
          }
          emptyTitle="Belum ada catatan penyesuaian stok manual"
          emptyDescription="Belum ada mutasi penyesuaian stok yang sesuai dengan filter."
        />
      </div>
    </div>
  );
}
