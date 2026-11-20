import React from 'react';
import type { Metadata } from 'next';
import { WarehouseMap } from '@/components/features/warehouse-map';

export const metadata: Metadata = {
  title: 'Denah Gudang Interaktif | Distribusi WMS',
  description: 'Visualisasi 2D denah tata letak rak, okupansi, dan alokasi stok per gudang.',
};

export default function WarehouseMapPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Denah Gudang Interaktif
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Peta tata letak 2D rak penyimpanan, tingkat okupansi spasial, dan inspeksi stok per rak
            secara visual.
          </p>
        </div>
      </div>

      <WarehouseMap />
    </div>
  );
}
