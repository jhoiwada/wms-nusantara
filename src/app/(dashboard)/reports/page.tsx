'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import type {
  MovementReportItem,
  InventoryValueProductItem,
  MovementsReportSummary,
  InventoryValueReportSummary,
} from '@/server/services/report.service';

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'movements'>('inventory');
  const [userRole, setUserRole] = useState<string>('');

  // Dropdown options
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  // Inventory Filters
  const [invWarehouseId, setInvWarehouseId] = useState<string>('');
  const [invCategoryId, setInvCategoryId] = useState<string>('');
  const [invSearch, setInvSearch] = useState<string>('');

  // Movement Filters
  const [movWarehouseId, setMovWarehouseId] = useState<string>('');
  const [movType, setMovType] = useState<string>('');
  const [movFrom, setMovFrom] = useState<string>('');
  const [movTo, setMovTo] = useState<string>('');

  // Data states
  const [invItems, setInvItems] = useState<InventoryValueProductItem[]>([]);
  const [invSummary, setInvSummary] = useState<InventoryValueReportSummary | null>(null);
  const [invLoading, setInvLoading] = useState<boolean>(true);

  const [movItems, setMovItems] = useState<MovementReportItem[]>([]);
  const [movSummary, setMovSummary] = useState<MovementsReportSummary | null>(null);
  const [movLoading, setMovLoading] = useState<boolean>(true);

  const [isExporting, startExport] = useTransition();
  const [exportError, setExportError] = useState<string | null>(null);

  // Load user role and filter dropdowns
  useEffect(() => {
    fetch('/api/v1/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.user?.role) {
          setUserRole(json.data.user.role);
        }
      })
      .catch(() => {});

    fetch('/api/v1/warehouses')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data) setWarehouses(json.data);
      })
      .catch(() => {});

    fetch('/api/v1/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data) setCategories(json.data);
      })
      .catch(() => {});
  }, []);

  // Fetch Inventory Valuation Data
  useEffect(() => {
    if (activeTab !== 'inventory') return;
    let isMounted = true;
    const params = new URLSearchParams({ pageSize: '100' });
    if (invWarehouseId) params.append('warehouseId', invWarehouseId);
    if (invCategoryId) params.append('categoryId', invCategoryId);
    if (invSearch.trim()) params.append('search', invSearch.trim());

    fetch(`/api/v1/reports/inventory-value?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json?.data) {
          setInvItems(json.data.items || []);
          setInvSummary(json.data.summary || null);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setInvLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab, invWarehouseId, invCategoryId, invSearch]);

  // Fetch Movements Data
  useEffect(() => {
    if (activeTab !== 'movements') return;
    let isMounted = true;
    const params = new URLSearchParams({ pageSize: '100' });
    if (movWarehouseId) params.append('warehouseId', movWarehouseId);
    if (movType) params.append('type', movType);
    if (movFrom) params.append('from', movFrom);
    if (movTo) params.append('to', movTo);

    fetch(`/api/v1/reports/movements?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json?.data) {
          setMovItems(json.data.items || []);
          setMovSummary(json.data.summary || null);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setMovLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab, movWarehouseId, movType, movFrom, movTo]);

  const canExport = userRole === 'ADMIN' || userRole === 'MANAGER';

  const handleExport = (format: 'xlsx' | 'pdf') => {
    if (!canExport) {
      setExportError(
        'Hanya role ADMIN dan MANAGER yang berhak mengekspor berkas laporan (SECURITY.md).',
      );
      return;
    }

    setExportError(null);
    startExport(async () => {
      try {
        const isInventory = activeTab === 'inventory';
        const endpoint = isInventory ? 'inventory-value' : 'movements';
        const params = new URLSearchParams({ format });

        if (isInventory) {
          if (invWarehouseId) params.append('warehouseId', invWarehouseId);
          if (invCategoryId) params.append('categoryId', invCategoryId);
          if (invSearch.trim()) params.append('search', invSearch.trim());
        } else {
          if (movWarehouseId) params.append('warehouseId', movWarehouseId);
          if (movType) params.append('type', movType);
          if (movFrom) params.append('from', movFrom);
          if (movTo) params.append('to', movTo);
        }

        const res = await fetch(`/api/v1/reports/${endpoint}?${params.toString()}`);
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(errJson?.error?.message || 'Gagal mengunduh berkas laporan');
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const today = new Date().toISOString().slice(0, 10);
        const filename = `${endpoint}-${today}.${format}`;
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err: unknown) {
        setExportError((err as Error)?.message || 'Terjadi kesalahan saat memproses ekspor');
      }
    });
  };

  const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  });

  // Table Columns for Inventory Value
  const invColumns: Column<InventoryValueProductItem>[] = [
    {
      key: 'sku',
      header: 'SKU & Produk',
      sortable: true,
      render: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
              {row.sku}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {row.uom}
            </span>
          </div>
          <div className="text-xs font-medium text-slate-900 dark:text-slate-200">{row.name}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{row.categoryName}</div>
        </div>
      ),
    },
    {
      key: 'totalQuantity',
      header: 'Stok Fisik',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            {row.totalQuantity.toLocaleString('id-ID')} {row.uom}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Min: {row.minStock.toLocaleString('id-ID')}
          </div>
        </div>
      ),
    },
    {
      key: 'costPrice',
      header: 'Harga Pokok (HPP)',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-slate-800 dark:text-slate-300">
          {currencyFormatter.format(row.costPrice)}
        </span>
      ),
    },
    {
      key: 'totalValue',
      header: 'Total Nilai Persediaan',
      sortable: true,
      render: (row) => (
        <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
          {currencyFormatter.format(row.totalValue)}
        </div>
      ),
    },
    {
      key: 'warehouses',
      header: 'Sebaran Gudang',
      render: (row) => (
        <div className="space-y-1">
          {row.warehouses.map((w) => (
            <div key={w.id} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">
                {w.name.replace('Gudang ', '')}:
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {w.quantity} unit
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'isLowStock',
      header: 'Status',
      render: (row) => {
        if (row.totalQuantity === 0) {
          return <Badge variant="danger">HABIS</Badge>;
        }
        if (row.isLowStock) {
          return <Badge variant="warning">MENIPIS</Badge>;
        }
        return <Badge variant="success">NORMAL</Badge>;
      },
    },
  ];

  // Table Columns for Movements
  const movColumns: Column<MovementReportItem>[] = [
    {
      key: 'createdAt',
      header: 'Waktu & Referensi',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
            {row.refNo}
          </span>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {new Date(row.createdAt).toLocaleString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <span className="text-[10px] text-slate-400 uppercase dark:text-slate-500">
            {row.refType}
          </span>
        </div>
      ),
    },
    {
      key: 'movementType',
      header: 'Jenis Mutasi',
      render: (row) => {
        const isPositive = row.signedQuantity > 0;
        return <Badge variant={isPositive ? 'success' : 'danger'}>{row.movementType}</Badge>;
      },
    },
    {
      key: 'product',
      header: 'Produk (SKU)',
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-200">
            {row.product.sku}
          </span>
          <div className="text-xs text-slate-700 dark:text-slate-300">{row.product.name}</div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Gudang & Rak',
      render: (row) => (
        <div>
          <div className="text-xs font-medium text-slate-900 dark:text-slate-200">
            {row.location.warehouse.name}
          </div>
          <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
            Rak: {row.location.code}
          </div>
        </div>
      ),
    },
    {
      key: 'batch',
      header: 'Batch & Expired',
      render: (row) => (
        <div>
          <div className="font-mono text-xs text-slate-800 dark:text-slate-300">
            {row.batch.batchNo}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {row.batch.expiryDate
              ? new Date(row.batch.expiryDate).toLocaleDateString('id-ID')
              : 'Non-Expiry'}
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Perubahan',
      render: (row) => {
        const isPositive = row.signedQuantity > 0;
        return (
          <div>
            <div
              className={`font-mono text-sm font-bold ${isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-red-400'}`}
            >
              {isPositive ? `+${row.quantity}` : `-${row.quantity}`}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Saldo: {row.balanceAfter}
            </div>
          </div>
        );
      },
    },
    {
      key: 'user',
      header: 'Petugas & Catatan',
      render: (row) => (
        <div>
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-200">
            {row.user.name}
          </div>
          <div className="max-w-[150px] truncate text-[11px] text-slate-500 dark:text-slate-400">
            {row.notes || '-'}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Laporan &amp; Analisis Gudang
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Laporan nilai persediaan konsolidasi dan rekonsiliasi mutasi buku besar gudang Jakarta
            &amp; Bekasi.
          </p>
        </div>

        {/* Export Action Buttons */}
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          {!canExport && (
            <span className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-400/90">
              Hanya Admin &amp; Manager yang berhak ekspor
            </span>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!canExport || isExporting}
              onClick={() => handleExport('xlsx')}
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700/60 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
            >
              Export Excel (.xlsx)
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canExport || isExporting}
              onClick={() => handleExport('pdf')}
              className="border-indigo-600 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700/60 dark:text-indigo-300 dark:hover:bg-indigo-950/60"
            >
              Export PDF (.pdf)
            </Button>
          </div>
        </div>
      </div>

      {exportError && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-red-800/80 dark:bg-red-950/40 dark:text-red-300">
          {exportError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'inventory'
              ? 'border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Laporan Nilai Persediaan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'movements'
              ? 'border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Laporan Mutasi &amp; Buku Besar
        </button>
      </div>

      {/* TAB 1: NILAI PERSEDIAAN */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Nilai Persediaan (IDR)
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {invSummary ? currencyFormatter.format(invSummary.totalInventoryValue) : '...'}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Berdasarkan HPP barang fisik aktif
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Kuantitas Fisik
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-white">
                {invSummary ? invSummary.totalPhysicalUnits.toLocaleString('id-ID') : '...'}{' '}
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">Unit</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Seluruh rak gudang konsolidasi
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total SKU Terdaftar
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-sky-700 dark:text-sky-400">
                {invSummary ? invSummary.totalSkus.toLocaleString('id-ID') : '...'}{' '}
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  Produk
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Katalog master produk aktif
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                SKU Menipis / Kosong
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-amber-700 dark:text-amber-400">
                {invSummary ? invSummary.lowStockSkus : '...'}{' '}
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  ({invSummary?.outOfStockSkus || 0} habis)
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Stok &le; kuota minimum (minStock)
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Cari SKU, Nama Produk, atau Barcode..."
                value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={invWarehouseId}
                onChange={(e) => setInvWarehouseId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">Semua Gudang</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>

              <select
                value={invCategoryId}
                onChange={(e) => setInvCategoryId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {(invWarehouseId || invCategoryId || invSearch) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setInvWarehouseId('');
                    setInvCategoryId('');
                    setInvSearch('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Data Table */}
          <DataTable
            columns={invColumns}
            data={invItems}
            isLoading={invLoading}
            searchable={false}
            emptyTitle="Tidak ada data persediaan"
            emptyDescription="Tidak ada data persediaan barang yang sesuai kriteria filter."
          />
        </div>
      )}

      {/* TAB 2: MUTASI & BUKU BESAR */}
      {activeTab === 'movements' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Transaksi Mutasi
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-white">
                {movSummary ? movSummary.totalMovements.toLocaleString('id-ID') : '...'}{' '}
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  Baris
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Buku besar append-only ledger
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Kuantitas Masuk
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                +{movSummary ? movSummary.totalInQty.toLocaleString('id-ID') : '...'}{' '}
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">Unit</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                GR, Adjust In &amp; Transfer In
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Kuantitas Keluar
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-rose-700 dark:text-red-400">
                -{movSummary ? movSummary.totalOutQty.toLocaleString('id-ID') : '...'}{' '}
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">Unit</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                DO, Adjust Out &amp; Transfer Out
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Perubahan Bersih (Net)
              </div>
              <div
                className={`mt-1 font-mono text-2xl font-bold ${(movSummary?.netQty || 0) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-red-400'}`}
              >
                {movSummary
                  ? movSummary.netQty >= 0
                    ? `+${movSummary.netQty.toLocaleString('id-ID')}`
                    : movSummary.netQty.toLocaleString('id-ID')
                  : '...'}{' '}
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">Unit</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Selisih mutasi masuk vs keluar
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
              <span>Dari:</span>
              <input
                type="date"
                value={movFrom}
                onChange={(e) => setMovFrom(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <span>Sampai:</span>
              <input
                type="date"
                value={movTo}
                onChange={(e) => setMovTo(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 sm:ml-auto">
              <select
                value={movWarehouseId}
                onChange={(e) => setMovWarehouseId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">Semua Gudang</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>

              <select
                value={movType}
                onChange={(e) => setMovType(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">Semua Jenis Mutasi</option>
                <option value="IN">Penerimaan (IN)</option>
                <option value="OUT">Pengiriman (OUT)</option>
                <option value="ADJUST_IN">Penyesuaian Masuk (ADJUST_IN)</option>
                <option value="ADJUST_OUT">Penyesuaian Keluar (ADJUST_OUT)</option>
                <option value="TRANSFER_IN">Transfer Masuk (TRANSFER_IN)</option>
                <option value="TRANSFER_OUT">Transfer Keluar (TRANSFER_OUT)</option>
              </select>

              {(movWarehouseId || movType || movFrom || movTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMovWarehouseId('');
                    setMovType('');
                    setMovFrom('');
                    setMovTo('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Data Table */}
          <DataTable
            columns={movColumns}
            data={movItems}
            isLoading={movLoading}
            searchable={false}
            emptyTitle="Tidak ada riwayat mutasi"
            emptyDescription="Tidak ada riwayat pergerakan stok yang sesuai kriteria filter."
          />
        </div>
      )}
    </div>
  );
}
