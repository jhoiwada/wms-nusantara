'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { GoodsReceiptStatus } from '@/types/document';

interface GoodsReceiptDetail {
  id: string;
  receiptNo: string;
  status: GoodsReceiptStatus;
  receivedAt: string | null;
  notes: string | null;
  createdAt: string;
  supplier: {
    id: string;
    code: string;
    name: string;
    contactName: string | null;
    phone: string | null;
  };
  warehouse: {
    id: string;
    code: string;
    name: string;
    address: string | null;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  items: {
    id: string;
    quantity: number;
    unitPrice: string | number;
    batchNo: string;
    expiryDate: string | null;
    product: {
      id: string;
      sku: string;
      name: string;
      uom: string;
      trackExpiry: boolean;
      costPrice: string | number;
    };
    location: {
      id: string;
      code: string;
      zone: string;
      rack: string;
      level: string;
    };
  }[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function GoodsReceiptDetailPage({ params }: PageProps) {
  const { id } = React.use(params);
  const router = useRouter();

  const [gr, setGr] = useState<GoodsReceiptDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const loadDocument = useCallback(() => {
    let isMounted = true;
    fetch(`/api/v1/goods-receipts/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.data) {
          setGr(json.data);
        } else {
          setErrorMessage(json.error?.message || 'Dokumen tidak ditemukan');
        }
      })
      .catch(() => {
        if (isMounted) setErrorMessage('Gagal memuat dokumen');
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

  const handleReceive = () => {
    if (
      !confirm(
        `Konfirmasi terima barang untuk dokumen '${gr?.receiptNo}'?\n\nStok fisik di gudang akan langsung bertambah dan mutasi stok dicatat resmi. Tindakan ini bersifat final dan tidak dapat dibatalkan.`,
      )
    ) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/goods-receipts/${id}/receive`, {
          method: 'POST',
        });
        const json = await res.json();

        if (!res.ok) {
          setErrorMessage(json.error?.message || 'Gagal menerima barang');
          return;
        }

        setSuccessMessage('Barang berhasil diterima! Stok gudang telah resmi diperbarui.');
        loadDocument();
      } catch {
        setErrorMessage('Terjadi kesalahan jaringan saat menerima barang');
      }
    });
  };

  const handleCancel = () => {
    if (
      !confirm(
        `Apakah Anda yakin ingin membatalkan dokumen penerimaan '${gr?.receiptNo}'?\n\nDokumen yang dibatalkan tidak dapat diproses lagi, dan nomor dokumen ini tidak akan dipakai ulang.`,
      )
    ) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/goods-receipts/${id}/cancel`, {
          method: 'POST',
        });
        const json = await res.json();

        if (!res.ok) {
          setErrorMessage(json.error?.message || 'Gagal membatalkan dokumen');
          return;
        }

        setSuccessMessage('Dokumen penerimaan berhasil dibatalkan.');
        loadDocument();
      } catch {
        setErrorMessage('Terjadi kesalahan jaringan saat membatalkan dokumen');
      }
    });
  };

  const formatRupiah = (val: string | number) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-xs text-slate-500">
        Memuat rincian dokumen penerimaan...
      </div>
    );
  }

  if (!gr) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-16 text-center">
        <h2 className="text-lg font-bold text-slate-900">Dokumen Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500">{errorMessage || 'ID dokumen tidak valid.'}</p>
        <Button onClick={() => router.push('/goods-receipts')}>Kembali ke Daftar</Button>
      </div>
    );
  }

  const totalQuantity = gr.items.reduce((s, it) => s + it.quantity, 0);
  const totalValue = gr.items.reduce((s, it) => s + it.quantity * (Number(it.unitPrice) || 0), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/goods-receipts" className="transition-colors hover:text-indigo-600">
            Penerimaan Barang
          </Link>
          <span>/</span>
          <span className="font-mono font-semibold text-slate-800">{gr.receiptNo}</span>
        </div>

        <Link href="/goods-receipts">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Kembali ke Daftar
          </Button>
        </Link>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
          <svg
            className="h-5 w-5 shrink-0 text-rose-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          <svg
            className="h-5 w-5 shrink-0 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Header Document Card */}
      <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {gr.receiptNo}
              </h1>
              {gr.status === 'DRAFT' && <Badge variant="warning">DRAFT</Badge>}
              {gr.status === 'RECEIVED' && <Badge variant="success">RECEIVED (DITERIMA)</Badge>}
              {gr.status === 'CANCELLED' && <Badge variant="neutral">CANCELLED (BATAL)</Badge>}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Dibuat oleh{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {gr.createdBy.name}
              </span>{' '}
              pada{' '}
              {new Date(gr.createdAt).toLocaleString('id-ID', {
                dateStyle: 'full',
                timeStyle: 'short',
              })}
            </p>
          </div>

          {/* Action Buttons for DRAFT */}
          {gr.status === 'DRAFT' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
                className="border-rose-200 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-800/80 dark:text-rose-400 dark:hover:bg-rose-950/40"
              >
                Batalkan Dokumen
              </Button>
              <Button
                onClick={handleReceive}
                isLoading={isPending}
                className="gap-2 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Terima Barang (Posting Stok)
              </Button>
            </div>
          )}
        </div>

        {/* Informational Banner */}
        {gr.status === 'RECEIVED' && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <svg
              className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              Dokumen ini telah resmi diterima pada{' '}
              <strong>
                {gr.receivedAt
                  ? new Date(gr.receivedAt).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : '-'}
              </strong>
              . Stok fisik telah dialokasikan ke rak gudang dan dokumen ini bersifat final.
            </span>
          </div>
        )}

        {/* Two Columns Details */}
        <div className="grid grid-cols-1 gap-6 text-xs md:grid-cols-3">
          {/* Supplier Info */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mb-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Pemasok / Supplier
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {gr.supplier.name}
            </div>
            <div className="mt-0.5 font-mono text-slate-500 dark:text-slate-400">
              Kode: {gr.supplier.code}
            </div>
            {gr.supplier.contactName && (
              <div className="mt-1 text-slate-600 dark:text-slate-300">
                Kontak: {gr.supplier.contactName}
              </div>
            )}
            {gr.supplier.phone && (
              <div className="text-slate-600 dark:text-slate-300">Telp: {gr.supplier.phone}</div>
            )}
          </div>

          {/* Warehouse Info */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mb-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Gudang Tujuan Masuk
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {gr.warehouse.name}
            </div>
            <div className="mt-0.5 font-mono text-slate-500 dark:text-slate-400">
              Kode: {gr.warehouse.code}
            </div>
            {gr.warehouse.address && (
              <div className="mt-1 text-slate-600 dark:text-slate-300">{gr.warehouse.address}</div>
            )}
          </div>

          {/* Delivery & Notes Info */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mb-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Waktu Penerimaan & Catatan
            </div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              Kedatangan:{' '}
              {gr.receivedAt
                ? new Date(gr.receivedAt).toLocaleDateString('id-ID')
                : 'Sesuai Jadwal'}
            </div>
            <div className="mt-1 text-slate-600 dark:text-slate-300">
              Catatan:{' '}
              {gr.notes || <span className="text-slate-400 italic">Tidak ada catatan</span>}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Rincian Item Barang Diterima ({gr.items.length} Baris)
          </h3>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                  <th className="w-12 px-3 py-2.5 text-center">#</th>
                  <th className="px-3 py-2.5">Produk & SKU</th>
                  <th className="px-3 py-2.5">Lokasi Rak</th>
                  <th className="px-3 py-2.5">Batch & Kedaluwarsa</th>
                  <th className="px-3 py-2.5 text-right">Kuantitas</th>
                  <th className="px-3 py-2.5 text-right">Harga Satuan</th>
                  <th className="px-3 py-2.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {gr.items.map((item, idx) => {
                  const subtotal = item.quantity * (Number(item.unitPrice) || 0);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {item.product.name}
                        </div>
                        <span className="py-0.2 rounded bg-slate-100 px-1.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {item.product.sku}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono font-bold text-indigo-900 dark:border-indigo-800/70 dark:bg-indigo-950/60 dark:text-indigo-300">
                          {item.location.code}
                        </span>
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          Zona {item.location.zone} • Rak {item.location.rack} • Level{' '}
                          {item.location.level}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {item.product.trackExpiry ? (
                          <div>
                            <span className="py-0.2 rounded border border-amber-200 bg-amber-50 px-1.5 font-mono font-semibold text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-300">
                              Batch: {item.batchNo}
                            </span>
                            <div className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                              Exp:{' '}
                              {item.expiryDate
                                ? new Date(item.expiryDate).toLocaleDateString('id-ID', {
                                    dateStyle: 'medium',
                                  })
                                : '-'}
                            </div>
                          </div>
                        ) : (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Tanpa Kedaluwarsa
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-900 dark:text-white">
                        {item.quantity.toLocaleString('id-ID')}{' '}
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {item.product.uom}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatRupiah(item.unitPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatRupiah(subtotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                <tr>
                  <td colSpan={4} className="px-3 py-2.5 text-right">
                    Total Keseluruhan:
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400">
                    {totalQuantity.toLocaleString('id-ID')} Item
                  </td>
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5 text-right font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {formatRupiah(totalValue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
