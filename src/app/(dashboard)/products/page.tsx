'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { BarcodeLabelPrinter } from '@/components/features/barcode-label-printer';

interface CategoryOption {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

interface ProductItem {
  id: string;
  categoryId: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  uom: string;
  minStock: number;
  costPrice: number | string;
  trackExpiry: boolean;
  isActive: boolean;
  createdAt: string;
  category: {
    id: string;
    code: string;
    name: string;
  };
  _count?: {
    stocks: number;
    movements: number;
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [printingProduct, setPrintingProduct] = useState<ProductItem | null>(null);

  // Form states
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formUom, setFormUom] = useState('PCS');
  const [formMinStock, setFormMinStock] = useState('0');
  const [formCostPrice, setFormCostPrice] = useState('0');
  const [formTrackExpiry, setFormTrackExpiry] = useState(false);
  const [formDesc, setFormDesc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const reloadData = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Fetch active categories for dropdown
  useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/categories?activeOnly=true&pageSize=100')
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.data) {
          setCategories(json.data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch products
  useEffect(() => {
    let isMounted = true;
    const url =
      selectedCategory === 'ALL'
        ? '/api/v1/products?pageSize=100'
        : `/api/v1/products?pageSize=100&categoryId=${encodeURIComponent(selectedCategory)}`;

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.data) {
          setProducts(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey, selectedCategory]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormSku('');
    setFormBarcode('');
    setFormName('');
    setFormCategoryId(categories[0]?.id || '');
    setFormUom('PCS');
    setFormMinStock('0');
    setFormCostPrice('0');
    setFormTrackExpiry(false);
    setFormDesc('');
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (prod: ProductItem) => {
    setEditingProduct(prod);
    setFormSku(prod.sku);
    setFormBarcode(prod.barcode || '');
    setFormName(prod.name);
    setFormCategoryId(prod.categoryId);
    setFormUom(prod.uom);
    setFormMinStock(String(prod.minStock));
    setFormCostPrice(String(prod.costPrice));
    setFormTrackExpiry(prod.trackExpiry);
    setFormDesc(prod.description || '');
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleDeactivate = (prod: ProductItem) => {
    if (
      !confirm(
        `Nonaktifkan produk '${prod.name}'? Produk lama tetap mempertahankan riwayat mutasi.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/products/${prod.id}`, { method: 'DELETE' });
        if (res.ok) {
          reloadData();
        }
      } catch {
        // silent
      }
    });
  };

  const handleToggleActivate = (prod: ProductItem) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/products/${prod.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !prod.isActive }),
        });
        if (res.ok) {
          reloadData();
        }
      } catch {
        // silent
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      sku: formSku.trim().toUpperCase(),
      barcode: formBarcode.trim() || null,
      name: formName.trim(),
      categoryId: formCategoryId,
      uom: formUom.trim().toUpperCase() || 'PCS',
      minStock: Number(formMinStock) || 0,
      costPrice: Number(formCostPrice) || 0,
      trackExpiry: formTrackExpiry,
      description: formDesc.trim() || null,
    };

