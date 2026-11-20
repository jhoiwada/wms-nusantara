'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { StockOpnameStatus } from '@/types/document';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'VIEWER';
}

interface StockOpnameItemDetail {
  id: string;
  systemQty: number;
  physicalQty: number | null;
  difference: number | null;
  notes: string | null;
  product: {
    id: string;
    sku: string;
    name: string;
    uom: string;
    minStock: number;
    trackExpiry: boolean;
  };
  location: {
    id: string;
    code: string;
    zone: string;
    rack: string;
    level: string;
    isFrozen: boolean;
  };
  batch: {
    id: string;
    batchNo: string;
    expiryDate: string | null;
  };
}

interface StockOpnameDetail {
  id: string;
  opnameNo: string;
  warehouseId: string;
  createdById: string;
  status: StockOpnameStatus;
  notes: string | null;
  displayNotes: string | null;
  rejectionReason: string | null;
  scopeLocationIds: string[];
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  approvedBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  items: StockOpnameItemDetail[];
  summary: {
    totalItems: number;
    countedItems: number;
    isFullyCounted: boolean;
    itemsWithDiscrepancy: number;
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function StockOpnameDetailPage({ params }: PageProps) {
  const { id } = React.use(params);
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [opname, setOpname] = useState<StockOpnameDetail | null>(null);
  const [counts, setCounts] = useState<Record<string, { physicalQty: string; notes: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const [, startTransition] = useTransition();

  // Load current user
  useEffect(() => {
    fetch('/api/v1/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.user) {
          setCurrentUser(json.data.user);
        }
      })
      .catch(() => {});
  }, []);

  // Load opname document
  const loadDocument = useCallback(() => {
    let isMounted = true;
    fetch(`/api/v1/stock-opnames/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.data) {
          setOpname(json.data);
          // Initialize count inputs
          const initialCounts: Record<string, { physicalQty: string; notes: string }> = {};
          for (const item of json.data.items as StockOpnameItemDetail[]) {
            initialCounts[item.id] = {
              physicalQty: item.physicalQty !== null ? String(item.physicalQty) : '',
              notes: item.notes || '',
            };
          }
          setCounts(initialCounts);
        } else {
          setErrorMessage(json.error?.message || 'Dokumen tidak ditemukan');
        }
      })
      .catch((err) => {
        if (isMounted) setErrorMessage(err instanceof Error ? err.message : 'Gagal memuat dokumen');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const handleCountChange = (itemId: string, field: 'physicalQty' | 'notes', value: string) => {
    setCounts((prev) => {
      const existing = prev[itemId] ?? { physicalQty: '', notes: '' };
      return {
        ...prev,
        [itemId]: {
          physicalQty: field === 'physicalQty' ? value : existing.physicalQty,
          notes: field === 'notes' ? value : existing.notes,
        },
      };
    });
  };

  // Save draft counts
  const handleSaveDraft = async () => {
    if (!opname) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const itemsToUpdate = opname.items
      .filter((item) => Boolean(counts[item.id]?.physicalQty.trim()))
      .map((item) => {
        const entry = counts[item.id] ?? { physicalQty: '0', notes: '' };
        return {
          id: item.id,
          physicalQty: Number(entry.physicalQty),
          notes: entry.notes.trim() || null,
        };
      });

    if (itemsToUpdate.length === 0) {
      setErrorMessage('Isi hitung fisik pada setidaknya satu item sebelum menyimpan');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/v1/stock-opnames/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToUpdate }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Gagal menyimpan hitung fisik');
      }

      setSuccessMessage('Hitung fisik draft berhasil disimpan.');
      startTransition(() => {
        loadDocument();
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menyimpan draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit counts for approval
  const handleSubmitForReview = async () => {
    if (!opname) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // First, ensure latest inputs are saved
      const itemsToUpdate = opname.items.map((item) => {
        const val = counts[item.id]?.physicalQty?.trim();
        if (val === '' || val === undefined) {
          throw new Error(
            `Item '${item.product.name}' pada rak '${item.location.code}' belum dihitung fisiknya.`,
          );
        }
        return {
          id: item.id,
          physicalQty: Number(val),
          notes: counts[item.id]?.notes?.trim() || null,
        };
      });

      // Save counts
      const patchRes = await fetch(`/api/v1/stock-opnames/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToUpdate }),
      });
      const patchJson = await patchRes.json();
      if (!patchRes.ok) {
        throw new Error(
          patchJson.error?.message || 'Gagal memperbarui hitung fisik sebelum submit',
        );
      }

