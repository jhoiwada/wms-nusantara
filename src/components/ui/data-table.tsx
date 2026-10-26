'use client';

import React, { useState, useMemo } from 'react';
import { Skeleton } from './skeleton';
import { EmptyState } from './empty-state';
import { Button } from './button';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchField?: (item: T) => string;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  className?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends object>({
  columns,
  data,
  isLoading = false,
  searchable = true,
  searchPlaceholder = 'Cari data...',
  searchField,
  pageSize = 10,
  emptyTitle = 'Belum ada data',
  emptyDescription = 'Data tidak ditemukan atau belum ada catatan baru.',
  emptyActionLabel,
  onEmptyAction,
  className = '',
  onRowClick,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter pencarian
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const query = searchTerm.toLowerCase();

    return data.filter((item) => {
      if (searchField) {
        return searchField(item).toLowerCase().includes(query);
      }
      return Object.values(item as Record<string, unknown>).some((val) =>
        String(val ?? '')
          .toLowerCase()
          .includes(query),
      );
    });
  }, [data, searchTerm, searchField]);

  // Urutan sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA = (a as Record<string, unknown>)[sortKey];
      const valB = (b as Record<string, unknown>)[sortKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredData, sortKey, sortDirection]);

  // Paginasi
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className={`w-full space-y-3.5 ${className}`}>
      {/* Search Header */}
      {searchable && (
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <svg
              className="absolute top-2.5 left-3 h-4 w-4 text-slate-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/60 py-1.5 pr-3.5 pl-9 text-xs text-white placeholder-slate-500 transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div className="text-xs text-slate-400">
            Total <span className="font-semibold text-white">{sortedData.length}</span> baris
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-4 py-3 select-none ${col.className || ''} ${
                      col.sortable ? 'cursor-pointer hover:text-white' : ''
                    } ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                    }`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'right'
                          ? 'justify-end'
                          : col.align === 'center'
                            ? 'justify-center'
                            : 'justify-start'
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-slate-500">
                          {sortKey === col.key ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                Array.from({ length: pageSize > 5 ? 5 : pageSize }).map((_, rIdx) => (
                  <tr key={`skeleton-${rIdx}`}>
                    {columns.map((col) => (
                      <td key={`skeleton-cell-${col.key}`} className="px-4 py-3">
                        <Skeleton className="h-4 w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-8">
                    <EmptyState
                      title={emptyTitle}
                      description={emptyDescription}
                      actionLabel={emptyActionLabel}
                      onAction={onEmptyAction}
                    />
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rIdx) => (
                  <tr
                    key={`row-${rIdx}`}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors hover:bg-slate-800/40 ${
                      onRowClick ? 'cursor-pointer' : ''
                    }`}
                  >
                    {columns.map((col) => {
                      const value = (row as Record<string, unknown>)[col.key];
                      const rendered = col.render
                        ? col.render(row, rIdx)
                        : (value as React.ReactNode);

                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-slate-200 ${col.className || ''} ${
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                                ? 'text-center'
                                : 'text-left'
                          }`}
                        >
                          {rendered}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        {!isLoading && sortedData.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
            <div>
              Halaman <span className="font-medium text-white">{currentPage}</span> dari{' '}
              <span className="font-medium text-white">{totalPages}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
