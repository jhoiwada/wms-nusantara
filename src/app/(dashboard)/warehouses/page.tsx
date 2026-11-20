'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { LOCATION_CODE_REGEX } from '@/schemas/warehouse.schema';
import { BarcodeLabelPrinter } from '@/components/features/barcode-label-printer';
import { WarehouseMap } from '@/components/features/warehouse-map';

interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    locations: number;
  };
}

interface LocationItem {
  id: string;
  warehouseId: string;
  code: string;
  zone: string;
  rack: string;
  level: string;
  isFrozen: boolean;
  isActive: boolean;
  createdAt: string;
  warehouse: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
  _count?: {
    stocks: number;
    movements: number;
  };
}

export default function WarehousesPage() {
  const [activeTab, setActiveTab] = useState<'warehouses' | 'locations' | 'map'>('warehouses');

  // Warehouses state
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [isWarehousesLoading, setIsWarehousesLoading] = useState(true);

  // Locations state
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [isLocationsLoading, setIsLocationsLoading] = useState(true);
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('ALL');

  const [refreshKey, setRefreshKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Warehouse Dialog state
  const [isWhDialogOpen, setIsWhDialogOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<WarehouseItem | null>(null);
  const [whFormCode, setWhFormCode] = useState('');
  const [whFormName, setWhFormName] = useState('');
  const [whFormAddress, setWhFormAddress] = useState('');
  const [whFormError, setWhFormError] = useState<string | null>(null);

  // Location Dialog state
  const [isLocDialogOpen, setIsLocDialogOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<LocationItem | null>(null);
  const [printingLoc, setPrintingLoc] = useState<LocationItem | null>(null);
  const [locFormWhId, setLocFormWhId] = useState('');
  const [locFormCode, setLocFormCode] = useState('');
  const [locFormError, setLocFormError] = useState<string | null>(null);

  const reloadData = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Fetch warehouses
  useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/warehouses?pageSize=100')
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.data) {
          setWarehouses(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsWarehousesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // Fetch locations
  useEffect(() => {
    let isMounted = true;
    const url =
      selectedWarehouseFilter === 'ALL'
        ? '/api/v1/locations?pageSize=200'
        : `/api/v1/locations?pageSize=200&warehouseId=${encodeURIComponent(selectedWarehouseFilter)}`;

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.data) {
          setLocations(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLocationsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey, selectedWarehouseFilter]);

  // Warehouse Handlers
  const handleOpenAddWh = () => {
    setEditingWh(null);
    setWhFormCode('');
    setWhFormName('');
    setWhFormAddress('');
    setWhFormError(null);
    setIsWhDialogOpen(true);
  };

  const handleOpenEditWh = (wh: WarehouseItem) => {
    setEditingWh(wh);
    setWhFormCode(wh.code);
    setWhFormName(wh.name);
    setWhFormAddress(wh.address || '');
    setWhFormError(null);
    setIsWhDialogOpen(true);
  };

  const handleToggleActivateWh = (wh: WarehouseItem) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/warehouses/${wh.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !wh.isActive }),
        });
        if (res.ok) reloadData();
      } catch {
        // silent
      }
    });
  };

  const handleDeactivateWh = (wh: WarehouseItem) => {
    if (
      !confirm(`Nonaktifkan gudang '${wh.name}'? Lokasi dan riwayat mutasi tetap aman tersimpan.`)
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/warehouses/${wh.id}`, { method: 'DELETE' });
        if (res.ok) reloadData();
      } catch {
        // silent
      }
    });
  };

  const handleSubmitWh = (e: React.FormEvent) => {
    e.preventDefault();
    setWhFormError(null);

    const payload = {
      code: whFormCode.trim().toUpperCase(),
      name: whFormName.trim(),
      address: whFormAddress.trim() || null,
    };

    startTransition(async () => {
      try {
        const url = editingWh ? `/api/v1/warehouses/${editingWh.id}` : '/api/v1/warehouses';
        const method = editingWh ? 'PATCH' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok) {
          setWhFormError(json.error?.message || 'Gagal menyimpan gudang');
          return;
        }

        setIsWhDialogOpen(false);
        reloadData();
      } catch {
        setWhFormError('Terjadi kesalahan jaringan');
      }
    });
  };

  // Location Handlers
  const handleOpenAddLoc = () => {
    setEditingLoc(null);
    setLocFormWhId(warehouses[0]?.id || '');
    setLocFormCode('');
    setLocFormError(null);
    setIsLocDialogOpen(true);
  };

  const handleOpenEditLoc = (loc: LocationItem) => {
    setEditingLoc(loc);
    setLocFormWhId(loc.warehouseId);
    setLocFormCode(loc.code);
    setLocFormError(null);
    setIsLocDialogOpen(true);
  };

  const handleToggleFreezeLoc = (loc: LocationItem) => {
    const actionText = loc.isFrozen ? 'Buka pembekuan' : 'Bekukan';
    if (
      !confirm(
        `${actionText} lokasi '${loc.code}'? Saat dibekukan, transaksi mutasi barang akan dinonaktifkan sementara.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/locations/${loc.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFrozen: !loc.isFrozen }),
        });
        if (res.ok) reloadData();
      } catch {
        // silent
      }
    });
  };

  const handleToggleActivateLoc = (loc: LocationItem) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/locations/${loc.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !loc.isActive }),
        });
        if (res.ok) reloadData();
      } catch {
        // silent
      }
    });
  };

  const handleDeactivateLoc = (loc: LocationItem) => {
    if (
      !confirm(
        `Nonaktifkan lokasi '${loc.code}'? Lokasi nonaktif tidak dapat dipilih untuk dokumen mutasi baru.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/locations/${loc.id}`, { method: 'DELETE' });
        if (res.ok) reloadData();
      } catch {
        // silent
      }
    });
  };

  const handleSubmitLoc = (e: React.FormEvent) => {
    e.preventDefault();
    setLocFormError(null);

    const normalizedCode = locFormCode.trim().toUpperCase();
    if (!LOCATION_CODE_REGEX.test(normalizedCode)) {
      setLocFormError('Format kode lokasi harus Zona-Rak-Level, contoh: A-01-02');
      return;
    }

    const payload = {
      warehouseId: locFormWhId,
      code: normalizedCode,
    };

    startTransition(async () => {
      try {
        const url = editingLoc ? `/api/v1/locations/${editingLoc.id}` : '/api/v1/locations';
        const method = editingLoc ? 'PATCH' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok) {
          setLocFormError(json.error?.message || 'Gagal menyimpan lokasi rak');
          return;
        }

        setIsLocDialogOpen(false);
        reloadData();
      } catch {
        setLocFormError('Terjadi kesalahan jaringan');
      }
    });
  };

  // Preview parsed code for Location dialog
  const isCodeValid = LOCATION_CODE_REGEX.test(locFormCode.trim().toUpperCase());
  const parsedCodeParts = isCodeValid ? locFormCode.trim().toUpperCase().split('-') : null;

  // Warehouses Table Columns
  const warehouseColumns: Column<WarehouseItem>[] = [
    {
      key: 'code',
      header: 'Kode Gudang',
      sortable: true,
      render: (item: WarehouseItem) => (
        <span className="rounded border border-slate-200 bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100">
          {item.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Nama Gudang',
      sortable: true,
      render: (item: WarehouseItem) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</div>
          {item.address ? (
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.address}</div>
          ) : (
            <div className="mt-0.5 text-xs text-slate-400 italic">Tidak ada alamat tercatat</div>
          )}
        </div>
      ),
    },
    {
      key: 'locationsCount',
      header: 'Kapasitas Lokasi Rak',
      sortable: true,
      render: (item: WarehouseItem) => (
        <span className="inline-flex items-center gap-1.5 rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          {item._count?.locations ?? 0} Titik Rak
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status Operasional',
      render: (item: WarehouseItem) => (
        <Badge variant={item.isActive ? 'success' : 'neutral'}>
          {item.isActive ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (item: WarehouseItem) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleOpenEditWh(item)}
            className="h-7 px-2 text-xs"
          >
            Edit
          </Button>
          {item.isActive ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDeactivateWh(item)}
              disabled={isPending}
              className="h-7 border-rose-200 px-2 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/50"
            >
              Nonaktifkan
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleToggleActivateWh(item)}
              disabled={isPending}
              className="h-7 border-emerald-200 px-2 text-xs text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
            >
              Aktifkan
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Locations Table Columns
  const locationColumns: Column<LocationItem>[] = [
    {
      key: 'code',
      header: 'Kode Lokasi',
      sortable: true,
      render: (item: LocationItem) => (
        <span className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
          {item.code}
        </span>
      ),
    },
    {
      key: 'structure',
      header: 'Zona / Rak / Level',
      render: (item: LocationItem) => (
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span
            className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            title="Zona"
          >
            Z: {item.zone}
          </span>
          <span className="text-slate-400 dark:text-slate-600">/</span>
          <span
            className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            title="Rak"
          >
            R: {item.rack}
          </span>
          <span className="text-slate-400 dark:text-slate-600">/</span>
          <span
            className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            title="Level"
          >
            L: {item.level}
          </span>
        </div>
      ),
    },
    {
      key: 'warehouse',
      header: 'Gudang',
      sortable: true,
      render: (item: LocationItem) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {item.warehouse.name}
          </span>
          <span className="ml-1.5 rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {item.warehouse.code}
          </span>
        </div>
      ),
    },
    {
      key: 'isFrozen',
      header: 'Status Lokasi',
      render: (item: LocationItem) =>
        item.isFrozen ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <svg
              className="h-3 w-3 text-rose-500 dark:text-rose-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Dibekukan (Frozen)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Normal (Terbuka)
          </span>
        ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (item: LocationItem) => (
        <Badge variant={item.isActive ? 'success' : 'neutral'}>
          {item.isActive ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (item: LocationItem) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPrintingLoc(item)}
            className="h-7 px-2 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
            title="Cetak Label Rak"
          >
            Label
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleOpenEditLoc(item)}
            className="h-7 px-2 text-xs"
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleToggleFreezeLoc(item)}
            disabled={isPending}
            className={`h-7 px-2 text-xs ${
              item.isFrozen
                ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-950/50'
                : 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-950/50'
            }`}
          >
            {item.isFrozen ? 'Buka' : 'Bekukan'}
          </Button>
          {item.isActive ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDeactivateLoc(item)}
              disabled={isPending}
              className="h-7 border-rose-200 px-2 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/50"
            >
              Nonaktifkan
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleToggleActivateLoc(item)}
              disabled={isPending}
              className="h-7 border-emerald-200 px-2 text-xs text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
            >
              Aktifkan
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Master Gudang & Lokasi Rak
            </h1>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
              {warehouses.length} Gudang • {locations.length} Lokasi
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manajemen multi-gudang dan penataan rak penyimpanan per zona, rak, dan level (format
            Zona-Rak-Level).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'warehouses' && (
            <Button onClick={handleOpenAddWh} className="gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Tambah Gudang
            </Button>
          )}
          {activeTab === 'locations' && (
            <Button onClick={handleOpenAddLoc} className="gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Tambah Lokasi Rak
            </Button>
          )}
          {activeTab === 'map' && (
            <a
              href="/warehouse-map"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-950 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Buka Layar Penuh
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('warehouses')}
          className={`border-b-2 px-3 pb-3 text-sm font-semibold transition-colors ${
            activeTab === 'warehouses'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Daftar Gudang ({warehouses.length})
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`border-b-2 px-3 pb-3 text-sm font-semibold transition-colors ${
            activeTab === 'locations'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Lokasi Rak Penyimpanan ({locations.length})
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`border-b-2 px-3 pb-3 text-sm font-semibold transition-colors ${
            activeTab === 'map'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Denah Interaktif (2D Map)
        </button>
      </div>

      {/* Content Tab 1: Warehouses */}
      {activeTab === 'warehouses' ? (
        <DataTable
          columns={warehouseColumns}
          data={warehouses}
          isLoading={isWarehousesLoading}
          searchPlaceholder="Cari kode atau nama gudang..."
          searchField={(item) => `${item.code} ${item.name} ${item.address || ''}`}
          pageSize={10}
          emptyTitle="Belum ada gudang terdaftar"
          emptyDescription="Tambahkan fasilitas gudang fisik Anda untuk mulai menata inventaris."
        />
      ) : (
        /* Content Tab 2: Locations */
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Filter Gudang:
            </span>
            <select
              value={selectedWarehouseFilter}
              onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
              className="h-8 rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="ALL">Semua Gudang</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
            <span className="ml-auto hidden text-xs text-slate-500 sm:inline dark:text-slate-400">
              Format kode rak wajib Zona-Rak-Level:{' '}
              <code className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                ^[A-Z]-\d&#123;2&#125;-\d&#123;2&#125;$
              </code>
            </span>
          </div>

          <DataTable
            columns={locationColumns}
            data={locations}
            isLoading={isLocationsLoading}
            searchPlaceholder="Cari kode lokasi, zona, rak, atau nama gudang..."
            searchField={(item) =>
              `${item.code} ${item.zone} ${item.rack} ${item.level} ${item.warehouse.name} ${item.warehouse.code}`
            }
            pageSize={15}
            emptyTitle="Belum ada lokasi rak"
            emptyDescription="Tambahkan titik lokasi penyimpanan rak di gudang yang dipilih."
          />
        </div>
      )}

      {/* Content Tab 3: Interactive Map */}
      {activeTab === 'map' && (
        <div className="pt-2">
          <WarehouseMap />
        </div>
      )}

      {/* Warehouse Add / Edit Dialog */}
      <Dialog
        isOpen={isWhDialogOpen}
        onClose={() => setIsWhDialogOpen(false)}
        title={editingWh ? 'Edit Data Gudang' : 'Tambah Gudang Baru'}
        description="Pastikan kode gudang unik. Gudang yang dinonaktifkan tidak dapat menerima transaksi barang baru."
        maxWidth="md"
      >
        <form onSubmit={handleSubmitWh} className="space-y-4">
          {whFormError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
              {whFormError}
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Kode Gudang <span className="text-rose-500">*</span>
            </label>
            <Input
              value={whFormCode}
              onChange={(e) => setWhFormCode(e.target.value.toUpperCase())}
              placeholder="mis. WH-JKT"
              required
              className="font-mono text-sm uppercase"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Kode unik gudang (mis. WH-JKT, WH-BKS).
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Nama Fasilitas Gudang <span className="text-rose-500">*</span>
            </label>
            <Input
              value={whFormName}
              onChange={(e) => setWhFormName(e.target.value)}
              placeholder="mis. Gudang Utama Cakung Jakarta"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Alamat Lengkap (Opsional)
            </label>
            <textarea
              value={whFormAddress}
              onChange={(e) => setWhFormAddress(e.target.value)}
              placeholder="Alamat fisik gudang..."
              rows={3}
              className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsWhDialogOpen(false)}>
              Batal
            </Button>
            <Button type="submit" isLoading={isPending}>
              {editingWh ? 'Simpan Perubahan' : 'Buat Gudang'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Location Add / Edit Dialog */}
      <Dialog
        isOpen={isLocDialogOpen}
        onClose={() => setIsLocDialogOpen(false)}
        title={editingLoc ? 'Edit Lokasi Rak' : 'Tambah Lokasi Rak Baru'}
        description="Format kode wajib mengikuti Zona-Rak-Level (contoh: A-01-02). Kode harus unik per fasilitas gudang."
        maxWidth="md"
      >
        <form onSubmit={handleSubmitLoc} className="space-y-4">
          {locFormError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
              {locFormError}
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Gudang Tujuan <span className="text-rose-500">*</span>
            </label>
            <select
              value={locFormWhId}
              onChange={(e) => setLocFormWhId(e.target.value)}
              required
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {warehouses.length === 0 ? (
                <option value="">Tidak ada gudang aktif</option>
              ) : (
                warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Kode Lokasi (Zona-Rak-Level) <span className="text-rose-500">*</span>
            </label>
            <Input
              value={locFormCode}
              onChange={(e) => setLocFormCode(e.target.value.toUpperCase())}
              placeholder="mis. A-01-02"
              required
              className="font-mono text-sm uppercase"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Pola: 1 huruf zona + strip + 2 digit nomor rak + strip + 2 digit tingkat level
              (contoh: A-01-02).
            </p>
          </div>

          {/* Real-time regex breakdown preview */}
          {locFormCode.trim() ? (
            <div
              className={`rounded-lg border p-3 text-xs ${
                isCodeValid
                  ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800'
                  : 'border-amber-200 bg-amber-50/80 text-amber-800'
              }`}
            >
              {isCodeValid && parsedCodeParts ? (
                <div>
                  <div className="flex items-center gap-1.5 font-semibold">
                    <svg
                      className="h-4 w-4 text-emerald-600"
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
                    Format Kode Lokasi Sesuai:
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center font-mono">
                    <div className="rounded border border-emerald-200 bg-white/80 p-1.5">
                      <div className="text-[10px] text-slate-500">Zona</div>
                      <div className="font-bold text-slate-900">{parsedCodeParts[0]}</div>
                    </div>
                    <div className="rounded border border-emerald-200 bg-white/80 p-1.5">
                      <div className="text-[10px] text-slate-500">Rak</div>
                      <div className="font-bold text-slate-900">{parsedCodeParts[1]}</div>
                    </div>
                    <div className="rounded border border-emerald-200 bg-white/80 p-1.5">
                      <div className="text-[10px] text-slate-500">Level</div>
                      <div className="font-bold text-slate-900">{parsedCodeParts[2]}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 shrink-0 text-amber-600"
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
                  <span>
                    Format belum sesuai. Pola wajib: <code className="font-bold">A-01-02</code> (1
                    huruf, 2 digit, 2 digit).
                  </span>
                </div>
              )}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsLocDialogOpen(false)}>
              Batal
            </Button>
            <Button type="submit" isLoading={isPending} disabled={!isCodeValid}>
              {editingLoc ? 'Simpan Perubahan' : 'Buat Lokasi Rak'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Location Barcode Label Dialog */}
      <Dialog
        isOpen={!!printingLoc}
        onClose={() => setPrintingLoc(null)}
        title={printingLoc ? `Cetak Label Rak: ${printingLoc.code}` : ''}
      >
        {printingLoc && (
          <div className="pt-2">
            <BarcodeLabelPrinter
              isModal={true}
              defaultPreset="100x50"
              onClose={() => setPrintingLoc(null)}
              initialItems={[
                {
                  id: `loc-${printingLoc.id}`,
                  type: 'LOCATION',
                  title: printingLoc.code,
                  subtitle: `${printingLoc.warehouse.name} (${printingLoc.warehouse.code})`,
                  barcodeValue: printingLoc.code,
                  displayCode: printingLoc.code,
                  secondaryInfo: `Zona ${printingLoc.zone} • Rak ${printingLoc.rack} • Tkt ${printingLoc.level}`,
                  copies: 1,
                },
              ]}
            />
          </div>
        )}
      </Dialog>
    </div>
  );
}