    startTransition(async () => {
      try {
        const url = editingProduct ? `/api/v1/products/${editingProduct.id}` : '/api/v1/products';
        const method = editingProduct ? 'PATCH' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();

        if (!res.ok) {
          setFormError(json.error?.message || 'Gagal menyimpan produk');
          return;
        }

        setIsDialogOpen(false);
        reloadData();
      } catch {
        setFormError('Terjadi kesalahan jaringan');
      }
    });
  };

  const formatRupiah = (val: number | string) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const columns: Column<ProductItem>[] = [
    {
      key: 'sku',
      header: 'SKU / Barcode',
      sortable: true,
      render: (item: ProductItem) => (
        <div>
          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-900">
            {item.sku}
          </span>
          {item.barcode ? (
            <div className="mt-1 font-mono text-[11px] text-slate-500">BC: {item.barcode}</div>
          ) : (
            <div className="mt-1 text-[11px] text-slate-400 italic">-</div>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Nama Produk & Kategori',
      sortable: true,
      render: (item: ProductItem) => (
        <div>
          <div className="font-medium text-slate-900">{item.name}</div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="rounded border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-600">
              {item.category.name}
            </span>
            {item.description ? (
              <span className="max-w-xs truncate text-xs text-slate-500">{item.description}</span>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: 'uom',
      header: 'Satuan',
      sortable: true,
      render: (item: ProductItem) => (
        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {item.uom}
        </span>
      ),
    },
    {
      key: 'minStock',
      header: 'Min Stok',
      sortable: true,
      render: (item: ProductItem) => (
        <span className="text-xs font-medium text-slate-800">
          {item.minStock.toLocaleString('id-ID')} {item.uom}
        </span>
      ),
    },
    {
      key: 'costPrice',
      header: 'Harga Beli',
      sortable: true,
      render: (item: ProductItem) => (
        <span className="font-mono text-xs font-semibold text-emerald-700">
          {formatRupiah(item.costPrice)}
        </span>
      ),
    },
    {
      key: 'trackExpiry',
      header: 'Kedaluwarsa (BR-06)',
      render: (item: ProductItem) =>
        item.trackExpiry ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
            FEFO Expired
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
            DEFAULT
          </span>
        ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (item: ProductItem) => (
        <Badge variant={item.isActive ? 'success' : 'neutral'}>
          {item.isActive ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (item: ProductItem) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPrintingProduct(item)}
            className="h-7 px-2 text-xs text-indigo-600 hover:bg-indigo-50"
            title="Cetak Label Barcode"
          >
            Label
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleOpenEdit(item)}
            className="h-7 px-2 text-xs"
          >
            Edit
          </Button>
          {item.isActive ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDeactivate(item)}
              disabled={isPending}
              className="h-7 border-rose-200 px-2 text-xs text-rose-600 hover:bg-rose-50"
            >
              Nonaktifkan
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleToggleActivate(item)}
              disabled={isPending}
              className="h-7 border-emerald-200 px-2 text-xs text-emerald-600 hover:bg-emerald-50"
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
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Master Produk</h1>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
              {products.length} SKU
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Katalog barang, SKU/barcode unik, ambang minimum stok, dan konfigurasi pelacakan batch
            kedaluwarsa (FEFO).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="ALL">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.code})
              </option>
            ))}
          </select>
          <Link href="/barcode-labels">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              Cetak Label
            </Button>
          </Link>
          <Button onClick={handleOpenAdd} className="gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Tambah Produk
          </Button>
        </div>
      </div>

      {/* Product List Table */}
      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
        searchPlaceholder="Cari SKU, barcode, atau nama produk..."
        searchField={(item) =>
          `${item.sku} ${item.barcode ?? ''} ${item.name} ${item.category?.name ?? ''}`
        }
        pageSize={15}
        emptyTitle="Belum ada produk"
        emptyDescription="Tambahkan produk pertama untuk mulai mengelola persediaan gudang."
      />

      {/* Add / Edit Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingProduct ? 'Edit Data Produk' : 'Tambah Produk Baru'}
        description="Pastikan SKU dan barcode unik. Produk dengan kedaluwarsa akan mewajibkan batch di setiap penerimaan (BR-06)."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
              {formError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                SKU Produk <span className="text-rose-500">*</span>
              </label>
              <Input
                value={formSku}
                onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                placeholder="mis. FNB-IND-001"
                required
                className="font-mono text-sm uppercase"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Kode unik barang (disimpan uppercase, BR-31).
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Barcode / EAN (Opsional)
              </label>
              <Input
                value={formBarcode}
                onChange={(e) => setFormBarcode(e.target.value)}
                placeholder="mis. 8998866200112"
                className="font-mono text-sm"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Nomor barcode unik untuk pemindaian scanner.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Nama Produk <span className="text-rose-500">*</span>
              </label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="mis. Indomie Mi Goreng Spesial 85g"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Kategori <span className="text-rose-500">*</span>
              </label>
              <select
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                required
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {categories.length === 0 ? (
                  <option value="">Tidak ada kategori aktif</option>
                ) : (
                  categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Satuan (UOM) <span className="text-rose-500">*</span>
              </label>
              <Input
                value={formUom}
                onChange={(e) => setFormUom(e.target.value.toUpperCase())}
                placeholder="mis. PCS / DUS / KG"
                required
                className="uppercase"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Min Stok (Ambang Menipis)
              </label>
              <Input
                type="number"
                min="0"
                value={formMinStock}
                onChange={(e) => setFormMinStock(e.target.value)}
                placeholder="0"
                required
              />
              <p className="mt-1 text-[11px] text-slate-500">BR-04 dihitung agregat.</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Harga Beli (Cost Price)
              </label>
              <Input
                type="number"
                min="0"
                value={formCostPrice}
                onChange={(e) => setFormCostPrice(e.target.value)}
                placeholder="0"
                required
              />
              <p className="mt-1 text-[11px] text-slate-500">BR-05 valuasi persediaan.</p>
            </div>
          </div>

          {/* Track Expiry Toggle */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={formTrackExpiry}
                onChange={(e) => setFormTrackExpiry(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900">
                  Lacak Kedaluwarsa & Batch (FEFO - BR-06)
                </span>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  Jika diaktifkan, setiap penerimaan barang masuk (GR) wajib mengisi nomor batch dan
                  tanggal kedaluwarsa. Pengiriman keluar (DO) otomatis memprioritaskan batch yang
                  paling dekat expired.
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Deskripsi (Opsional)
            </label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Catatan spesifikasi produk..."
              rows={2}
              className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Batal
            </Button>
            <Button type="submit" isLoading={isPending}>
              {editingProduct ? 'Simpan Perubahan' : 'Buat Produk'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Barcode Label Dialog */}
      <Dialog
        isOpen={!!printingProduct}
        onClose={() => setPrintingProduct(null)}
        title={printingProduct ? `Cetak Label: ${printingProduct.name}` : ''}
      >
        {printingProduct && (
          <div className="pt-2">
            <BarcodeLabelPrinter
              isModal={true}
              onClose={() => setPrintingProduct(null)}
              initialItems={[
                {
                  id: `prod-${printingProduct.id}`,
                  type: 'PRODUCT',
                  title: printingProduct.name,
                  subtitle: `Kategori: ${printingProduct.category.name}`,
                  barcodeValue: printingProduct.barcode || printingProduct.sku,
                  displayCode: printingProduct.barcode
                    ? `${printingProduct.sku} | ${printingProduct.barcode}`
                    : printingProduct.sku,
                  secondaryInfo: `Rp ${Number(printingProduct.costPrice).toLocaleString('id-ID')} / ${printingProduct.uom}`,
                  badgeText: printingProduct.trackExpiry ? 'FEFO' : undefined,
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
