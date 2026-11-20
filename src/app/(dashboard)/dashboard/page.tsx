'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { MovementChart, type MovementChartPoint } from '@/components/features/movement-chart';
import { ExpiryBadge, type ExpiryStatus } from '@/components/features/expiry-badge';
import type { MovementType } from '@/types/document';

interface ExpiringBatchItem {
  stockId: string;
  productId: string;
  productName: string;
  sku: string;
  uom: string;
  category: string;
  costPrice: number;
  potentialLossValue: number;
  batchId: string;
  batchNo: string;
  expiryDate: string | null;
  daysRemaining: number;
  status: ExpiryStatus;
  quantity: number;
  locationId: string;
  locationCode: string;
  warehouseId: string;
  warehouseName: string;
}

interface ExpiringSummaryData {
  totalBatches: number;
  expiredCount: number;
  criticalCount: number;
  warningCount: number;
  safeCount: number;
  totalPotentialLoss: number;
  totalAtRiskUnits: number;
}

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
  const [isGuideOpen, setIsGuideOpen] = useState(false);

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

  // Expiring batches state (BR-10)
  const [expiringBatches, setExpiringBatches] = useState<ExpiringBatchItem[]>([]);
  const [expiringSummary, setExpiringSummary] = useState<ExpiringSummaryData | null>(null);
  const [expiringFilterTab, setExpiringFilterTab] = useState<
    'ALL' | 'EXPIRED' | 'CRITICAL' | 'WARNING'
  >('ALL');
  const [isLoadingExpiring, setIsLoadingExpiring] = useState(true);

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

  // Fetch expiring batches (BR-10)
  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams({ days: '30' });
    if (selectedWarehouse !== 'ALL') params.append('warehouseId', selectedWarehouse);
    if (expiringFilterTab !== 'ALL') params.append('status', expiringFilterTab);

    fetch(`/api/v1/stock/expiring?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (isMounted) {
          setExpiringBatches(json.data || []);
          if (json.meta) setExpiringSummary(json.meta);
        }
      })
      .catch(() => {
        if (isMounted) setExpiringBatches([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingExpiring(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedWarehouse, expiringFilterTab]);

  const expiringColumns: Column<ExpiringBatchItem>[] = [
    {
      key: 'product',
      header: 'Produk & SKU',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-zinc-800 dark:text-zinc-200">{row.productName}</div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
            <span>{row.sku}</span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <span>{row.category}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'batchNo',
      header: 'No. Batch',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
          {row.batchNo}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Lokasi Rak & Gudang',
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">
            {row.locationCode}
          </span>
          <div className="text-[11px] text-zinc-500">{row.warehouseName}</div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Sisa Stok',
      align: 'right',
      sortable: true,
      render: (row) => (
        <div className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
          {row.quantity.toLocaleString('id-ID')}{' '}
          <span className="font-sans text-[11px] font-normal text-zinc-500">{row.uom}</span>
        </div>
      ),
    },
    {
      key: 'expiryDate',
      header: 'Kedaluwarsa (Exp)',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
            {row.expiryDate
              ? new Date(row.expiryDate).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '-'}
          </div>
          <div className="mt-0.5">
            <ExpiryBadge
              expiryDate={row.expiryDate}
              daysRemaining={row.daysRemaining}
              status={row.status}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'potentialLossValue',
      header: 'Nilai Risiko',
      align: 'right',
      sortable: true,
      render: (row) => (
        <div className="text-right">
          <div className="font-mono text-xs font-semibold text-rose-700 dark:text-rose-400">
            Rp {row.potentialLossValue.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-zinc-400">
            @ Rp {row.costPrice.toLocaleString('id-ID')}
          </div>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Aksi FEFO',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5">
          <Link href="/delivery-orders/new">
            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]">
              Alokasi DO
            </Button>
          </Link>
          <Link href={`/stock/${row.productId}/card`}>
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] text-zinc-500">
              Kartu Stok
            </Button>
          </Link>
        </div>
      ),
    },
  ];

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
          <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            {row.refNo}
          </span>
          <div className="font-sans text-[10px] text-zinc-500">{row.refType}</div>
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
          <div className="font-semibold text-zinc-800 dark:text-zinc-200">{row.product.name}</div>
          <div className="font-mono text-[11px] text-zinc-500">{row.product.sku}</div>
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
            <span className="text-[11px] text-zinc-500">{row.product.uom}</span>
          </div>
        );
      },
    },
    {
      key: 'location',
      header: 'Lokasi Rak & Gudang',
      render: (row) => (
        <div>
          <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
            {row.location.code}
          </span>
          <span className="ml-1 text-[11px] text-zinc-500">({row.location.warehouse.code})</span>
        </div>
      ),
    },
    {
      key: 'balanceAfter',
      header: 'Saldo Setelah',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
          {row.balanceAfter}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Waktu Transaksi',
      align: 'right',
      render: (row) => (
        <span className="text-[11px] text-zinc-500">
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
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-[#111113]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Pusat Kendali Operasional Gudang
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Pemantauan pergerakan inventaris real-time multi-lokasi Jakarta &amp; Bekasi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Warehouse Selector */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="dashboard-warehouse-select"
              className="text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400"
            >
              Gudang:
            </label>
            <select
              id="dashboard-warehouse-select"
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 focus:ring-1 focus:ring-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-amber-400"
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

      {/* Enterprise Portfolio Showcase Guide Banner */}
      <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.07] via-amber-500/[0.02] to-transparent p-5 dark:border-amber-500/20 dark:from-amber-500/[0.06] dark:via-zinc-900/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 font-bold text-zinc-950 shadow-sm">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-700 uppercase dark:border-amber-400/20 dark:text-amber-400">
                  Standar Operasional Prosedur (SOP)
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">•</span>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  PT Nusantara Logistik Distribusi
                </span>
              </div>
              <h2 className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Alur Operasional Pergudangan &amp; Validasi Logika Bisnis NLD
              </h2>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                Seluruh 18 modul pergudangan terhubung secara nyata ke basis data PostgreSQL
                terpusat DC Pulogadung &amp; MM2100 Cikarang. Gunakan pintasan operasional di bawah
                untuk mengeksekusi alur logistik sesuai standar perusahaan:
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsGuideOpen(!isGuideOpen)}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50 sm:self-center dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <span>{isGuideOpen ? 'Tutup Ringkasan Alur' : 'Buka Ringkasan Alur'}</span>
            <svg
              className={`h-3.5 w-3.5 transition-transform duration-200 ${isGuideOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {isGuideOpen && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-amber-500/15 pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Guide Item 1 */}
            <div className="flex flex-col justify-between rounded-lg border border-zinc-200/80 bg-white/90 p-3.5 transition hover:border-amber-400 dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-amber-500/50">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    BR-01 s/d BR-04
                  </span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    Inbound
                  </span>
                </div>
                <h3 className="mt-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  1. Penerimaan &amp; Barcode Scanner
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Pencatatan batch, tanggal kedaluwarsa, alokasi multi-rak di DC Pulogadung /
                  MM2100, dan modal barcode scanner terintegrasi.
                </p>
              </div>
              <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800/80">
                <Link
                  href="/goods-receipts/new"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  Buka Penerimaan Barang Baru &rarr;
                </Link>
              </div>
            </div>

            {/* Guide Item 2 */}
            <div className="flex flex-col justify-between rounded-lg border border-zinc-200/80 bg-white/90 p-3.5 transition hover:border-amber-400 dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-amber-500/50">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    BR-05 s/d BR-08
                  </span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    Outbound
                  </span>
                </div>
                <h3 className="mt-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  2. Engine Alokasi Otomatis FEFO
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Mencegah kerugian kadaluwarsa dengan algoritma otomatis First-Expired, First-Out
                  saat verifikasi pesanan pengeluaran barang.
                </p>
              </div>
              <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800/80">
                <Link
                  href="/delivery-orders/new"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  Buka Pengeluaran Barang FEFO &rarr;
                </Link>
              </div>
            </div>

            {/* Guide Item 3 */}
            <div className="flex flex-col justify-between rounded-lg border border-zinc-200/80 bg-white/90 p-3.5 transition hover:border-amber-400 dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-amber-500/50">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    BR-11 s/d BR-13
                  </span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    Audit Flow
                  </span>
                </div>
                <h3 className="mt-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  3. Stock Opname 4-Eyes Principle
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Kepatuhan SOP pergudangan: Petugas melakukan blind-count, disusul review selisih
                  &amp; persetujuan Manager sebelum mutasi koreksi.
                </p>
              </div>
              <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800/80">
                <Link
                  href="/stock-opname"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  Review Siklus Opname &rarr;
                </Link>
              </div>
            </div>

            {/* Guide Item 4 */}
            <div className="flex flex-col justify-between rounded-lg border border-zinc-200/80 bg-white/90 p-3.5 transition hover:border-amber-400 dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-amber-500/50">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    BR-14 &amp; BR-15
                  </span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    Quality
                  </span>
                </div>
                <h3 className="mt-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  4. Retur Konsumen &amp; QC Grading
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Klasifikasi barang retur (GOOD / DAMAGED / EXPIRED) yang otomatis memisahkan stok
                  siap jual dengan barang karantina.
                </p>
              </div>
              <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800/80">
                <Link
                  href="/customer-returns"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  Buka Modul Retur Konsumen &rarr;
                </Link>
              </div>
            </div>

            {/* Guide Item 5 */}
            <div className="flex flex-col justify-between rounded-lg border border-zinc-200/80 bg-white/90 p-3.5 transition hover:border-amber-400 dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-amber-500/50">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    BR-09, 10, 16
                  </span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    Ledger
                  </span>
                </div>
                <h3 className="mt-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  5. Kartu Stok &amp; Jejak Audit Central
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Log mutasi immutable per batch, radar kedaluwarsa &lt;30 hari berisiko tinggi, dan
                  rekaman audit lengkap setiap aksi pengguna.
                </p>
              </div>
              <div className="mt-3 flex items-center gap-3 border-t border-zinc-100 pt-2 dark:border-zinc-800/80">
                <Link
                  href="/stock"
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  Posisi Stok &rarr;
                </Link>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <Link
                  href="/audit-logs"
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  Jejak Audit &rarr;
                </Link>
              </div>
            </div>

            {/* Guide Item 6 */}
            <div className="flex flex-col justify-between rounded-lg border border-zinc-200/80 bg-white/90 p-3.5 transition hover:border-amber-400 dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-amber-500/50">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    Enterprise RBAC
                  </span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    Security
                  </span>
                </div>
                <h3 className="mt-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  6. Kelola Pengguna &amp; Anti-Lockout
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Manajemen 4 tingkat otorisasi (Admin, Manager, Staff, Viewer), tata kelola peran,
                  reset kata sandi, dan proteksi anti-lockout administrator sistem.
                </p>
              </div>
              <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800/80">
                <Link
                  href="/users"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  Kelola Pengguna Sistem &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {/* Total Inventory Value */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#111113]">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Total Nilai Persediaan
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {isLoadingSummary
              ? '...'
              : `Rp ${(summary?.totalInventoryValue || 0).toLocaleString('id-ID')}`}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            Berdasarkan harga beli saat ini
          </div>
        </div>

        {/* Total Stock Units */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#111113]">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Total Unit Persediaan
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {isLoadingSummary
              ? '...'
              : `${(summary?.totalStockUnits || 0).toLocaleString('id-ID')} Unit`}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            Seluruh rak fisik aktif
          </div>
        </div>

        {/* Low Stock Alerts */}
        <Link
          href="/stock"
          className="block rounded-lg border border-amber-300/80 bg-amber-50/50 p-4 transition-colors hover:border-amber-400 dark:border-amber-900/60 dark:bg-amber-950/20"
        >
          <div className="flex items-center justify-between text-xs font-medium text-amber-700 dark:text-amber-400">
            <span>Stok Menipis</span>
            <span className="text-amber-500">→</span>
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-amber-800 dark:text-amber-300">
            {isLoadingSummary ? '...' : `${summary?.lowStockCount || 0} Produk`}
          </div>
          <div className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-400/80">
            Di bawah stok minimum nasional
          </div>
        </Link>

        {/* Expiring Batches */}
        <a
          href="#panel-expiring"
          className="block rounded-lg border border-rose-200 bg-white p-4 transition-colors hover:border-rose-400 dark:border-rose-900/50 dark:bg-[#111113]"
        >
          <div className="flex items-center justify-between text-xs font-medium text-rose-600 dark:text-rose-400">
            <span>Batch Hampir Kedaluwarsa</span>
            <span className="text-rose-500">↓</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-rose-700 dark:text-rose-400">
              {isLoadingSummary ? '...' : `${summary?.expiringBatchesCount || 0} Batch`}
            </span>
            {expiringSummary && expiringSummary.expiredCount > 0 && (
              <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                {expiringSummary.expiredCount} Expired!
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
            {expiringSummary && expiringSummary.totalPotentialLoss > 0
              ? `Potensi risiko Rp ${expiringSummary.totalPotentialLoss.toLocaleString('id-ID')}`
              : 'Kadaluwarsa dalam 30 hari'}
          </div>
        </a>
      </div>

      {/* Operational Draft Alerts Banner */}
      {summary && (summary.draftGoodsReceipts > 0 || summary.draftDeliveryOrders > 0) && (
        <div className="flex flex-col justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-950 sm:flex-row sm:items-center dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
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
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#111113]"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {wh.name} ({wh.code})
                  </span>
                </div>
                <span className="font-mono text-[11px] text-zinc-400">Multi-Rak Terdaftar</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                  <span className="block text-[10px] text-zinc-400">Rak Aktif</span>
                  <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {wh.activeRacks} Rak
                  </span>
                </div>
                <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                  <span className="block text-[10px] text-zinc-400">Total Unit Tersimpan</span>
                  <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                    {wh.totalUnits.toLocaleString('id-ID')} Unit
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expiring Batches Alert Panel (BR-10) */}
      <div
        id="panel-expiring"
        className="space-y-4 rounded-xl border border-rose-200 bg-white p-5 dark:border-rose-950/60 dark:bg-[#111113]"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </span>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Peringatan Batch Kedaluwarsa
              </h2>
              {expiringSummary && expiringSummary.totalBatches > 0 && (
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                  {expiringSummary.totalBatches} Batch Perlu Perhatian
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Pemantauan batch berisiko dengan sisa umur ≤ 30 hari. Segera jadwalkan pengiriman (DO)
              dengan prioritas FEFO atau ajukan penyesuaian untuk batch yang telah kedaluwarsa.
            </p>
          </div>

          {/* Potential Loss Badge */}
          {expiringSummary && expiringSummary.totalPotentialLoss > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-right dark:border-rose-900/60 dark:bg-rose-950/40">
              <div className="text-[10px] font-medium tracking-wide text-rose-600 uppercase dark:text-rose-400">
                Total Nilai Risiko Persediaan
              </div>
              <div className="font-mono text-sm font-bold text-rose-700 dark:text-rose-300">
                Rp {expiringSummary.totalPotentialLoss.toLocaleString('id-ID')}
              </div>
            </div>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setExpiringFilterTab('ALL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              expiringFilterTab === 'ALL'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
            }`}
          >
            Semua Batch (≤ 30 hari)
            {expiringSummary && (
              <span className="py-0.2 ml-1.5 rounded-full bg-zinc-200 px-1.5 text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {expiringSummary.totalBatches}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setExpiringFilterTab('CRITICAL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              expiringFilterTab === 'CRITICAL'
                ? 'bg-red-700 text-white dark:bg-red-600 dark:text-white'
                : 'text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50'
            }`}
          >
            Kritis (≤ 7 hari)
            {expiringSummary && expiringSummary.criticalCount > 0 && (
              <span className="py-0.2 ml-1.5 rounded-full bg-red-100 px-1.5 text-[10px] font-bold text-red-800 dark:bg-red-900 dark:text-red-200">
                {expiringSummary.criticalCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setExpiringFilterTab('EXPIRED')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              expiringFilterTab === 'EXPIRED'
                ? 'bg-rose-800 text-white dark:bg-rose-700 dark:text-white'
                : 'text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50'
            }`}
          >
            Sudah Kedaluwarsa
            {expiringSummary && expiringSummary.expiredCount > 0 && (
              <span className="py-0.2 ml-1.5 rounded-full bg-rose-100 px-1.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                {expiringSummary.expiredCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setExpiringFilterTab('WARNING')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              expiringFilterTab === 'WARNING'
                ? 'bg-amber-600 font-bold text-white dark:bg-amber-500 dark:text-zinc-950'
                : 'text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50'
            }`}
          >
            Mendekati Expired (8-30 hari)
            {expiringSummary && (
              <span className="py-0.2 ml-1.5 rounded-full bg-amber-100 px-1.5 text-[10px] text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {expiringSummary.warningCount}
              </span>
            )}
          </button>
        </div>

        {/* Expiring Batches Table */}
        <DataTable
          columns={expiringColumns}
          data={expiringBatches}
          isLoading={isLoadingExpiring}
          searchPlaceholder="Cari batch, SKU, nama produk, atau lokasi rak..."
          searchField={(item) =>
            `${item.batchNo} ${item.sku} ${item.productName} ${item.locationCode} ${item.warehouseName}`
          }
          pageSize={5}
          emptyTitle="Seluruh Batch Dalam Kondisi Aman"
          emptyDescription="Tidak ada batch persediaan aktif yang mendekati atau telah melewati batas kedaluwarsa pada gudang terpilih."
        />
      </div>

      {/* Movement Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Pergerakan Stok Terkini
          </h2>
          <Link
            href="/stock"
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline dark:text-amber-400"
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
