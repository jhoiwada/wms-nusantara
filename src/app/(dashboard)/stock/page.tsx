'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';

interface ProductStockItem {
  product: {
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    uom: string;
    minStock: number;
    costPrice: number | string;
    trackExpiry: boolean;
    category: {
      id: string;
      name: string;
    } | null;
  };
  totalQuantity: number;
  availableQuantity: number;
  expiredQuantity: number;
  totalValue: number;
  isLowStock: boolean;
  warehouses: {
    id: string;
    code: string;
    name: string;
    quantity: number;
  }[];
}

interface LocationStockItem {
  location: {
    id: string;
    code: string;
    zone: string;
    rack: string;
    level: string;
    isFrozen: boolean;
    isActive: boolean;
  };
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  totalQuantity: number;
  totalItems: number;
  stocks: {
    stockId: string;
    productId: string;
    productName: string;
    sku: string;
    uom: string;
    batchNo: string;
    expiryDate: string | null;
    quantity: number;
  }[];
}

interface ConsistencyResult {
  isConsistent: boolean;
  totalCheckedProducts: number;
  inconsistentCount: number;
  results: {
    productId: string;
    sku: string;
    name: string;
    currentStock: number;
    movementSum: number;
    difference: number;
    isConsistent: boolean;
  }[];
}

interface CategoryOption {
  id: string;
  name: string;
}

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}

