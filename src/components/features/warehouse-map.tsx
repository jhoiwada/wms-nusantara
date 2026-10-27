'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { ExpiryBadge } from '@/components/features/expiry-badge';
import { BarcodeLabelPrinter } from '@/components/features/barcode-label-printer';
import type { LabelItem } from '@/types/label';
import type {
  WarehouseMapData,
  EnrichedLocationCell,
} from '@/server/services/warehouse-map.service';

export type MapViewMode = 'occupancy' | 'density' | 'expiry';

export interface WarehouseMapProps {
  initialWarehouseId?: string;
  className?: string;
}

export function WarehouseMap({ initialWarehouseId, className = '' }: WarehouseMapProps) {
  const [data, setData] = useState<WarehouseMapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Controls
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(initialWarehouseId || '');
  const [activeZone, setActiveZone] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<MapViewMode>('occupancy');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'OCCUPIED' | 'EMPTY' | 'FROZEN' | 'EXPIRING'
  >('ALL');

  // Inspector & Label Print States
  const [selectedLocation, setSelectedLocation] = useState<EnrichedLocationCell | null>(null);
  const [isPrintingLabel, setIsPrintingLabel] = useState(false);
  const [isTogglingFreeze, setIsTogglingFreeze] = useState(false);

  const fetchMapData = useCallback(() => {
    setRefreshTrigger((k) => k + 1);
  }, []);

  // Fetch map data
  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams();
    if (selectedWarehouseId) {
      params.set('warehouseId', selectedWarehouseId);
    }

    fetch(`/api/v1/warehouse-map?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat denah gudang');
        return res.json();
      })
      .then((json) => {
        if (!isMounted || !json.data) return;
        setData(json.data);
        if (!selectedWarehouseId && json.data.warehouse?.id) {
          setSelectedWarehouseId(json.data.warehouse.id);
        }
        if (selectedLocation) {
          const updated = json.data.locations.find(
            (l: EnrichedLocationCell) => l.id === selectedLocation.id,
          );
          if (updated) setSelectedLocation(updated);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedWarehouseId, refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle warehouse switch
  const handleWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWarehouseId(e.target.value);
    setActiveZone('ALL');
    setSelectedLocation(null);
  };

  // Toggle freeze/unfreeze on selected location (BR-22)
  const handleToggleFreeze = async (loc: EnrichedLocationCell) => {
    const actionText = loc.isFrozen ? 'Buka pembekuan' : 'Bekukan';
    if (
      !confirm(
        `${actionText} lokasi '${loc.code}'? Saat dibekukan, transaksi stok tidak dapat dialokasikan (BR-22).`,
      )
    ) {
      return;
    }

    try {
      setIsTogglingFreeze(true);
      const res = await fetch(`/api/v1/locations/${loc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFrozen: !loc.isFrozen }),
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error?.message || 'Gagal mengubah status pembekuan');
        return;
      }
      await fetchMapData();
    } catch {
      alert('Terjadi kesalahan jaringan');
    } finally {
      setIsTogglingFreeze(false);
    }
  };

  // Filter locations according to zone, status, and search query
  const filteredLocations = useMemo(() => {
    if (!data) return [];

    return data.locations.filter((loc) => {
      // Zone filter
      if (activeZone !== 'ALL' && loc.zone !== activeZone) {
        return false;
      }

      // Status filter
      if (statusFilter === 'OCCUPIED' && loc.totalQuantity === 0) return false;
      if (statusFilter === 'EMPTY' && loc.totalQuantity > 0) return false;
      if (statusFilter === 'FROZEN' && !loc.isFrozen) return false;
      if (statusFilter === 'EXPIRING' && !loc.hasExpiringSoon && !loc.hasExpired) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchCode = loc.code.toLowerCase().includes(q);
        const matchZone = loc.zone.toLowerCase().includes(q);
        const matchRack = loc.rack.toLowerCase().includes(q);
        const matchStock = loc.stocks.some(
          (s) =>
            s.sku.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            s.batchNo.toLowerCase().includes(q) ||
            (s.categoryName && s.categoryName.toLowerCase().includes(q)),
        );
        if (!matchCode && !matchZone && !matchRack && !matchStock) return false;
      }

      return true;
    });
  }, [data, activeZone, statusFilter, searchQuery]);

  // Group filtered locations by Zone -> Rack -> Level
  const groupedByZone = useMemo(() => {
    const map = new Map<string, Map<string, EnrichedLocationCell[]>>();

    for (const loc of filteredLocations) {
      if (!map.has(loc.zone)) {
        map.set(loc.zone, new Map());
      }
      const zoneMap = map.get(loc.zone)!;
      if (!zoneMap.has(loc.rack)) {
        zoneMap.set(loc.rack, []);
      }
      zoneMap.get(loc.rack)!.push(loc);
    }

    // Sort racks and levels (levels descending so Level 03 is physically top, Level 01 is ground)
    const result: Array<{
      zone: string;
      racks: Array<{
        rack: string;
        levels: EnrichedLocationCell[];
      }>;
    }> = [];

    const sortedZones = Array.from(map.keys()).sort();
    for (const zone of sortedZones) {
      const zoneMap = map.get(zone)!;
      const sortedRacks = Array.from(zoneMap.keys()).sort();

      const racks = sortedRacks.map((rack) => {
        const levels = zoneMap.get(rack)!.sort((a, b) => b.level.localeCompare(a.level));
        return { rack, levels };
      });

      result.push({ zone, racks });
    }

    return result;
  }, [filteredLocations]);

  // Format label item for printing
  const labelItemForSelected: LabelItem | null = useMemo(() => {
    if (!selectedLocation || !data) return null;
    return {
      id: selectedLocation.id,
      type: 'LOCATION',
      title: `LOKASI: ${selectedLocation.code}`,
      subtitle: `${data.warehouse.name} • Zona ${selectedLocation.zone}`,
      barcodeValue: selectedLocation.code,
      displayCode: selectedLocation.code,
      secondaryInfo: `Rak: ${selectedLocation.rack} | Level: ${selectedLocation.level}`,
      badgeText: selectedLocation.isFrozen ? 'DIBEKUKAN' : 'NORMAL',
      copies: 1,
    };
  }, [selectedLocation, data]);

  // Cell color helper based on view mode and occupancy status
  const getCellClasses = (loc: EnrichedLocationCell) => {
    const isSelected = selectedLocation?.id === loc.id;
    const isMatchSearch =
      searchQuery.trim() !== '' &&
      (loc.code.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        loc.stocks.some(
          (s) =>
            s.sku.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
            s.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
        ));

    let style = '';

    if (viewMode === 'occupancy') {
      if (!loc.isActive) {
        style = 'bg-slate-100 border-slate-300 text-slate-400 opacity-60';
      } else if (loc.isFrozen) {
        style = 'bg-rose-50 border-rose-400 text-rose-900 shadow-sm';
      } else if (loc.occupancyStatus === 'EMPTY') {
        style = 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100';
      } else if (loc.occupancyStatus === 'FULL') {
        style = 'bg-indigo-50 border-indigo-400 text-indigo-950 shadow-sm hover:bg-indigo-100';
      } else {
        style = 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-sm hover:bg-emerald-100';
      }
    } else if (viewMode === 'density') {
      if (loc.totalQuantity === 0) {
        style = 'bg-slate-50 border-slate-200 text-slate-400';
      } else if (loc.totalQuantity <= 25) {
        style = 'bg-cyan-50 border-cyan-300 text-cyan-900';
      } else if (loc.totalQuantity <= 75) {
        style = 'bg-sky-100 border-sky-400 text-sky-950 font-medium';
      } else if (loc.totalQuantity <= 150) {
        style = 'bg-blue-200 border-blue-500 text-blue-950 font-semibold';
      } else {
        style = 'bg-indigo-300 border-indigo-600 text-indigo-950 font-bold';
      }
    } else if (viewMode === 'expiry') {
      if (loc.hasExpired) {
        style = 'bg-rose-100 border-rose-500 text-rose-950 font-semibold animate-pulse';
      } else if (loc.hasExpiringSoon) {
        style = 'bg-amber-100 border-amber-500 text-amber-950 font-medium';
      } else if (loc.totalQuantity > 0) {
        style = 'bg-slate-100 border-slate-300 text-slate-700';
      } else {
        style = 'bg-slate-50 border-slate-200 text-slate-400';
      }
    }

    const selectRing = isSelected ? 'ring-2 ring-indigo-600 ring-offset-2 border-indigo-600' : '';
    const searchRing =
      isMatchSearch && !isSelected ? 'ring-2 ring-amber-500 ring-offset-1 border-amber-500' : '';

    return `relative flex flex-col justify-between p-2 rounded-md border text-left transition-all cursor-pointer ${style} ${selectRing} ${searchRing}`;
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
        <p className="mt-3 text-sm font-medium text-slate-600">
          Memuat denah dan tata letak gudang...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50/50 p-8 text-center">
        <div className="rounded-full bg-rose-100 p-3 text-rose-600">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="mt-3 text-base font-semibold text-rose-900">Gagal Memuat Denah Gudang</h3>
        <p className="mt-1 max-w-md text-sm text-rose-600">
          {error || 'Data gudang tidak tersedia'}
        </p>
        <Button
          onClick={fetchMapData}
          variant="outline"
          className="mt-4 border-rose-300 text-rose-700 hover:bg-rose-100"
        >
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header & Warehouse Switcher */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{data.warehouse.name}</h2>
              <span className="rounded bg-indigo-100 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-800">
                {data.warehouse.code}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {data.warehouse.address || 'Denah tata letak dan okupansi rak gudang (2D Layout)'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Warehouse Selector */}
          <select
            value={selectedWarehouseId}
            onChange={handleWarehouseChange}
            aria-label="Pilih Gudang"
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
          >
            {data.availableWarehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>

          <Button size="sm" variant="outline" onClick={fetchMapData} title="Muat Ulang Data">
            <svg
              className="h-4 w-4 text-slate-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500">Total Kapasitas Rak</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900">{data.summary.totalLocations}</span>
            <span className="text-xs text-slate-500">lokasi</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500">Tingkat Okupansi</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-indigo-600">
              {data.summary.occupancyRate}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all duration-500 ${
                data.summary.occupancyRate > 85
                  ? 'bg-rose-500'
                  : data.summary.occupancyRate > 50
                    ? 'bg-indigo-600'
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(data.summary.occupancyRate, 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500">Lokasi Terisi</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-600">
              {data.summary.occupiedLocations}
            </span>
            <span className="text-xs text-slate-500">rak</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500">Slot Kosong (Tersedia)</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-700">{data.summary.emptyLocations}</span>
            <span className="text-xs text-slate-500">slot</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500">Dibekukan (Opname)</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-rose-600">{data.summary.frozenLocations}</span>
            <span className="text-xs text-slate-500">lokasi</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500">Total Stok Fisik</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900">
              {data.summary.totalUnits.toLocaleString('id-ID')}
            </span>
            <span className="text-xs text-slate-500">unit</span>
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        {/* Left: View Mode Switcher */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500">Mode Tampilan:</span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
            <button
              onClick={() => setViewMode('occupancy')}
              className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                viewMode === 'occupancy'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Status &amp; Okupansi
            </button>
            <button
              onClick={() => setViewMode('density')}
              className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                viewMode === 'density'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Heatmap Kepadatan
            </button>
            <button
              onClick={() => setViewMode('expiry')}
              className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                viewMode === 'expiry'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kedaluwarsa ({data.summary.expiringBatchesCount + data.summary.expiredBatchesCount})
            </button>
          </div>
        </div>

        {/* Right: Quick Search & Status Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative w-full sm:w-56">
            <Input
              type="text"
              placeholder="Cari SKU, produk, kode rak..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pr-7 pl-7 text-xs"
            />
            <svg
              className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute top-2 right-2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as 'ALL' | 'OCCUPIED' | 'EMPTY' | 'FROZEN' | 'EXPIRING',
              )
            }
            aria-label="Filter Status Rak"
            className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="OCCUPIED">Hanya Terisi</option>
            <option value="EMPTY">Hanya Kosong</option>
            <option value="FROZEN">Hanya Dibekukan (Opname)</option>
            <option value="EXPIRING">Hanya Ada Kedaluwarsa</option>
          </select>
        </div>
      </div>

      {/* Zone Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveZone('ALL')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
            activeZone === 'ALL'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          Semua Zona
          <span className="py-0.2 rounded-full bg-white/20 px-1.5 text-[10px] text-white">
            {data.locations.length}
          </span>
        </button>

        {data.zones.map((z) => (
          <button
            key={z.zone}
            onClick={() => setActiveZone(z.zone)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
              activeZone === z.zone
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            Zona {z.zone}
            <span
              className={`py-0.2 rounded-full px-1.5 text-[10px] ${
                activeZone === z.zone ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {z.occupancyRate}% ({z.totalLocations})
            </span>
          </button>
        ))}
      </div>

      {/* Main Layout Grid & Inspector Sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: 2D Warehouse Rack Layout */}
        <div className={selectedLocation ? 'lg:col-span-8' : 'lg:col-span-12'}>
          {groupedByZone.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-sm font-medium text-slate-600">
                Tidak ada lokasi rak yang sesuai dengan filter.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setActiveZone('ALL');
                  setStatusFilter('ALL');
                  setSearchQuery('');
                }}
                className="mt-3 text-xs"
              >
                Reset Semua Filter
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedByZone.map(({ zone, racks }) => {
                const zoneInfo = data.zones.find((z) => z.zone === zone);
                return (
                  <div
                    key={zone}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    {/* Zone Header */}
                    <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-100 font-bold text-indigo-700">
                          {zone}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Zona {zone}</h3>
                          <span className="text-[11px] text-slate-500">
                            {racks.length} Rak • {zoneInfo?.totalLocations ?? 0} Slot • Okupansi:{' '}
                            {zoneInfo?.occupancyRate ?? 0}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Total Stok Fisik:</span>
                        <span className="font-semibold text-slate-800">
                          {(zoneInfo?.totalQuantity ?? 0).toLocaleString('id-ID')} unit
                        </span>
                      </div>
                    </div>

                    {/* Racks Layout: Columns of Racks with Levels descending (Level 03 top -> Level 01 bottom) */}
                    <div className="overflow-x-auto pb-2">
                      <div className="flex gap-4">
                        {racks.map(({ rack, levels }) => (
                          <div
                            key={rack}
                            className="flex w-36 shrink-0 flex-col rounded-lg border border-slate-200 bg-slate-50/70 p-2.5"
                          >
                            {/* Rack Bay Header */}
                            <div className="mb-2 border-b border-slate-200/80 pb-1 text-center">
                              <span className="font-mono text-xs font-bold text-slate-700">
                                Rak {rack}
                              </span>
                              <div className="text-[10px] text-slate-400">
                                {levels.length} Level Tingkat
                              </div>
                            </div>

                            {/* Levels Grid Stack */}
                            <div className="space-y-2">
                              {levels.map((loc) => {
                                return (
                                  <button
                                    key={loc.id}
                                    type="button"
                                    onClick={() => setSelectedLocation(loc)}
                                    className={`${getCellClasses(loc)} h-20 w-full`}
                                    title={`Klik untuk detail lokasi ${loc.code}`}
                                  >
                                    {/* Top: Code & Status Badges */}
                                    <div className="flex w-full items-center justify-between">
                                      <span className="font-mono text-[11px] font-bold text-slate-800">
                                        L{loc.level}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {loc.isFrozen && (
                                          <span
                                            title="Dibekukan (Opname BR-22)"
                                            className="text-rose-600"
                                          >
                                            <svg
                                              className="h-3 w-3"
                                              fill="currentColor"
                                              viewBox="0 0 20 20"
                                            >
                                              <path
                                                fillRule="evenodd"
                                                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                                clipRule="evenodd"
                                              />
                                            </svg>
                                          </span>
                                        )}
                                        {loc.hasExpired && (
                                          <span
                                            title="Ada batch kedaluwarsa!"
                                            className="h-2 w-2 rounded-full bg-rose-500"
                                          />
                                        )}
                                        {!loc.hasExpired && loc.hasExpiringSoon && (
                                          <span
                                            title="Ada batch hampir kedaluwarsa (<30 hari)"
                                            className="h-2 w-2 rounded-full bg-amber-500"
                                          />
                                        )}
                                      </div>
                                    </div>

                                    {/* Middle: Content Indicator */}
                                    <div className="my-auto w-full text-center">
                                      {loc.totalQuantity === 0 ? (
                                        <span className="text-[10px] font-medium text-slate-400">
                                          Kosong
                                        </span>
                                      ) : (
                                        <div>
                                          <div className="text-xs font-bold text-slate-900">
                                            {loc.totalQuantity.toLocaleString('id-ID')}
                                          </div>
                                          <div className="truncate text-[9px] text-slate-500">
                                            {loc.stocks[0]?.sku || `${loc.itemCount} SKU`}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Bottom: Full Location Code */}
                                    <div className="flex w-full items-center justify-between border-t border-black/5 pt-0.5 font-mono text-[9px] text-slate-400">
                                      <span>{loc.code}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Color Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-sm">
            <span className="font-semibold text-slate-700">Legenda:</span>
            {viewMode === 'occupancy' && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-slate-300 bg-slate-50" />
                  <span>Kosong (0 item)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-emerald-400 bg-emerald-50" />
                  <span>Terisi (&lt; 100 unit)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-indigo-400 bg-indigo-50" />
                  <span>Penuh / Padat (≥ 100 unit)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-rose-400 bg-rose-50" />
                  <span>Dibekukan (Opname BR-22)</span>
                </div>
              </>
            )}

            {viewMode === 'density' && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-slate-300 bg-slate-50" />
                  <span>0</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-cyan-300 bg-cyan-50" />
                  <span>1 - 25 unit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-sky-400 bg-sky-100" />
                  <span>26 - 75 unit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-blue-500 bg-blue-200" />
                  <span>76 - 150 unit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-indigo-600 bg-indigo-300" />
                  <span>&gt; 150 unit</span>
                </div>
              </>
            )}

            {viewMode === 'expiry' && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-slate-300 bg-slate-100" />
                  <span>Stok Aman / Kosong</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-amber-500 bg-amber-100" />
                  <span>Mendekati Kedaluwarsa (&lt;30 hari)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-rose-500 bg-rose-100" />
                  <span>Sudah Kedaluwarsa (Expired)</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Location Inspector Drawer */}
        {selectedLocation && (
          <div className="lg:col-span-4">
            <div className="sticky top-6 rounded-xl border border-indigo-200 bg-white p-5 shadow-md">
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-extrabold text-slate-900">
                      {selectedLocation.code}
                    </span>
                    <Badge
                      variant={
                        selectedLocation.isFrozen
                          ? 'danger'
                          : selectedLocation.isActive
                            ? 'success'
                            : 'neutral'
                      }
                    >
                      {selectedLocation.isFrozen
                        ? 'Dibekukan (Opname)'
                        : selectedLocation.isActive
                          ? 'Aktif'
                          : 'Nonaktif'}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Zona {selectedLocation.zone} • Rak {selectedLocation.rack} • Level{' '}
                    {selectedLocation.level}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedLocation(null)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="Tutup Inspector"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Quick Actions */}
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsPrintingLabel(true)}
                  className="flex-1 gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                  Cetak Label Rak
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={isTogglingFreeze}
                  onClick={() => handleToggleFreeze(selectedLocation)}
                  className={`text-xs ${
                    selectedLocation.isFrozen
                      ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                      : 'border-rose-300 text-rose-700 hover:bg-rose-50'
                  }`}
                  title={selectedLocation.isFrozen ? 'Buka Pembekuan' : 'Bekukan untuk Opname'}
                >
                  {selectedLocation.isFrozen ? 'Buka Kunci' : 'Bekukan (BR-22)'}
                </Button>
              </div>

              {/* Location Stats */}
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 text-xs">
                <div>
                  <span className="text-slate-500">Total Kuantitas:</span>
                  <div className="font-bold text-slate-800">
                    {selectedLocation.totalQuantity.toLocaleString('id-ID')} unit
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Jumlah Batch:</span>
                  <div className="font-bold text-slate-800">{selectedLocation.itemCount} batch</div>
                </div>
              </div>

              {/* Items Stored in this Location */}
              <div className="mt-4">
                <div className="mb-2 text-xs font-semibold text-slate-700">
                  Daftar Barang di Rak Ini:
                </div>

                {selectedLocation.stocks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                    Lokasi ini kosong. Siap digunakan untuk alokasi Putaway barang masuk (Goods
                    Receipt).
                  </div>
                ) : (
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {selectedLocation.stocks.map((item, idx) => (
                      <div
                        key={`${item.productId}-${item.batchNo}-${idx}`}
                        className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs font-semibold text-slate-900">{item.name}</div>
                            <div className="font-mono text-[11px] text-slate-500">{item.sku}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-900">
                              {item.quantity.toLocaleString('id-ID')}
                            </span>
                            <span className="ml-1 text-[10px] text-slate-500">{item.uom}</span>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-between border-t border-slate-100 pt-1.5 text-[10px] text-slate-500">
                          <span>
                            Batch: <strong className="font-mono">{item.batchNo}</strong>
                          </span>
                          {item.expiryDate && (
                            <ExpiryBadge expiryDate={item.expiryDate} size="sm" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Label Printer Modal */}
      {isPrintingLabel && labelItemForSelected && (
        <Dialog
          isOpen={isPrintingLabel}
          onClose={() => setIsPrintingLabel(false)}
          title="Cetak Label Lokasi Rak"
          description="Sesuaikan ukuran stiker dan cetak label barcode untuk rak penyimpanan"
          maxWidth="lg"
        >
          <div className="p-1">
            <BarcodeLabelPrinter
              initialItems={[labelItemForSelected]}
              defaultPreset="100x50"
              isModal={true}
              onClose={() => setIsPrintingLabel(false)}
            />
          </div>
        </Dialog>
      )}
    </div>
  );
}