      // Submit
      const submitRes = await fetch(`/api/v1/stock-opnames/${id}/submit`, {
        method: 'POST',
      });
      const submitJson = await submitRes.json();
      if (!submitRes.ok) {
        throw new Error(
          submitJson.error?.message || submitJson.message || 'Gagal mengajukan stock opname',
        );
      }

      setSuccessMessage(
        'Stock opname berhasil diajukan (SUBMITTED). Menunggu persetujuan Manager/Admin.',
      );
      startTransition(() => {
        loadDocument();
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengajukan opname');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approve opname
  const handleApprove = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/v1/stock-opnames/${id}/approve`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Gagal menyetujui stock opname');
      }

      setShowApproveModal(false);
      setSuccessMessage(
        'Stock opname DISETUJUI! Penyesuaian stok telah dicatat secara otomatis dan lokasi rak telah dibuka kembali.',
      );
      startTransition(() => {
        loadDocument();
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menyetujui opname');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reject opname
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setErrorMessage('Alasan penolakan wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/v1/stock-opnames/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Gagal menolak stock opname');
      }

      setShowRejectModal(false);
      setSuccessMessage(
        'Stock opname DITOLAK. Lokasi telah dibuka kembali tanpa ada perubahan stok.',
      );
      startTransition(() => {
        loadDocument();
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menolak opname');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel/Delete Draft
  const handleCancelDraft = async () => {
    if (
      !confirm(
        'Apakah Anda yakin ingin membatalkan dokumen draft opname ini? Lokasi yang dibekukan akan otomatis dibuka kembali.',
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/stock-opnames/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal membatalkan draft opname');
      }
      router.push('/stock-opname');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal membatalkan draft');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-slate-400">Memuat detail stock opname...</div>
      </div>
    );
  }

  if (!opname) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-300">
          {errorMessage || 'Dokumen stock opname tidak ditemukan'}
        </div>
        <Link href="/stock-opname">
          <Button variant="outline">Kembali ke Daftar</Button>
        </Link>
      </div>
    );
  }

  const isCreator = currentUser?.id === opname.createdById;
  const isManagerOrAdmin = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN';
  const canApproveOrReject = isManagerOrAdmin && !isCreator && opname.status === 'SUBMITTED';

  const getStatusBadge = (status: StockOpnameStatus) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="warning">DRAFT (PENGHITUNGAN FISIK)</Badge>;
      case 'SUBMITTED':
        return <Badge variant="info">SUBMITTED (MENUNGGU REVIEW)</Badge>;
      case 'APPROVED':
        return <Badge variant="success">APPROVED (PENYESUAIAN SELESAI)</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">REJECTED (DITOLAK)</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Link
            href="/stock-opname"
            className="transition-colors hover:text-emerald-600 dark:hover:text-white"
          >
            Stock Opname
          </Link>
          <span>/</span>
          <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
            {opname.opnameNo}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/stock-opname">
            <Button size="sm" variant="outline">
              ← Kembali
            </Button>
          </Link>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
          {successMessage}
        </div>
      )}

      {/* Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {opname.opnameNo}
              </h1>
              {getStatusBadge(opname.status)}
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Gudang:{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {opname.warehouse.name} ({opname.warehouse.code})
              </strong>
            </p>
            {opname.displayNotes && (
              <p className="mt-2 text-xs text-slate-500 italic dark:text-slate-400">
                Catatan: &ldquo;{opname.displayNotes}&rdquo;
              </p>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {opname.status === 'DRAFT' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelDraft}
                  disabled={isSubmitting}
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
                >
                  Batalkan Draft
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Draft'}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSubmitForReview}
                  disabled={isSubmitting}
                >
                  Ajukan untuk Review
                </Button>
              </>
            )}

            {opname.status === 'SUBMITTED' && (
              <>
                {canApproveOrReject ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRejectModal(true)}
                      disabled={isSubmitting}
                      className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    >
                      Tolak Opname
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setShowApproveModal(true)}
                      disabled={isSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      Setujui &amp; Rekonsiliasi Stok
                    </Button>
                  </>
                ) : isCreator ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-300">
                    Prinsip Otorisasi Ganda: Anda pembuat dokumen ini. Persetujuan harus dilakukan
                    oleh akun Manager/Admin lain.
                  </div>
                ) : !isManagerOrAdmin ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
                    Menunggu persetujuan Manager atau Admin.
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        {/* Audit Meta Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-xs sm:grid-cols-4 dark:border-slate-800/80">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Dibuat Oleh:</span>
            <div className="font-medium text-slate-900 dark:text-slate-200">
              {opname.createdBy.name}
            </div>
            <div className="text-slate-500">
              {opname.createdBy.role} · {new Date(opname.createdAt).toLocaleDateString('id-ID')}
            </div>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Status Lokasi:</span>
            <div className="font-medium text-slate-900 dark:text-slate-200">
              {opname.status === 'DRAFT' || opname.status === 'SUBMITTED' ? (
                <span className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500"></span>
                  DIBEKUKAN (FROZEN)
                </span>
              ) : (
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  DIBUKA KEMBALI
                </span>
              )}
            </div>
            <div className="text-slate-500">
              {opname.scopeLocationIds.length} lokasi rak dicakup
            </div>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Pengajuan (Submitted):</span>
            <div className="font-medium text-slate-900 dark:text-slate-200">
              {opname.submittedAt
                ? new Date(opname.submittedAt).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Belum diajukan'}
            </div>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Persetujuan / Penolakan:</span>
            <div className="font-medium text-slate-900 dark:text-slate-200">
              {opname.approvedBy ? (
                <>
                  <div>
                    {opname.approvedBy.name} ({opname.approvedBy.role})
                  </div>
                  <div className="text-slate-500">
                    {opname.approvedAt
                      ? new Date(opname.approvedAt).toLocaleDateString('id-ID')
                      : ''}
                  </div>
                </>
              ) : (
                'Belum diputuskan'
              )}
            </div>
          </div>
        </div>

        {/* Rejection notice if REJECTED */}
        {opname.status === 'REJECTED' && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300">
            <strong className="font-semibold">Alasan Penolakan:</strong>
            <p className="mt-1">
              {opname.rejectionReason || 'Tidak ada alasan penolakan tercatat.'}
            </p>
          </div>
        )}
      </div>

      {/* Snapshot Items Table */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Snapshot Stok &amp; Hitung Fisik
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Staf mengisi hitung fisik per batch di lokasi rak. Selisih dihitung otomatis.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Terhitung:{' '}
              <strong className="text-slate-900 dark:text-white">
                {opname.summary.countedItems}
              </strong>{' '}
              / {opname.summary.totalItems}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Ada Selisih:{' '}
              <strong className="text-amber-700 dark:text-amber-400">
                {opname.summary.itemsWithDiscrepancy}
              </strong>{' '}
              item
            </span>
          </div>
        </div>

        {opname.items.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Tidak ada item stok pada lokasi yang dipilih saat snapshot diambil.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold tracking-wider text-slate-600 uppercase dark:border-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-3">Lokasi</th>
                  <th className="px-3 py-3">Produk / SKU</th>
                  <th className="px-3 py-3">Batch &amp; Expired</th>
                  <th className="px-3 py-3 text-right">Stok Sistem</th>
                  <th className="px-3 py-3 text-right">Hitung Fisik</th>
                  <th className="px-3 py-3 text-right">Selisih</th>
                  <th className="px-3 py-3">Catatan Item</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal dark:divide-slate-800/60">
                {opname.items.map((item) => {
                  const currentPhysical = counts[item.id]?.physicalQty;
                  const parsedPhysical =
                    currentPhysical !== '' && currentPhysical !== undefined
                      ? Number(currentPhysical)
                      : item.physicalQty;

                  const liveDiff =
                    parsedPhysical !== null && !isNaN(parsedPhysical)
                      ? parsedPhysical - item.systemQty
                      : null;

                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/20"
                    >
                      {/* Lokasi */}
                      <td className="px-3 py-3">
                        <span className="font-mono font-medium text-slate-900 dark:text-slate-200">
                          {item.location.code}
                        </span>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Z:{item.location.zone} R:{item.location.rack} L:{item.location.level}
                        </div>
                      </td>

                      {/* Produk */}
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-200">
                          {item.product.name}
                        </div>
                        <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          SKU: {item.product.sku} · {item.product.uom}
                        </div>
                      </td>

                      {/* Batch */}
                      <td className="px-3 py-3">
                        <span className="font-mono text-xs text-slate-800 dark:text-slate-300">
                          {item.batch.batchNo}
                        </span>
                        {item.batch.expiryDate ? (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Exp: {new Date(item.batch.expiryDate).toLocaleDateString('id-ID')}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 dark:text-slate-500">
                            Tanpa Exp
                          </div>
                        )}
                      </td>

                      {/* Sistem Qty */}
                      <td className="px-3 py-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-300">
                        {item.systemQty}
                      </td>

                      {/* Hitung Fisik Input / Display */}
                      <td className="px-3 py-3 text-right">
                        {opname.status === 'DRAFT' ? (
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={counts[item.id]?.physicalQty ?? ''}
                            onChange={(e) =>
                              handleCountChange(item.id, 'physicalQty', e.target.value)
                            }
                            placeholder="0"
                            className="w-24 rounded border border-slate-300 bg-white px-2.5 py-1 text-right font-mono text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          />
                        ) : (
                          <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">
                            {item.physicalQty !== null ? item.physicalQty : '-'}
                          </span>
                        )}
                      </td>

                      {/* Selisih */}
                      <td className="px-3 py-3 text-right">
                        {liveDiff === null ? (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            Belum dihitung
                          </span>
                        ) : liveDiff > 0 ? (
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            +{liveDiff} (Lebih)
                          </span>
                        ) : liveDiff < 0 ? (
                          <span className="font-mono font-bold text-rose-700 dark:text-rose-400">
                            {liveDiff} (Kurang)
                          </span>
                        ) : (
                          <span className="font-mono text-slate-500 dark:text-slate-400">
                            0 (Sesuai)
                          </span>
                        )}
                      </td>

                      {/* Catatan Item */}
                      <td className="px-3 py-3">
                        {opname.status === 'DRAFT' ? (
                          <input
                            type="text"
                            value={counts[item.id]?.notes ?? ''}
                            onChange={(e) => handleCountChange(item.id, 'notes', e.target.value)}
                            placeholder="Catatan..."
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                          />
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {item.notes || '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Konfirmasi Persetujuan Stock Opname
            </h3>
            <div className="mt-3 space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <p>
                Anda akan menyetujui dokumen{' '}
                <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                  {opname.opnameNo}
                </strong>
                .
              </p>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-xs leading-relaxed text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-200/90">
                <strong className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Efek Penyesuaian Stok:
                </strong>
                <ul className="mt-1.5 list-inside list-disc space-y-1">
                  <li>
                    Item dengan selisih lebih (+) akan dicatat sebagai mutasi{' '}
                    <strong>ADJUST_IN</strong>.
                  </li>
                  <li>
                    Item dengan selisih kurang (-) akan dicatat sebagai mutasi{' '}
                    <strong>ADJUST_OUT</strong>.
                  </li>
                  <li>
                    Seluruh {opname.scopeLocationIds.length} lokasi rak yang dibekukan akan otomatis{' '}
                    <strong>DIBUKA KEMBALI</strong>.
                  </li>
                  <li>Saldo kartu stok akan langsung disesuaikan dengan hasil hitung fisik.</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApproveModal(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApprove}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                {isSubmitting ? 'Memproses Penyesuaian...' : 'Konfirmasi Setuju'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tolak Stock Opname</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Stok fisik tidak akan berubah, lokasi rak akan dibuka kembali, dan alasan penolakan
              wajib dicatat.
            </p>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Alasan Penolakan <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Contoh: Terjadi kesalahan penomoran batch atau perlu dihitung ulang..."
                className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:placeholder-slate-600"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectModal(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleReject}
                disabled={isSubmitting || !rejectionReason.trim()}
                className="bg-rose-600 hover:bg-rose-500"
              >
                {isSubmitting ? 'Menolak...' : 'Konfirmasi Tolak'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
