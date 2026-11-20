'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/ui/data-table';

interface CategoryItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { products: number };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const reloadData = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/categories?pageSize=100')
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.data) {
          setCategories(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormCode('');
    setFormName('');
    setFormDesc('');
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setFormCode(cat.code);
    setFormName(cat.name);
    setFormDesc(cat.description || '');
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleDeactivate = (cat: CategoryItem) => {
    if (!confirm(`Nonaktifkan kategori '${cat.name}'? Produk lama tetap mempertahankan riwayat.`)) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/categories/${cat.id}`, { method: 'DELETE' });
        if (res.ok) {
          reloadData();
        }
      } catch {
        // silent
      }
    });
  };

  const handleToggleActivate = (cat: CategoryItem) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/categories/${cat.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !cat.isActive }),
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

    if (!formCode.trim() || !formName.trim()) {
      setFormError('Kode dan nama kategori wajib diisi');
      return;
    }

    startTransition(async () => {
      try {
        const url = editingCategory
          ? `/api/v1/categories/${editingCategory.id}`
          : '/api/v1/categories';
        const method = editingCategory ? 'PATCH' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: formCode.trim().toUpperCase(),
            name: formName.trim(),
            description: formDesc.trim() || null,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          setFormError(json.error?.message || 'Gagal menyimpan kategori');
          return;
        }

        setIsDialogOpen(false);
        reloadData();
      } catch {
        setFormError('Terjadi kesalahan jaringan.');
      }
    });
  };

  const columns: Column<CategoryItem>[] = [
    {
      key: 'code',
      header: 'Kode',
      sortable: true,
      render: (row) => <span className="font-mono font-semibold text-emerald-400">{row.code}</span>,
    },
    {
      key: 'name',
      header: 'Nama Kategori',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-slate-900 dark:text-white">{row.name}</span>
      ),
    },
    {
      key: 'description',
      header: 'Deskripsi',
      render: (row) => (
        <span className="block max-w-xs truncate text-slate-600 dark:text-slate-400">
          {row.description || '-'}
        </span>
      ),
    },
    {
      key: 'productsCount',
      header: 'Total Produk',
      align: 'center',
      render: (row) => (
        <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          {row._count?.products ?? 0} item
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      align: 'center',
      render: (row) => (
        <Badge variant={row.isActive ? 'success' : 'neutral'}>
          {row.isActive ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(row)} className="text-xs">
            Edit
          </Button>
          {row.isActive ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDeactivate(row)}
              className="text-xs text-rose-400 hover:text-rose-300"
            >
              Nonaktifkan
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleToggleActivate(row)}
              className="text-xs text-emerald-400 hover:text-emerald-300"
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
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/50">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Master Kategori Produk
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Klasifikasi kelompok barang distributor (Makanan, Minuman, Obat, Elektronik)
          </p>
        </div>

        <Button size="sm" onClick={handleOpenAdd}>
          + Tambah Kategori
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={categories}
        isLoading={isLoading}
        searchPlaceholder="Cari kode atau nama kategori..."
        searchField={(item) => `${item.code} ${item.name} ${item.description ?? ''}`}
        pageSize={10}
        emptyTitle="Belum ada kategori"
        emptyDescription="Tambahkan kategori baru untuk mulai mengelompokkan produk gudang."
        emptyActionLabel="+ Tambah Kategori"
        onEmptyAction={handleOpenAdd}
      />

      {/* Modal Dialog Form */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
        description="Pastikan kode unik dan mudah diidentifikasi dalam operasional gudang."
      >
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300"
            >
              {formError}
            </div>
          )}

          <Input
            label="Kode Kategori (SKU Prefix)"
            value={formCode}
            onChange={(e) => setFormCode(e.target.value.toUpperCase())}
            placeholder="FNB, MED, ELC"
            required
            helperText="Contoh: FNB untuk Makanan & Minuman (otomatis huruf kapital)"
          />

          <Input
            label="Nama Kategori"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Makanan & Minuman"
            required
          />

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Deskripsi (Opsional)
            </label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Catatan tambahan mengenai kelompok produk ini..."
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950/70 dark:text-white dark:placeholder-slate-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" size="sm" isLoading={isPending}>
              {editingCategory ? 'Simpan Perubahan' : 'Buat Kategori'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
