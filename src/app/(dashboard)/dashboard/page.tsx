'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { MovementChart, type MovementChartPoint } from '@/components/features/movement-chart';
import type { MovementType } from '@/types/document';

interface DashboardSummaryData {
  totalInventoryValue: number;
  totalStockUnits: number;
  lowStockCount: number;
  expiringBatchesCount: number;
  draftGoodsReceipts: number;
  draftDeliveryOrders: number;
  warehouses: {
    id: string;
    code: string;
    name: string;
    activeRacks: number;
    totalUnits: number;
  }[];
}

interface RecentMovementItem {
  id: string;
  movementType: MovementType;
  quantity: number;
  balanceAfter: number;
  refNo: string;
  refType: string;
  refId: string;
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
  };
}

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}

export default function DashboardPage() {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');

  // Summary state
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  // Movement chart state
  const [chartRange, setChartRange] = useState<'7d' | '30d'>('7d');
  const [chartData, setChartData] = useState<MovementChartPoint[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(true);

  // Recent movements state
  const [recentMovements, setRecentMovements] = useState<RecentMovementItem[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(true);

  // Fetch warehouses for filter
  useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/warehouses?activeOnly=true&pageSize=100')
      .then((r) => r.json())
      .then((json) => {
        if (isMounted && json.data) setWarehouses(json.data);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch summary
  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams();
    if (selectedWarehouse !== 'ALL') params.append('warehouseId', selectedWarehouse);

    fetch(`/api/v1/dashboard/summary?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (isMounted && json.data) setSummary(json.data);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingSummary(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedWarehouse]);

  // Fetch movement chart
  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams({ range: chartRange });
    if (selectedWarehouse !== 'ALL') params.append('warehouseId', selectedWarehouse);

    fetch(`/api/v1/dashboard/movement-chart?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (isMounted && json.data) setChartData(json.data);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingChart(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedWarehouse, chartRange]);

  // Fetch recent transactions
  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams({ limit: '10' });
    if (selectedWarehouse !== 'ALL') params.append('warehouseId', selectedWarehouse);

    fetch(`/api/v1/dashboard/recent-transactions?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (isMounted && json.data) setRecentMovements(json.data);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingMovements(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedWarehouse]);

  const getMovementBadge = (type: MovementType) => {
    switch (type) {
      case 'IN':
        return <Badge variant="success">Masuk (GR)</Badge>;
      case 'OUT':
        return <Badge variant="danger">Keluar (DO)</Badge>;
      case 'ADJUST_IN':
        return <Badge variant="info">Penyesuaian (+)</Badge>;
      case 'ADJUST_OUT':
        return <Badge variant="warning">Penyesuaian (-)</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  const columns: Column<RecentMovementItem>[] = [
    {
      key: 'refNo',
      header: 'No. Dokumen',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
            {row.refNo}
          </span>
          <div className="font-sans text-[10px] text-slate-500">{row.refType}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Jenis Mutasi',
      align: 'center',
      render: (row) => getMovementBadge(row.movementType),
    },
    {
      key: 'product',
      header: 'Produk & SKU',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-200">{row.product.name}</div>
          <div className="font-mono text-[11px] text-slate-500">{row.product.sku}</div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Jumlah',
      align: 'right',
      sortable: true,
      render: (row) => {
        const isIncoming =
          row.movementType === 'IN' ||
          row.movementType === 'ADJUST_IN' ||
          row.movementType === 'TRANSFER_IN';
        return (
          <div className="text-right font-mono text-xs font-semibold">
            <span
              className={
                isIncoming
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }
            >
              {isIncoming ? `+${row.quantity}` : `-${row.quantity}`}
            </span>{' '}
            <span className="text-[11px] text-slate-500">{row.product.uom}</span>
          </div>
        );
      },
    },
    {
      key: 'location',
      header: 'Lokasi Rak & Gudang',
      render: (row) => (
        <div>
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
            {row.location.code}
          </span>
          <span className="ml-1 text-[11px] text-slate-500">({row.location.warehouse.code})</span>
        </div>
      ),
    },
    {
      key: 'balanceAfter',
      header: 'Saldo Setelah',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
          {row.balanceAfter}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Waktu Transaksi',
      align: 'right',
      render: (row) => (
        <span className="text-[11px] text-slate-500">
          {new Date(row.createdAt).toLocaleString('id-ID', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Pusat Kendali Operasional Gudang
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Pemantauan pergerakan inventaris real-time multi-lokasi Jakarta &amp; Bekasi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Warehouse Selector */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="dashboard-warehouse-select"
              className="text-xs whitespace-nowrap text-slate-500"
            >
              Gudang:
            </label>
            <select
              id="dashboard-warehouse-select"
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:ring-1 focus:ring-slate-950 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-slate-300"
            >
              <option value="ALL">Semua Gudang</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/goods-receipts/new">
              <Button size="sm" variant="primary" className="text-xs">
                + Barang Masuk (GR)
              </Button>
            </Link>
            <Link href="/delivery-orders/new">
              <Button size="sm" variant="outline" className="text-xs">
                + Barang Keluar (DO)
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {/* Total Inventory Value */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Nilai Persediaan (BR-05)
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isLoadingSummary
              ? '...'
              : `Rp ${(summary?.totalInventoryValue || 0).toLocaleString('id-ID')}`}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Berdasarkan harga beli saat ini</div>
        </div>

        {/* Total Stock Units */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Unit Persediaan
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isLoadingSummary
              ? '...'
              : `${(summary?.totalStockUnits || 0).toLocaleString('id-ID')} Unit`}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Seluruh rak fisik aktif</div>
        </div>

        {/* Low Stock Alerts */}
        <Link
          href="/stock"
          className="block rounded-lg border border-amber-200 bg-white p-4 transition-colors hover:border-amber-400 dark:border-amber-900/50 dark:bg-slate-950"
        >
          <div className="flex items-center justify-between text-xs font-medium text-amber-600 dark:text-amber-400">
            <span>Stok Menipis (BR-04)</span>
            <span className="text-amber-500">→</span>
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-amber-700 dark:text-amber-400">
            {isLoadingSummary ? '...' : `${summary?.lowStockCount || 0} Produk`}
          </div>
          <div className="mt-1 text-[11px] text-amber-600/80 dark:text-amber-400/80">
            Di bawah stok minimum nasional
          </div>
        </Link>

        {/* Expiring Batches */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-medium text-rose-600 dark:text-rose-400">
            Batch Hampir Expired (BR-10)
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-rose-700 dark:text-rose-400">
            {isLoadingSummary ? '...' : `${summary?.expiringBatchesCount || 0} Batch`}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Kadaluwarsa dalam 30 hari</div>
        </div>
      </div>

      {/* Operational Draft Alerts Banner */}
      {summary && (summary.draftGoodsReceipts > 0 || summary.draftDeliveryOrders > 0) && (
        <div className="flex flex-col justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 sm:flex-row sm:items-center dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">ℹ</span>
            <span>
              Ada <strong>{summary.draftGoodsReceipts} GR draf</strong> menunggu penerimaan dan{' '}
              <strong>{summary.draftDeliveryOrders} DO draf</strong> siap verifikasi pengiriman
              stok.
            </span>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {summary.draftGoodsReceipts > 0 && (
              <Link href="/goods-receipts">
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Periksa GR
                </Button>
              </Link>
            )}
            {summary.draftDeliveryOrders > 0 && (
              <Link href="/delivery-orders">
                <Button size="sm" variant="primary" className="h-7 text-xs">
                  Periksa DO
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Movement Chart Component (Masuk vs Keluar) */}
      <MovementChart
        data={chartData}
        range={chartRange}
        onRangeChange={setChartRange}
        isLoading={isLoadingChart}
      />

      {/* Warehouse Status Overview */}
      {summary?.warehouses && summary.warehouses.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {summary.warehouses.map((wh) => (
            <div
              key={wh.id}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {wh.name} ({wh.code})
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-400">Multi-Rak Terdaftar</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900">
                  <span className="block text-[10px] text-slate-400">Rak Aktif</span>
                  <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {wh.activeRacks} Rak
                  </span>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900">
                  <span className="block text-[10px] text-slate-400">Total Unit Tersimpan</span>
                  <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {wh.totalUnits.toLocaleString('id-ID')} Unit
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Movement Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wider text-slate-900 uppercase dark:text-slate-100">
            Pergerakan Stok Terkini (Real-Time)
          </h2>
          <Link
            href="/stock"
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400"
          >
            Lihat Semua Stok →
          </Link>
        </div>

        <DataTable
          columns={columns}
          data={recentMovements}
          isLoading={isLoadingMovements}
          searchPlaceholder="Cari berdasarkan nomor dokumen, SKU, atau nama barang..."
          searchField={(item) => `${item.refNo} ${item.product.sku} ${item.product.name}`}
          pageSize={10}
          emptyTitle="Belum ada mutasi"
          emptyDescription="Belum ada transaksi barang masuk atau keluar tercatat di sistem."
        />
      </div>
    </div>
  );
}
