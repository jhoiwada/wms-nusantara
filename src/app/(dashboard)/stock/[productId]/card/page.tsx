'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MovementType } from '@/types/document';

interface StockCardData {
  product: {
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    uom: string;
    minStock: number;
    costPrice: number | string;
    trackExpiry: boolean;
    category: {
      id: string;
      name: string;
    } | null;
  };
  currentStock: number;
  movements: {
    id: string;
    movementType: MovementType;
    quantity: number;
    balanceAfter: number;
    refNo: string;
    refType: string;
    refId: string;
    notes: string | null;
    createdAt: string;
    location: {
      id: string;
      code: string;
      warehouse: {
        id: string;
        code: string;
        name: string;
      };
    };
    batch: {
      id: string;
      batchNo: string;
      expiryDate: string | null;
    };
    user: {
      id: string;
      name: string;
      email: string;
    };
  }[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface PageProps {
  params: Promise<{ productId: string }>;
}

export default function ProductStockCardPage({ params }: PageProps) {
  const { productId } = React.use(params);

  const [cardData, setCardData] = useState<StockCardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const searchParams = new URLSearchParams({ pageSize: '100' });
    if (fromDate) searchParams.append('from', fromDate);
    if (toDate) searchParams.append('to', toDate);

    fetch(`/api/v1/stock/${productId}/card?${searchParams.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.data) {
          setCardData(json.data);
        } else {
          setErrorMessage(json.message || 'Gagal memuat kartu stok');
        }
      })
      .catch(() => {
        if (isMounted) setErrorMessage('Terjadi kesalahan jaringan');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [productId, fromDate, toDate, refreshKey]);

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
  };

  const getMovementBadge = (type: MovementType) => {
    switch (type) {
      case 'IN':
        return <Badge variant="success">IN (Penerimaan)</Badge>;
      case 'OUT':
        return <Badge variant="danger">OUT (Pengiriman)</Badge>;
      case 'ADJUST_IN':
        return <Badge variant="info">ADJUST +</Badge>;
      case 'ADJUST_OUT':
        return <Badge variant="warning">ADJUST -</Badge>;
      case 'TRANSFER_IN':
        return <Badge variant="neutral">TRANSFER IN</Badge>;
      case 'TRANSFER_OUT':
        return <Badge variant="neutral">TRANSFER OUT</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  const getDocLink = (refType: string, refNo: string) => {
    if (refType === 'GOODS_RECEIPT') {
      return (
        <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
          {refNo}
        </span>
      );
    }
    if (refType === 'DELIVERY_ORDER') {
      return (
        <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {refNo}
        </span>
      );
    }
    return <span className="font-mono text-xs">{refNo}</span>;
  };

  if (isLoading && !cardData) {
    return <div className="py-12 text-center text-slate-500">Memuat kartu stok...</div>;
  }

  if (!cardData) {
    return (
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Kartu Stok Tidak Ditemukan
        </h2>
        <p className="text-sm text-slate-500">{errorMessage || 'Produk tidak ditemukan.'}</p>
        <Link href="/stock">
          <Button variant="outline" size="sm">
            Kembali ke Daftar Stok
          </Button>
        </Link>
      </div>
    );
  }

  const { product, currentStock, movements } = cardData;
  const costPriceNum = Number(product.costPrice) || 0;
  const inventoryValue = currentStock * costPriceNum;

  const totalIn = movements
    .filter(
      (m) =>
        m.movementType === 'IN' ||
        m.movementType === 'ADJUST_IN' ||
        m.movementType === 'TRANSFER_IN',
    )
    .reduce((sum, m) => sum + m.quantity, 0);

  const totalOut = movements
    .filter(
      (m) =>
        m.movementType === 'OUT' ||
        m.movementType === 'ADJUST_OUT' ||
        m.movementType === 'TRANSFER_OUT',
    )
    .reduce((sum, m) => sum + m.quantity, 0);

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center dark:border-slate-800">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Link
              href="/stock"
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              ← Kembali ke Daftar Stok
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Kartu Stok: {product.name}
            </h1>
            {product.trackExpiry && (
              <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                FEFO Aktif
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 font-mono text-xs text-slate-500">
            <span>SKU: {product.sku}</span>
            {product.barcode && <span>• Barcode: {product.barcode}</span>}
            <span>• Satuan: {product.uom}</span>
            <span>• Kategori: {product.category?.name || '-'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} className="text-xs">
            Muat Ulang
          </Button>
        </div>
      </div>

      {/* Product Highlight Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Saldo Stok Saat Ini
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
            {currentStock.toLocaleString('id-ID')} {product.uom}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Nilai Persediaan
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
            Rp {inventoryValue.toLocaleString('id-ID')}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Stok Minimum (BR-04)
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
            {product.minStock} {product.uom}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Harga Beli Satuan
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
            Rp {costPriceNum.toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* Date Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-stock-date-from"
            className="text-xs whitespace-nowrap text-slate-500"
          >
            Dari Tanggal:
          </label>
          <input
            id="filter-stock-date-from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-stock-date-to"
            className="text-xs whitespace-nowrap text-slate-500"
          >
            Sampai Tanggal:
          </label>
          <input
            id="filter-stock-date-to"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        {(fromDate || toDate) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFromDate('');
              setToDate('');
            }}
            className="h-7 text-xs"
          >
            Reset Filter
          </Button>
        )}
      </div>

      {/* Stock Card Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold tracking-wider text-slate-900 uppercase dark:text-slate-100">
            Riwayat Mutasi & Saldo Berjalan (BR-29, BR-30)
          </h2>
          <span className="font-mono text-xs text-slate-500">
            {movements.length} Mutasi Tercatat
          </span>
        </div>

        {movements.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Belum ada catatan mutasi pergerakan stok untuk produk ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap">Waktu</th>
                  <th className="px-3 py-2.5 font-medium">Jenis</th>
                  <th className="px-3 py-2.5 font-medium">No. Referensi</th>
                  <th className="px-3 py-2.5 font-medium">Lokasi / Gudang</th>
                  <th className="px-3 py-2.5 font-medium">Batch</th>
                  <th className="px-3 py-2.5 text-right font-medium text-emerald-700 dark:text-emerald-400">
                    Masuk (+)
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-rose-700 dark:text-rose-400">
                    Keluar (-)
                  </th>
                  <th className="px-3 py-2.5 text-right font-mono font-bold font-medium">
                    Saldo Berjalan
                  </th>
                  <th className="px-3 py-2.5 font-medium">Oleh</th>
                  <th className="px-3 py-2.5 font-medium">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono dark:divide-slate-800">
                {movements.map((m) => {
                  const isIncoming =
                    m.movementType === 'IN' ||
                    m.movementType === 'ADJUST_IN' ||
                    m.movementType === 'TRANSFER_IN';

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <td className="px-3 py-2.5 font-sans text-[11px] whitespace-nowrap text-slate-500">
                        {new Date(m.createdAt).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-3 py-2.5 font-sans">{getMovementBadge(m.movementType)}</td>
                      <td className="px-3 py-2.5">{getDocLink(m.refType, m.refNo)}</td>
                      <td className="px-3 py-2.5 font-sans">
                        <span className="font-mono font-semibold">{m.location.code}</span>{' '}
                        <span className="text-[10px] text-slate-400">
                          ({m.location.warehouse.code})
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span>{m.batch.batchNo}</span>
                        {m.batch.expiryDate && (
                          <div className="font-sans text-[10px] text-slate-400">
                            Exp: {new Date(m.batch.expiryDate).toLocaleDateString('id-ID')}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {isIncoming ? `+${m.quantity}` : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-rose-600 dark:text-rose-400">
                        {!isIncoming ? `-${m.quantity}` : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-900 dark:text-slate-100">
                        {m.balanceAfter}
                      </td>
                      <td className="px-3 py-2.5 font-sans text-[11px] text-slate-500">
                        {m.user.name}
                      </td>
                      <td className="px-3 py-2.5 font-sans text-[11px] text-slate-500">
                        {m.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 text-xs font-semibold dark:border-slate-800 dark:bg-slate-900">
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-right">
                    Total Periode Ini:
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                    +{totalIn}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-rose-600 dark:text-rose-400">
                    -{totalOut}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                    {currentStock}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
