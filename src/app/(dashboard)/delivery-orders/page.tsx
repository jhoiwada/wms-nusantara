'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import type { DeliveryOrderStatus } from '@/types/document';

interface DeliveryOrderItemSummary {
  id: string;
  orderNo: string;
  status: DeliveryOrderStatus;
  shippedAt: string | null;
  notes: string | null;
  createdAt: string;
  customer: {
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

interface CustomerOption {
  id: string;
  code: string;
  name: string;
}

export default function DeliveryOrdersListPage() {
  const [orders, setOrders] = useState<DeliveryOrderItemSummary[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const reloadData = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Fetch warehouses and customers for filters
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch('/api/v1/warehouses?activeOnly=true&pageSize=100').then((r) => r.json()),
      fetch('/api/v1/customers?activeOnly=true&pageSize=100').then((r) => r.json()),
    ])
      .then(([whJson, custJson]) => {
        if (!isMounted) return;
        if (whJson.data) setWarehouses(whJson.data);
        if (custJson.data) setCustomers(custJson.data);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch delivery orders
  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams({ pageSize: '100' });
    if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
    if (selectedWarehouse !== 'ALL') params.append('warehouseId', selectedWarehouse);
    if (selectedCustomer !== 'ALL') params.append('customerId', selectedCustomer);

    fetch(`/api/v1/delivery-orders?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.data) {
          setOrders(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey, selectedStatus, selectedWarehouse, selectedCustomer]);

  const getStatusBadge = (status: DeliveryOrderStatus) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="DRAFT">DRAFT</Badge>;
      case 'SHIPPED':
        return <Badge variant="SHIPPED">SHIPPED</Badge>;
      case 'CANCELLED':
        return <Badge variant="CANCELLED">CANCELLED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const columns: Column<DeliveryOrderItemSummary>[] = [
    {
      key: 'orderNo',
      header: 'No. DO',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <Link
            href={`/delivery-orders/${row.id}`}
            className="font-mono font-semibold text-slate-900 hover:text-blue-600 hover:underline dark:text-slate-100 dark:hover:text-blue-400"
          >
            {row.orderNo}
          </Link>
          <span className="text-[11px] text-slate-500">
            Dibuat: {new Date(row.createdAt).toLocaleDateString('id-ID')}
          </span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{row.customer.name}</div>
          <span className="font-mono text-[11px] text-slate-500">{row.customer.code}</span>
        </div>
      ),
    },
    {
      key: 'warehouse',
      header: 'Gudang Asal',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {row.warehouse.name}
          </span>
          <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {row.warehouse.code}
          </span>
        </div>
      ),
    },
    {
      key: 'itemsCount',
      header: 'Item',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-slate-700 dark:text-slate-300">
          {row._count.items} item
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => getStatusBadge(row.status),
    },
    {
      key: 'shippedAt',
      header: 'Waktu Kirim',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {row.shippedAt
            ? new Date(row.shippedAt).toLocaleString('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Link href={`/delivery-orders/${row.id}`}>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Detail
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const draftCount = orders.filter((o) => o.status === 'DRAFT').length;
  const shippedCount = orders.filter((o) => o.status === 'SHIPPED').length;
  const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Barang Keluar (Delivery Order)
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola pengiriman barang ke customer, validasi stok, dan alokasi batch otomatis FEFO
            (BR-08, BR-16 s.d. BR-19).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={reloadData}
            disabled={isLoading}
            className="text-xs"
          >
            {isLoading ? 'Memuat...' : 'Muat Ulang'}
          </Button>
          <Link href="/delivery-orders/new">
            <Button size="sm" className="text-xs">
              + Buat DO Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total DO</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {orders.length}
          </div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-white p-4 dark:border-amber-900/50 dark:bg-slate-950">
          <div className="text-xs font-medium text-amber-600 dark:text-amber-400">
            DRAFT (Menunggu Pengiriman)
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">
            {draftCount}
          </div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-white p-4 dark:border-emerald-900/50 dark:bg-slate-950">
          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            SHIPPED (Selesai Dikirim)
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {shippedCount}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-medium text-rose-600 dark:text-rose-400">CANCELLED</div>
          <div className="mt-1 text-2xl font-bold text-rose-700 dark:text-rose-400">
            {cancelledCount}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        {/* Status filter pills */}
        <div className="flex items-center gap-1">
          {['ALL', 'DRAFT', 'SHIPPED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedStatus === st
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
              }`}
            >
              {st === 'ALL' ? 'Semua Status' : st}
            </button>
          ))}
        </div>

        <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-800" />

        {/* Warehouse filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-warehouse-select"
            className="text-xs whitespace-nowrap text-slate-500"
          >
            Gudang:
          </label>
          <select
            id="filter-warehouse-select"
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

        {/* Customer filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-customer-select"
            className="text-xs whitespace-nowrap text-slate-500"
          >
            Customer:
          </label>
          <select
            id="filter-customer-select"
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:ring-1 focus:ring-slate-950 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-slate-300"
          >
            <option value="ALL">Semua Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={orders}
        searchField={(item) => `${item.orderNo} ${item.customer.name} ${item.warehouse.name}`}
        searchPlaceholder="Cari nomor DO, customer, gudang..."
        isLoading={isLoading}
        emptyTitle="Tidak ada dokumen pengiriman"
        emptyDescription="Belum ada transaksi barang keluar (DO) yang sesuai dengan filter."
      />
    </div>
  );
}
