'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/ui/data-table';

interface AuditLogItem {
  id: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  description: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [entity, setEntity] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  // Selected for Inspect Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams({ pageSize: '100' });
    if (entity) params.append('entity', entity);
    if (action) params.append('action', action);
    if (search.trim()) params.append('search', search.trim());
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    fetch(`/api/v1/audit-logs?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json?.data) {
          setLogs(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [entity, action, search, from, to]);

  const getActionBadgeVariant = (
    act: string,
  ): 'success' | 'danger' | 'warning' | 'info' | 'default' => {
    switch (act) {
      case 'CREATE':
        return 'success';
      case 'DELETE':
        return 'danger';
      case 'UPDATE':
      case 'ADJUSTMENT':
        return 'info';
      case 'STATUS_CHANGE':
      case 'REJECT':
        return 'warning';
      case 'APPROVE':
        return 'success';
      default:
        return 'default';
    }
  };

  const columns: Column<AuditLogItem>[] = [
    {
      key: 'createdAt',
      header: 'Waktu',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-mono text-xs font-semibold text-slate-200">
            {new Date(row.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </div>
          <div className="text-[11px] text-slate-400">
            {new Date(row.createdAt).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}{' '}
            WIB
          </div>
        </div>
      ),
    },
    {
      key: 'user',
      header: 'Pengguna',
      render: (row) => (
        <div>
          <div className="text-xs font-semibold text-white">
            {row.userName || row.user?.name || 'Sistem / Anonim'}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            {row.userRole && (
              <span className="py-0.2 rounded bg-slate-800 px-1.5 text-[10px] text-slate-300">
                {row.userRole}
              </span>
            )}
            <span className="max-w-[120px] truncate text-[10px] text-slate-400">
              {row.user?.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Aksi & Entitas',
      render: (row) => (
        <div className="space-y-1">
          <Badge variant={getActionBadgeVariant(row.action)}>{row.action}</Badge>
          <div className="font-mono text-[11px] font-medium text-slate-300">{row.entity}</div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Deskripsi Aktivitas',
      render: (row) => (
        <div>
          <div className="text-xs font-medium text-slate-200">{row.description}</div>
          {row.entityId && (
            <div className="font-mono text-[10px] text-slate-500">ID: {row.entityId}</div>
          )}
        </div>
      ),
    },
    {
      key: 'diff',
      header: 'Perubahan Nilai',
      render: (row) => {
        const hasValues = row.oldValues || row.newValues;
        if (!hasValues) {
          return <span className="text-[11px] text-slate-500">-</span>;
        }

        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedLog(row)}
            className="text-[11px] text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300"
          >
            Lihat Perubahan &rarr;
          </Button>
        );
      },
    },
  ];

  // Helper to extract keys for diff view
  const diffKeys = selectedLog
    ? Array.from(
        new Set([
          ...Object.keys(selectedLog.oldValues || {}),
          ...Object.keys(selectedLog.newValues || {}),
        ]),
      )
    : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Audit Log Sistem</h1>
        <p className="text-sm text-slate-400">
          Pencatatan jejak audit tak-terhapuskan (*immutable audit trail*) untuk mutasi master data
          dan aksi operasional sensitif.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Cari deskripsi, nama petugas, atau ID entitas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Semua Entitas</option>
            <option value="PRODUCT">PRODUCT</option>
            <option value="CATEGORY">CATEGORY</option>
            <option value="SUPPLIER">SUPPLIER</option>
            <option value="CUSTOMER">CUSTOMER</option>
            <option value="STOCK_OPNAME">STOCK_OPNAME</option>
            <option value="STOCK_ADJUSTMENT">STOCK_ADJUSTMENT</option>
            <option value="STOCK_TRANSFER">STOCK_TRANSFER</option>
            <option value="USER">USER</option>
          </select>

          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Semua Aksi</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="STATUS_CHANGE">STATUS_CHANGE</option>
            <option value="APPROVE">APPROVE</option>
            <option value="REJECT">REJECT</option>
            <option value="ADJUSTMENT">ADJUSTMENT</option>
            <option value="TRANSFER">TRANSFER</option>
          </select>

          <div className="flex items-center gap-1 text-xs text-slate-300">
            <span>Tgl:</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
            <span>-</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {(entity || action || search || from || to) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEntity('');
                setAction('');
                setSearch('');
                setFrom('');
                setTo('');
              }}
              className="text-xs text-slate-400 hover:text-white"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Audit Log Data Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60">
        <DataTable
          columns={columns}
          data={logs}
          isLoading={isLoading}
          searchable={false}
          emptyTitle="Belum ada catatan audit"
          emptyDescription="Tidak ada catatan audit log yang sesuai dengan kriteria filter."
        />
      </div>

      {/* Inspect Modal Dialog for Old vs New Values */}
      <Dialog
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Rincian Selisih Perubahan (Audit Trail)"
        description={selectedLog?.description}
        maxWidth="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">
              <div>
                <span className="text-slate-400">Entitas:</span>{' '}
                <span className="font-mono font-semibold text-emerald-400">
                  {selectedLog.entity}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Aksi:</span>{' '}
                <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                  {selectedLog.action}
                </Badge>
              </div>
              <div>
                <span className="text-slate-400">Petugas:</span>{' '}
                <span className="font-semibold text-white">
                  {selectedLog.userName || selectedLog.user?.name || '-'}
                </span>{' '}
                ({selectedLog.userRole || '-'})
              </div>
              <div>
                <span className="text-slate-400">Waktu:</span>{' '}
                <span className="font-mono text-slate-200">
                  {new Date(selectedLog.createdAt).toLocaleString('id-ID', {
                    timeZone: 'Asia/Jakarta',
                  })}{' '}
                  WIB
                </span>
              </div>
            </div>

            {/* Comparison Table */}
            <div>
              <div className="mb-2 text-xs font-semibold text-slate-300">
                Perbandingan Nilai Sebelum dan Sesudah:
              </div>
              <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase">
                    <tr>
                      <th className="px-3 py-2">Atribut / Kolom</th>
                      <th className="px-3 py-2">Nilai Sebelum (Old)</th>
                      <th className="px-3 py-2">Nilai Sesudah (New)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {diffKeys.map((key) => {
                      const oldVal = selectedLog.oldValues?.[key];
                      const newVal = selectedLog.newValues?.[key];
                      const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

                      return (
                        <tr
                          key={key}
                          className={isChanged ? 'bg-amber-950/15' : 'hover:bg-slate-900/40'}
                        >
                          <td className="px-3 py-2 font-medium text-slate-300">{key}</td>
                          <td className="px-3 py-2 break-all text-rose-400/90">
                            {oldVal !== undefined ? (
                              JSON.stringify(oldVal)
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 break-all text-emerald-400">
                            {newVal !== undefined ? (
                              JSON.stringify(newVal)
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
