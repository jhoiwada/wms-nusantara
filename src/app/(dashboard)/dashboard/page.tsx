'use client';

import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';

interface RecentMovement {
  id: string;
  docNo: string;
  type: 'IN' | 'OUT';
  productName: string;
  sku: string;
  quantity: number;
  warehouse: string;
  location: string;
  status: 'RECEIVED' | 'SHIPPED' | 'DRAFT';
  date: string;
}

const SAMPLE_MOVEMENTS: RecentMovement[] = [
  {
    id: 'm1',
    docNo: 'GR-2026-0001',
    type: 'IN',
    productName: 'Kopi Arabika Gayo 250g',
    sku: 'SKU-FNB-001',
    quantity: 150,
    warehouse: 'Jakarta Utama',
    location: 'A-01-01',
    status: 'RECEIVED',
    date: '2026-10-26 14:30',
  },
  {
    id: 'm2',
    docNo: 'DO-2026-0001',
    type: 'OUT',
    productName: 'Minyak Goreng Sawit 1L',
    sku: 'SKU-FNB-002',
    quantity: 40,
    warehouse: 'Bekasi Timur',
    location: 'A-02-01',
    status: 'SHIPPED',
    date: '2026-10-26 15:15',
  },
  {
    id: 'm3',
    docNo: 'GR-2026-0002',
    type: 'IN',
    productName: 'Paracetamol 500mg Strip',
    sku: 'SKU-MED-001',
    quantity: 500,
    warehouse: 'Jakarta Utama',
    location: 'B-01-01',
    status: 'RECEIVED',
    date: '2026-10-26 16:00',
  },
  {
    id: 'm4',
    docNo: 'DO-2026-0002',
    type: 'OUT',
    productName: 'Masker Medis 3-Ply Box 50',
    sku: 'SKU-MED-002',
    quantity: 60,
    warehouse: 'Jakarta Utama',
    location: 'B-01-02',
    status: 'SHIPPED',
    date: '2026-10-26 16:45',
  },
  {
    id: 'm5',
    docNo: 'GR-2026-0003',
    type: 'IN',
    productName: 'Kabel UTP Cat6 305m Roll',
    sku: 'SKU-ELC-001',
    quantity: 20,
    warehouse: 'Bekasi Timur',
    location: 'B-02-01',
    status: 'DRAFT',
    date: '2026-10-26 17:10',
  },
];

export default function DashboardPage() {
  const columns: Column<RecentMovement>[] = [
    {
      key: 'docNo',
      header: 'No. Dokumen',
      sortable: true,
      render: (row) => <span className="font-mono font-medium text-emerald-400">{row.docNo}</span>,
    },
    {
      key: 'type',
      header: 'Tipe',
      align: 'center',
      render: (row) => <Badge variant={row.type}>{row.type === 'IN' ? 'Masuk' : 'Keluar'}</Badge>,
    },
    {
      key: 'productName',
      header: 'Nama Barang & SKU',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-white">{row.productName}</div>
          <div className="font-mono text-[10px] text-slate-400">{row.sku}</div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Jumlah',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-white">
          {row.quantity.toLocaleString('id-ID')} unit
        </span>
      ),
    },
    {
      key: 'warehouse',
      header: 'Lokasi Rak',
      render: (row) => (
        <div>
          <span className="text-white">{row.warehouse}</span>
          <span className="ml-1.5 font-mono text-emerald-400">({row.location})</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => <Badge variant={row.status}>{row.status}</Badge>,
    },
    {
      key: 'date',
      header: 'Waktu Transaksi',
      align: 'right',
      render: (row) => <span className="text-[11px] text-slate-400">{row.date}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Pusat Kendali Operasional Gudang
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Pemantauan pergerakan inventaris real-time multi-lokasi Jakarta &amp; Bekasi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/goods-receipts">
            <Button size="sm" variant="primary">
              + Barang Masuk (GR)
            </Button>
          </Link>
          <Link href="/delivery-orders">
            <Button size="sm" variant="outline">
              + Barang Keluar (DO)
            </Button>
          </Link>
        </div>
      </div>

      {/* Warehouse Status Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-white">
                Gudang Utama Jakarta (WH-JKT-01)
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Kawasan Industri Pulo Gadung</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5">
              <span className="block text-[10px] text-slate-400">Rak Aktif</span>
              <span className="text-sm font-semibold text-white">4 Rak</span>
            </div>
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5">
              <span className="block text-[10px] text-slate-400">Kapasitas Pallet</span>
              <span className="text-sm font-semibold text-emerald-400">500 Pallet</span>
            </div>
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5">
              <span className="block text-[10px] text-slate-400">Opname Freeze</span>
              <span className="text-sm font-semibold text-slate-300">Normal</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-white">
                Gudang Penyangga Bekasi (WH-BKS-01)
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Kawasan MM2100 Cikarang Barat</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5">
              <span className="block text-[10px] text-slate-400">Rak Aktif</span>
              <span className="text-sm font-semibold text-white">4 Rak</span>
            </div>
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5">
              <span className="block text-[10px] text-slate-400">Kapasitas Pallet</span>
              <span className="text-sm font-semibold text-emerald-400">300 Pallet</span>
            </div>
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5">
              <span className="block text-[10px] text-slate-400">Opname Freeze</span>
              <span className="text-sm font-semibold text-slate-300">Normal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Movement Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Pergerakan Stok Terkini</h2>
          <span className="text-xs text-slate-400">Data tabel real-time</span>
        </div>

        <DataTable
          columns={columns}
          data={SAMPLE_MOVEMENTS}
          searchPlaceholder="Cari berdasarkan nomor dokumen, SKU, atau nama barang..."
          searchField={(item) => `${item.docNo} ${item.sku} ${item.productName}`}
          pageSize={5}
          emptyTitle="Belum ada mutasi"
          emptyDescription="Belum ada transaksi barang masuk atau keluar tercatat."
        />
      </div>
    </div>
  );
}
