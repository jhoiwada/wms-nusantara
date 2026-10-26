'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DeliveryOrderStatus } from '@/types/document';

interface DeliveryOrderDetail {
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
    contactName: string | null;
    phone: string | null;
    address: string | null;
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
    batchId: string | null;
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
    batch: {
      id: string;
      batchNo: string;
      expiryDate: string | null;
    } | null;
  }[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DeliveryOrderDetailPage({ params }: PageProps) {
  const { id } = React.use(params);
  const router = useRouter();

  const [doOrder, setDoOrder] = useState<DeliveryOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const loadDocument = useCallback(() => {
    let isMounted = true;
    fetch(`/api/v1/delivery-orders/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.data) {
          setDoOrder(json.data);
        } else {
          setErrorMessage(json.message || 'Dokumen tidak ditemukan');
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

  const handleShip = () => {
    if (
      !confirm(
        `Konfirmasi kirim barang untuk dokumen '${doOrder?.orderNo}'?\n\nSistem akan mengunci stok (SELECT ... FOR UPDATE) dan memeriksa kecukupan stok secara atomik. Jika ada item yang kurang, seluruh pengiriman akan ditolak (BR-17).\n\nLanjutkan pengiriman?`,
      )
    ) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/delivery-orders/${id}/ship`, {
          method: 'POST',
        });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(
            json.message || 'Gagal mengirim barang. Periksa ketersediaan stok di lokasi.',
          );
        }

        setSuccessMessage('Barang berhasil dikirim dan stok telah dikurangi secara atomik.');
        loadDocument();
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
        setErrorMessage(msg);
      }
    });
  };

  const handleCancel = () => {
    if (
      !confirm(
        `Yakin ingin membatalkan dokumen '${doOrder?.orderNo}'?\n\nNomor dokumen tetap dipertahankan dalam arsip (BR-15). Tindakan ini tidak dapat dibatalkan.`,
      )
    ) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/delivery-orders/${id}/cancel`, {
          method: 'POST',
        });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.message || 'Gagal membatalkan dokumen.');
        }

        setSuccessMessage('Dokumen pengiriman berhasil dibatalkan.');
        loadDocument();
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
        setErrorMessage(msg);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-slate-500 dark:text-slate-400">
        Memuat data dokumen...
      </div>
    );
  }

  if (!doOrder) {
    return (
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Dokumen Tidak Ditemukan
        </h2>
        <p className="text-sm text-slate-500">
          {errorMessage || 'Dokumen pengiriman dengan ID tersebut tidak ada di sistem.'}
        </p>
        <Link href="/delivery-orders">
          <Button variant="outline" size="sm">
            Kembali ke Daftar DO
          </Button>
        </Link>
      </div>
    );
  }

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

  const totalQuantity = doOrder.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center dark:border-slate-800">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Link
              href="/delivery-orders"
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              ← Kembali ke Daftar DO
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {doOrder.orderNo}
            </h1>
            {getStatusBadge(doOrder.status)}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Dibuat pada {new Date(doOrder.createdAt).toLocaleString('id-ID')} oleh{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {doOrder.createdBy.name}
            </span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {doOrder.status === 'DRAFT' && (
            <>
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancel}
                disabled={isPending}
                className="text-xs"
              >
                Batalkan Dokumen
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleShip}
                disabled={isPending}
                className="bg-emerald-600 text-xs text-white hover:bg-emerald-700"
              >
                {isPending ? 'Memproses...' : '✓ Kirim Barang (Ship)'}
              </Button>
            </>
          )}

          {doOrder.status === 'SHIPPED' && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
              ✓ Pengiriman Selesai (Dokumen Final)
            </div>
          )}

          {doOrder.status === 'CANCELLED' && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
              ✕ Dokumen Dibatalkan (Nomor Tersimpan)
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="mb-1 flex items-center gap-2 font-bold">
            <span>⚠</span>
            <span>Pengiriman Ditolak / Terjadi Kesalahan:</span>
          </div>
          <p>{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <div className="mb-1 font-bold">Berhasil:</div>
          <p>{successMessage}</p>
        </div>
      )}

      {/* Status Explanatory Alerts */}
      {doOrder.status === 'DRAFT' && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
          <span className="text-base leading-none">ℹ</span>
          <div>
            <div className="font-semibold">Status Dokumen: DRAFT (Belum Memotong Stok)</div>
            <div className="mt-0.5 leading-relaxed text-amber-800/90 dark:text-amber-300/90">
              Dokumen draft belum mencadangkan atau memotong stok sistem (BR-19). Saat tombol{' '}
              <strong>&ldquo;Kirim Barang&rdquo;</strong> ditekan, sistem akan mengunci baris stok,
              mengalokasikan batch secara otomatis berdasarkan prinsip FEFO jika belum dipilih
              (BR-08), serta memverifikasi kecukupan stok secara atomik. Jika ada stok yang kurang,
              seluruh dokumen akan ditolak (BR-17).
            </div>
          </div>
        </div>
      )}

      {doOrder.status === 'SHIPPED' && (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200">
          <span className="text-base leading-none">✓</span>
          <div>
            <div className="font-semibold">
              Status Dokumen: SHIPPED pada{' '}
              {doOrder.shippedAt ? new Date(doOrder.shippedAt).toLocaleString('id-ID') : '-'}
            </div>
            <div className="mt-0.5 leading-relaxed text-emerald-800/90 dark:text-emerald-300/90">
              Barang telah berhasil keluar dari gudang dan saldo stok telah berkurang. Riwayat
              pergerakan dicatat permanen pada kartu stok (BR-29, BR-30). Dokumen yang sudah SHIPPED
              tidak dapat dibatalkan atau diedit (BR-18).
            </div>
          </div>
        </div>
      )}

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Customer Card */}
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Customer Penerima
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
              {doOrder.customer.name}
            </div>
            <div className="font-mono text-xs text-slate-500">{doOrder.customer.code}</div>
          </div>
          {doOrder.customer.address && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {doOrder.customer.address}
            </div>
          )}
          {doOrder.customer.phone && (
            <div className="text-xs text-slate-500">
              Telp: {doOrder.customer.phone} (PIC: {doOrder.customer.contactName || '-'})
            </div>
          )}
        </div>

        {/* Warehouse Card */}
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Gudang Asal Barang
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
              {doOrder.warehouse.name}
            </div>
            <div className="font-mono text-xs text-slate-500">{doOrder.warehouse.code}</div>
          </div>
          {doOrder.warehouse.address && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {doOrder.warehouse.address}
            </div>
          )}
          {doOrder.notes && (
            <div className="border-t border-slate-100 pt-1 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">Catatan:</span>{' '}
              {doOrder.notes}
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold tracking-wider text-slate-900 uppercase dark:text-slate-100">
            Daftar Barang Keluar ({doOrder.items.length} Item)
          </h2>
          <span className="font-mono text-xs text-slate-500">
            Total Unit: {totalQuantity.toLocaleString('id-ID')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <tr>
                <th className="w-12 px-3 py-2.5 text-center font-medium">#</th>
                <th className="px-3 py-2.5 font-medium">Produk</th>
                <th className="px-3 py-2.5 font-medium">Lokasi Rak Asal</th>
                <th className="px-3 py-2.5 font-medium">Batch & Kedaluwarsa</th>
                <th className="w-28 px-3 py-2.5 text-right font-medium">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {doOrder.items.map((item, index) => {
                const expDateStr = item.batch?.expiryDate
                  ? new Date(item.batch.expiryDate).toLocaleDateString('id-ID')
                  : null;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <td className="px-3 py-3 text-center font-mono text-slate-400">{index + 1}</td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.product.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-mono">{item.product.sku}</span>
                        <span>•</span>
                        <span>Satuan: {item.product.uom}</span>
                        {item.product.trackExpiry && (
                          <span className="py-0.2 rounded border border-emerald-200 bg-emerald-50 px-1.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                            FEFO
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {item.location.code}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Zona {item.location.zone}, Rak {item.location.rack}, Tingkat{' '}
                        {item.location.level}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {item.batch ? (
                        <div>
                          <div className="font-mono font-medium text-slate-800 dark:text-slate-200">
                            {item.batch.batchNo}
                          </div>
                          {expDateStr ? (
                            <div className="text-[11px] text-slate-500">Exp: {expDateStr}</div>
                          ) : (
                            <div className="text-[11px] text-slate-400">Tanpa Kedaluwarsa</div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                            ⚡ Otomatis (FEFO)
                          </span>
                          <span className="text-[11px] text-slate-400">
                            (Dialokasikan saat kirim)
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.quantity.toLocaleString('id-ID')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <tr>
                <td colSpan={4} className="px-3 py-3 text-right text-xs">
                  Total Jumlah Unit:
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm text-slate-900 dark:text-slate-100">
                  {totalQuantity.toLocaleString('id-ID')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