export default function StockOverviewPage() {
  const [activeTab, setActiveTab] = useState<'product' | 'location' | 'alerts' | 'consistency'>(
    'product',
  );

  // Master filters
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  // Product tab state
  const [productStocks, setProductStocks] = useState<ProductStockItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Location tab state
  const [locationStocks, setLocationStocks] = useState<LocationStockItem[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationWarehouseFilter, setLocationWarehouseFilter] = useState<string>('ALL');

  // Consistency check state
  const [consistencyData, setConsistencyData] = useState<ConsistencyResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // Load categories & warehouses
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch('/api/v1/categories?activeOnly=true&pageSize=100').then((r) => r.json()),
      fetch('/api/v1/warehouses?activeOnly=true&pageSize=100').then((r) => r.json()),
    ])
      .then(([catJson, whJson]) => {
        if (!isMounted) return;
        if (catJson.data) setCategories(catJson.data);
        if (whJson.data) setWarehouses(whJson.data);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch product stocks
  const [productRefreshKey, setProductRefreshKey] = useState(0);
  const [locationRefreshKey, setLocationRefreshKey] = useState(0);

  // Fetch product stocks
  useEffect(() => {
    if (activeTab !== 'product' && activeTab !== 'alerts') return;

    let isMounted = true;
    const params = new URLSearchParams({ pageSize: '200' });
    if (selectedCategory !== 'ALL') params.append('categoryId', selectedCategory);
    if (selectedWarehouse !== 'ALL') params.append('warehouseId', selectedWarehouse);
    if (lowStockFilter) params.append('lowStockOnly', 'true');

    fetch(`/api/v1/stock?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (isMounted && json.data) setProductStocks(json.data);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingProducts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab, selectedCategory, selectedWarehouse, lowStockFilter, productRefreshKey]);

  // Fetch location stocks
  useEffect(() => {
    if (activeTab !== 'location') return;

    let isMounted = true;
    const params = new URLSearchParams({ groupBy: 'location', pageSize: '200' });
    if (locationWarehouseFilter !== 'ALL') params.append('warehouseId', locationWarehouseFilter);

    fetch(`/api/v1/stock?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (isMounted && json.data) setLocationStocks(json.data);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingLocations(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab, locationWarehouseFilter, locationRefreshKey]);

  // Run consistency check
  const runConsistencyCheck = () => {
    setIsAuditing(true);
    fetch('/api/v1/stock/consistency')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setConsistencyData(json.data);
      })
      .catch(() => {})
      .finally(() => setIsAuditing(false));
  };

  const handleReload = () => {
    if (activeTab === 'product') {
      setIsLoadingProducts(true);
      setProductRefreshKey((k) => k + 1);
    } else if (activeTab === 'location') {
      setIsLoadingLocations(true);
      setLocationRefreshKey((k) => k + 1);
    }
  };

  // Metrics
  const totalUnits = productStocks.reduce((sum, p) => sum + p.totalQuantity, 0);
  const totalValue = productStocks.reduce((sum, p) => sum + p.totalValue, 0);
  const lowStockCount = productStocks.filter((p) => p.isLowStock).length;
  const totalExpiredUnits = productStocks.reduce((sum, p) => sum + p.expiredQuantity, 0);

  // Columns for Product view
  const productColumns: Column<ProductStockItem>[] = [
    {
      key: 'product',
      header: 'Produk & SKU',
      sortable: true,
      render: (row) => (
        <div>
          <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
            <span>{row.product.name}</span>
            {row.product.trackExpiry && (
              <span className="py-0.2 rounded border border-emerald-200 bg-emerald-50 px-1.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                FEFO
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
            <span className="font-mono">{row.product.sku}</span>
            <span>•</span>
            <span>Satuan: {row.product.uom}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Kategori',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {row.product.category?.name || '-'}
        </span>
      ),
    },
    {
      key: 'totalQuantity',
      header: 'Total Stok',
      sortable: true,
      render: (row) => (
        <div className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
          {row.totalQuantity.toLocaleString('id-ID')} {row.product.uom}
        </div>
      ),
    },
    {
      key: 'availableQuantity',
      header: 'Stok Tersedia',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {row.availableQuantity.toLocaleString('id-ID')}
          </div>
          {row.expiredQuantity > 0 && (
            <div className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
              ({row.expiredQuantity} Kedaluwarsa)
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status & Min Stock',
      sortable: true,
      render: (row) => (
        <div>
          {row.availableQuantity === 0 ? (
            <Badge variant="danger">HABIS</Badge>
          ) : row.isLowStock ? (
            <Badge variant="warning">MENIPIS</Badge>
          ) : (
            <Badge variant="success">AMAN</Badge>
          )}
          <div className="mt-0.5 font-mono text-[10px] text-slate-400">
            Min: {row.product.minStock} {row.product.uom}
          </div>
        </div>
      ),
    },
    {
      key: 'totalValue',
      header: 'Nilai Stok',
      sortable: true,
      render: (row) => (
        <div className="font-mono text-xs text-slate-800 dark:text-slate-200">
          Rp {row.totalValue.toLocaleString('id-ID')}
        </div>
      ),
    },
    {
      key: 'warehouses',
      header: 'Sebaran Gudang',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.warehouses.map((wh) => (
            <span
              key={wh.id}
              className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {wh.code}: {wh.quantity}
            </span>
          ))}
          {row.warehouses.length === 0 && (
            <span className="text-[11px] text-slate-400 italic">0 unit</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (row) => (
        <Link href={`/stock/${row.product.id}/card`}>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            Kartu Stok
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Stok & Kartu Stok Gudang
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pantau saldo stok per produk dan lokasi rak, serta verifikasi konsistensi antara mutasi
            dan tabel stok secara menyeluruh.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReload} className="text-xs">
            Muat Ulang
          </Button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Unit Persediaan
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
            {totalUnits.toLocaleString('id-ID')}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Nilai Persediaan
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
            Rp {totalValue.toLocaleString('id-ID')}
          </div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-white p-4 dark:border-amber-900/50 dark:bg-slate-950">
          <div className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Produk Stok Menipis
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-amber-700 dark:text-amber-400">
            {lowStockCount} Produk
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-medium text-rose-600 dark:text-rose-400">
            Stok Kedaluwarsa
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-rose-700 dark:text-rose-400">
            {totalExpiredUnits.toLocaleString('id-ID')} Unit
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('product')}
          className={`border-b-2 px-4 pb-3 text-xs font-semibold transition-colors ${
            activeTab === 'product'
              ? 'border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Saldo per Produk
        </button>
        <button
          onClick={() => setActiveTab('location')}
          className={`border-b-2 px-4 pb-3 text-xs font-semibold transition-colors ${
            activeTab === 'location'
              ? 'border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Saldo per Lokasi Rak
        </button>
        <button
          onClick={() => setActiveTab('consistency')}
          className={`border-b-2 px-4 pb-3 text-xs font-semibold transition-colors ${
            activeTab === 'consistency'
              ? 'border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Audit Konsistensi Stok
        </button>
      </div>

      {/* TAB 1: Saldo per Produk */}
      {activeTab === 'product' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            {/* Filter Category */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="filter-stock-category-select"
                className="text-xs whitespace-nowrap text-slate-500 dark:text-slate-400"
              >
                Kategori:
              </label>
              <select
                id="filter-stock-category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:ring-1 focus:ring-slate-950 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-slate-300"
              >
                <option value="ALL">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Warehouse */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="filter-stock-warehouse-select"
                className="text-xs whitespace-nowrap text-slate-500 dark:text-slate-400"
              >
                Gudang:
              </label>
              <select
                id="filter-stock-warehouse-select"
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:ring-1 focus:ring-slate-950 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-slate-300"
              >
                <option value="ALL">Semua Gudang</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Low stock checkbox */}
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={lowStockFilter}
                onChange={(e) => setLowStockFilter(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-950"
              />
              <span>Hanya Stok Menipis (&le; Min Stock)</span>
            </label>
          </div>

          <DataTable
            columns={productColumns}
            data={productStocks}
            searchField={(item) =>
              `${item.product.name} ${item.product.sku} ${item.product.barcode || ''}`
            }
            searchPlaceholder="Cari nama produk, SKU, barcode..."
            isLoading={isLoadingProducts}
            emptyTitle="Tidak ada stok produk"
            emptyDescription="Tidak ada data stok produk yang sesuai filter."
          />
        </div>
      )}

      {/* TAB 2: Saldo per Lokasi */}
      {activeTab === 'location' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <label
                htmlFor="filter-location-warehouse-select"
                className="text-xs whitespace-nowrap text-slate-500"
              >
                Pilih Gudang:
              </label>
              <select
                id="filter-location-warehouse-select"
                value={locationWarehouseFilter}
                onChange={(e) => setLocationWarehouseFilter(e.target.value)}
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
          </div>

          {isLoadingLocations ? (
            <div className="py-12 text-center text-slate-500">Memuat data lokasi rak...</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {locationStocks.map((item) => (
                <div
                  key={item.location.id}
                  className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                        {item.location.code}
                      </span>
                      <span className="text-xs text-slate-500">({item.warehouse.name})</span>
                    </div>
                    <div>
                      {item.location.isFrozen ? (
                        <span className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
                          DIBEKUKAN (OPNAME)
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-500">
                          Total: {item.totalQuantity} unit
                        </span>
                      )}
                    </div>
                  </div>

                  {item.stocks.length === 0 ? (
                    <div className="py-2 text-xs text-slate-400 italic">
                      Rak kosong (belum ada barang tersimpan)
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {item.stocks.map((s) => (
                        <div
                          key={s.stockId}
                          className="flex items-center justify-between rounded bg-slate-50 p-2 text-xs dark:bg-slate-900"
                        >
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {s.productName}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {s.sku} | Batch: {s.batchNo}
                            </div>
                          </div>
                          <div className="text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {s.quantity} {s.uom}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Audit Konsistensi */}
      {activeTab === 'consistency' && (
        <div className="space-y-5">
          <div className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-950">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Verifikasi Konsistensi Stok
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Memvalidasi bahwa jumlah kumulatif seluruh mutasi stok sesuai dengan saldo stok saat
                ini untuk setiap SKU.
              </p>
            </div>
            <Button
              onClick={runConsistencyCheck}
              disabled={isAuditing}
              size="sm"
              variant="primary"
              className="gap-2 text-xs"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              {isAuditing ? 'Memeriksa...' : 'Jalankan Uji Konsistensi'}
            </Button>
          </div>

          {consistencyData && (
            <div className="space-y-4">
              {consistencyData.isConsistent ? (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60">
                    <svg
                      className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold">
                      100% Konsisten: Semua Saldo Stok Sesuai dengan Riwayat Mutasi!
                    </div>
                    <div className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                      Sebanyak {consistencyData.totalCheckedProducts} produk telah diperiksa dan
                      tidak ada selisih (difference = 0).
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/60">
                    <svg
                      className="h-5 w-5 text-rose-600 dark:text-rose-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold">
                      Ditemukan Selisih pada {consistencyData.inconsistentCount} Produk!
                    </div>
                    <div className="mt-0.5 text-xs text-rose-700 dark:text-rose-300">
                      Jumlah mutasi tidak cocok dengan tabel stok. Segera periksa riwayat mutasi di
                      bawah.
                    </div>
                  </div>
                </div>
              )}

              {/* Consistency Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">SKU</th>
                      <th className="px-3 py-2.5 font-medium">Nama Produk</th>
                      <th className="px-3 py-2.5 text-right font-mono font-medium">Tabel Stok</th>
                      <th className="px-3 py-2.5 text-right font-mono font-medium">Total Mutasi</th>
                      <th className="px-3 py-2.5 text-right font-mono font-medium">Selisih</th>
                      <th className="px-3 py-2.5 text-center font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {consistencyData.results.map((r) => (
                      <tr
                        key={r.productId}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                      >
                        <td className="px-3 py-2.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {r.sku}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                          {r.name}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                          {r.currentStock}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                          {r.movementSum}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          {r.difference === 0
                            ? '0'
                            : r.difference > 0
                              ? `+${r.difference}`
                              : r.difference}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {r.isConsistent ? (
                            <Badge variant="success">Cocok</Badge>
                          ) : (
                            <Badge variant="danger">Selisih</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
