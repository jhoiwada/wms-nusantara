'use client';

import React, { useState } from 'react';

export interface MovementChartPoint {
  date: string;
  label: string;
  incomingQty: number;
  outgoingQty: number;
}

interface MovementChartProps {
  data: MovementChartPoint[];
  range: '7d' | '30d';
  onRangeChange: (range: '7d' | '30d') => void;
  isLoading?: boolean;
}

export function MovementChart({
  data,
  range,
  onRangeChange,
  isLoading = false,
}: MovementChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Compute max value for scaling
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.incomingQty, d.outgoingQty)),
    10, // baseline
  );

  const totalIncoming = data.reduce((sum, d) => sum + d.incomingQty, 0);
  const totalOutgoing = data.reduce((sum, d) => sum + d.outgoingQty, 0);

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#111113]">
      {/* Header with Title and Range Switcher */}
      <div className="flex flex-col justify-between gap-3 border-b border-zinc-100 pb-3 sm:flex-row sm:items-center dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold tracking-wider text-zinc-900 uppercase dark:text-zinc-100">
            Grafik Pergerakan Barang (Masuk vs Keluar)
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Perbandingan volume mutasi masuk (GR) dan keluar (DO) per hari.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />
              <span className="text-zinc-600 dark:text-zinc-400">Masuk ({totalIncoming})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-500" />
              <span className="text-zinc-600 dark:text-zinc-400">Keluar ({totalOutgoing})</span>
            </div>
          </div>

          {/* Range Buttons */}
          <div className="flex items-center rounded-md bg-zinc-100 p-0.5 text-xs dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => onRangeChange('7d')}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                range === '7d'
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => onRangeChange('30d')}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                range === '30d'
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              30 Hari
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-56 items-center justify-center text-xs text-zinc-400">
          Memuat visualisasi grafik...
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-xs text-zinc-400">
          Belum ada data transaksi pergerakan barang pada periode ini.
        </div>
      ) : (
        <div className="relative">
          {/* Chart Bars Container */}
          <div className="flex h-56 items-end justify-between gap-1 border-b border-zinc-100 px-2 pt-6 pb-6 dark:border-zinc-800">
            {data.map((point, idx) => {
              const inHeightPct = Math.min(100, Math.round((point.incomingQty / maxVal) * 100));
              const outHeightPct = Math.min(100, Math.round((point.outgoingQty / maxVal) * 100));
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={point.date}
                  className="group relative flex h-full flex-1 cursor-pointer flex-col items-center justify-end"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="pointer-events-none absolute -top-14 z-20 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 font-sans text-[11px] whitespace-nowrap text-white shadow-xl">
                      <div className="font-bold text-zinc-300">{point.date}</div>
                      <div className="mt-0.5 flex items-center gap-2 font-mono">
                        <span className="text-amber-400">+{point.incomingQty} In</span>
                        <span>•</span>
                        <span className="text-rose-400">-{point.outgoingQty} Out</span>
                      </div>
                    </div>
                  )}

                  {/* Dual Bar (In / Out) */}
                  <div className="flex h-full w-full items-end justify-center gap-0.5 sm:gap-1">
                    {/* Incoming Bar */}
                    <div
                      style={{ height: `${Math.max(inHeightPct, point.incomingQty > 0 ? 4 : 1)}%` }}
                      className={`w-1/2 max-w-[16px] rounded-t transition-all ${
                        point.incomingQty > 0
                          ? 'bg-amber-500 group-hover:bg-amber-400'
                          : 'bg-zinc-100 dark:bg-zinc-800'
                      }`}
                    />

                    {/* Outgoing Bar */}
                    <div
                      style={{
                        height: `${Math.max(outHeightPct, point.outgoingQty > 0 ? 4 : 1)}%`,
                      }}
                      className={`w-1/2 max-w-[16px] rounded-t transition-all ${
                        point.outgoingQty > 0
                          ? 'bg-rose-500 group-hover:bg-rose-400'
                          : 'bg-zinc-100 dark:bg-zinc-800'
                      }`}
                    />
                  </div>

                  {/* X Axis Label */}
                  <div className="absolute -bottom-6 max-w-full truncate text-center text-[10px] text-zinc-400">
                    {range === '7d' ? point.label : idx % 5 === 0 ? point.label : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
