'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/ui/data-table';

interface CustomerItem {
  id: string;
  code: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { deliveryOrders: number };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const reloadData = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/customers?pageSize=100')
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.data) {
          setCustomers(json.data);
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
    setEditingCustomer(null);
    setFormCode('');
    setFormName('');
    setFormContact('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (cust: CustomerItem) => {
    setEditingCustomer(cust);
    setFormCode(cust.code);
    setFormName(cust.name);
    setFormContact(cust.contactName || '');
    setFormPhone(cust.phone || '');
    setFormEmail(cust.email || '');
    setFormAddress(cust.address || '');
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleDeactivate = (cust: CustomerItem) => {
    if (!confirm(`Nonaktifkan customer '${cust.name}'? Data pengiriman barang (DO) tetap aman.`)) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/customers/${cust.id}`, { method: 'DELETE' });
        if (res.ok) {
          reloadData();
        }
      } catch {
        // silent
      }
    });
  };

  const handleToggleActivate = (cust: CustomerItem) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/customers/${cust.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !cust.isActive }),
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
      setFormError('Kode dan nama customer wajib diisi');
      return;
    }

    startTransition(async () => {
      try {
        const url = editingCustomer
          ? `/api/v1/customers/${editingCustomer.id}`
          : '/api/v1/customers';
        const method = editingCustomer ? 'PATCH' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: formCode.trim().toUpperCase(),
            name: formName.trim(),
            contactName: formContact.trim() || null,
            phone: formPhone.trim() || null,
            email: formEmail.trim() || null,
            address: formAddress.trim() || null,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          setFormError(json.error?.message || 'Gagal menyimpan customer');
          return;
        }

        setIsDialogOpen(false);
        reloadData();
      } catch {
        setFormError('Terjadi kendala jaringan.');
      }
    });
  };

  const columns: Column<CustomerItem>[] = [
    {
      key: 'code',
      header: 'Kode',
      sortable: true,
      render: (row) => <span className="font-mono font-semibold text-emerald-400">{row.code}</span>,
    },
    {
      key: 'name',
      header: 'Nama Customer & Kontak',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-white">{row.name}</div>
          {row.contactName && (
            <div className="text-[11px] text-slate-400">PIC: {row.contactName}</div>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Kontak',
      render: (row) => (
        <div className="space-y-0.5 text-xs">
          {row.phone && <div className="font-mono text-[11px] text-slate-300">{row.phone}</div>}
          {row.email && <div className="text-[11px] text-slate-400">{row.email}</div>}
          {!row.phone && !row.email && <div className="text-slate-500">-</div>}
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Alamat Pengiriman',
      render: (row) => (
        <span className="block max-w-xs truncate text-slate-400">{row.address || '-'}</span>
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
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Master Customer (Pelanggan)
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Daftar toko, retail, dan mitra tujuan pengiriman barang keluar (DO)
          </p>
        </div>

        <Button size="sm" onClick={handleOpenAdd}>
          + Tambah Customer
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        searchPlaceholder="Cari kode, nama, PIC, atau email customer..."
        searchField={(item) =>
          `${item.code} ${item.name} ${item.contactName ?? ''} ${item.phone ?? ''} ${item.email ?? ''}`
        }
        pageSize={10}
        emptyTitle="Belum ada customer"
        emptyDescription="Daftarkan customer baru untuk mengaktifkan tujuan pengiriman barang (DO)."
        emptyActionLabel="+ Tambah Customer"
        onEmptyAction={handleOpenAdd}
      />

      {/* Modal Dialog Form */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'Tambah Customer Baru'}
        description="Data customer digunakan sebagai tujuan Delivery Order (BR-31, BR-32)."
        maxWidth="lg"
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Kode Customer"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value.toUpperCase())}
              placeholder="CUST-001"
              required
            />

            <Input
              label="Nama Perusahaan / Toko"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Toko Makmur Sejahtera"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Nama Kontak (PIC)"
              value={formContact}
              onChange={(e) => setFormContact(e.target.value)}
              placeholder="Ibu Ratna"
            />

            <Input
              label="No. Telepon"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="081298765432"
            />

            <Input
              label="Email"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="order@makmur.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              Alamat Pengiriman
            </label>
            <textarea
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              placeholder="Alamat toko atau gudang tujuan..."
              rows={2}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3.5 py-2 text-sm text-white placeholder-slate-500 transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" size="sm" isLoading={isPending}>
              {editingCustomer ? 'Simpan Perubahan' : 'Buat Customer'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
