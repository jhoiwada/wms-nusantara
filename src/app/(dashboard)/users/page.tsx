'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/ui/data-table';
import type { Role } from '@/types/auth';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    stockMovements: number;
    auditLogs: number;
  };
}

const ROLE_LABELS: Record<Role, { label: string; desc: string }> = {
  ADMIN: { label: 'Administrator', desc: 'Akses penuh ke seluruh sistem, master data & pengguna' },
  MANAGER: { label: 'Manajer Operasional', desc: 'Approval opname, penyesuaian stok & laporan' },
  STAFF: { label: 'Staf Gudang', desc: 'Operasional barang masuk (GR) & keluar (DO)' },
  VIEWER: { label: 'Viewer / Audit', desc: 'Hanya melihat stok, mutasi & kartu stok' },
};

const PROTECTED_CORE_EMAILS = [
  'admin@nldlogistics.co.id',
  'admin@demo.test',
  'manager@nldlogistics.co.id',
  'manager@demo.test',
  'staff@nldlogistics.co.id',
  'staff@demo.test',
  'auditor@nldlogistics.co.id',
  'viewer@demo.test',
];

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('STAFF');
  const [newPassword, setNewPassword] = useState('Password123!');
  const [formError, setFormError] = useState<string | null>(null);

  // Edit / Action modal states
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [resetUser, setResetUser] = useState<UserItem | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  // Load current user for self-protection
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/v1/auth/me')
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.user?.id) setCurrentUserId(json.data.user.id);
      })
      .catch(() => {});
  }, []);

  // System Restore & Cooldown states
  const [resetCooldownSeconds, setResetCooldownSeconds] = useState(0);
  const [isResettingDb, setIsResettingDb] = useState(false);
  const [showConfirmRestoreModal, setShowConfirmRestoreModal] = useState(false);

  useEffect(() => {
    fetch('/api/v1/demo/reset')
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.retryAfterSeconds) {
          setResetCooldownSeconds(json.data.retryAfterSeconds);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (resetCooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setResetCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resetCooldownSeconds]);

  const handleManualRestore = async () => {
    setIsResettingDb(true);
    setShowConfirmRestoreModal(false);
    try {
      const res = await fetch('/api/v1/demo/reset', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setFeedbackMsg({
          type: 'error',
          text: json.error?.message || 'Gagal memulihkan data operasional',
        });
        return;
      }
      setFeedbackMsg({
        type: 'success',
        text: 'Database operasional berhasil dipulihkan ke kondisi prima FMCG. Kredensial pejabat resmi terkalibrasi.',
      });
      setResetCooldownSeconds(900);
      setRefreshKey((k) => k + 1);
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Terjadi kendala jaringan saat memulihkan database' });
    } finally {
      setIsResettingDb(false);
    }
  };

  // Fetch users list
  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams({ pageSize: '100' });
    if (selectedRole !== 'ALL') params.append('role', selectedRole);
    if (selectedStatus === 'ACTIVE') params.append('isActive', 'true');
    if (selectedStatus === 'INACTIVE') params.append('isActive', 'false');

    fetch(`/api/v1/users?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.data) {
          setUsers(json.data);
          setFeedbackMsg(null);
        }
      })
      .catch(() => {
        if (isMounted) setFeedbackMsg({ type: 'error', text: 'Gagal memuat daftar pengguna' });
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey, selectedRole, selectedStatus]);

  // Client-side search filtering
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [users, searchQuery]);

  // Handle create user
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newName.trim() || newName.trim().length < 2) {
      setFormError('Nama lengkap minimal 2 karakter');
      return;
    }

    if (!newEmail.trim() || !newEmail.includes('@')) {
      setFormError('Format alamat email tidak valid');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newName.trim(),
            email: newEmail.trim().toLowerCase(),
            role: newRole,
            password: newPassword.trim() || 'Password123!',
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          setFormError(json.error?.message || json.message || 'Gagal menambahkan pengguna');
          return;
        }

        setIsCreateOpen(false);
        setNewName('');
        setNewEmail('');
        setNewRole('STAFF');
        setNewPassword('Password123!');
        setFeedbackMsg({
          type: 'success',
          text: `Pengguna '${json.data.name}' berhasil ditambahkan!`,
        });
        setRefreshKey((k) => k + 1);
      } catch {
        setFormError('Terjadi kendala jaringan saat menyimpan');
      }
    });
  };

  // Handle update role
  const handleUpdateRole = (user: UserItem, updatedRole: Role) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/users/${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: updatedRole }),
        });

        const json = await res.json();
        if (!res.ok) {
          setFeedbackMsg({ type: 'error', text: json.error?.message || 'Gagal memperbarui role' });
          return;
        }

        setEditingUser(null);
        setFeedbackMsg({
          type: 'success',
          text: `Role untuk '${user.name}' berhasil diubah ke ${updatedRole}`,
        });
        setRefreshKey((k) => k + 1);
      } catch {
        setFeedbackMsg({ type: 'error', text: 'Terjadi kendala jaringan' });
      }
    });
  };

  // Handle toggle active status
  const handleToggleStatus = (user: UserItem) => {
    const nextStatus = !user.isActive;
    const confirmMsg = nextStatus
      ? `Aktifkan kembali akun '${user.name}' (${user.email})?`
      : `Nonaktifkan akun '${user.name}' (${user.email})? Pengguna tidak akan dapat masuk ke sistem.`;

    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/users/${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: nextStatus }),
        });

        const json = await res.json();
        if (!res.ok) {
          setFeedbackMsg({
            type: 'error',
            text: json.error?.message || 'Gagal mengubah status pengguna',
          });
          return;
        }

        setFeedbackMsg({
          type: 'success',
          text: `Akun '${user.name}' berhasil ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}.`,
        });
        setRefreshKey((k) => k + 1);
      } catch {
        setFeedbackMsg({ type: 'error', text: 'Terjadi kendala jaringan' });
      }
    });
  };

  // Handle reset password
  const handleConfirmResetPassword = () => {
    if (!resetUser) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/users/${resetUser.id}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword: 'Password123!' }),
        });

        const json = await res.json();
        if (!res.ok) {
          setFeedbackMsg({
            type: 'error',
            text: json.error?.message || 'Gagal mereset kata sandi',
          });
          return;
        }

        setResetUser(null);
        setFeedbackMsg({
          type: 'success',
          text: `Kata sandi akun '${resetUser.email}' telah direset ke default: 'Password123!'`,
        });
      } catch {
        setFeedbackMsg({ type: 'error', text: 'Terjadi kendala jaringan saat mereset kata sandi' });
      }
    });
  };

  // KPI calculations
  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const managerCount = users.filter((u) => u.role === 'MANAGER').length;
  const staffCount = users.filter((u) => u.role === 'STAFF' || u.role === 'VIEWER').length;

  const columns: Column<UserItem>[] = [
    {
      key: 'name',
      header: 'Nama & Email Pengguna',
      sortable: true,
      render: (row) => {
        const isCoreAccount = PROTECTED_CORE_EMAILS.includes(row.email.toLowerCase().trim());
        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{row.name}</span>
              {isCoreAccount && (
                <span className="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 uppercase dark:text-amber-400">
                  <svg
                    className="h-2.5 w-2.5 text-amber-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Pejabat Resmi
                </span>
              )}
              {row.id === currentUserId && (
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  Anda
                </span>
              )}
            </div>
            <div className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{row.email}</div>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Peran (RBAC)',
      sortable: true,
      render: (row) => (
        <div>
          <Badge variant={row.role}>{row.role}</Badge>
          <div className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
            {ROLE_LABELS[row.role]?.desc.split(',')[0]}
          </div>
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status Akun',
      sortable: true,
      render: (row) =>
        row.isActive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Aktif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Nonaktif
          </span>
        ),
    },
    {
      key: 'activity',
      header: 'Riwayat Aktivitas',
      render: (row) => (
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          <div>{row._count?.stockMovements || 0} mutasi stok</div>
          <div className="text-[11px] text-zinc-400">{row._count?.auditLogs || 0} jejak audit</div>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Terdaftar Sejak',
      sortable: true,
      render: (row) => (
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {new Date(row.createdAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi Otorisasi',
      align: 'right',
      render: (row) => {
        const isCoreAccount = PROTECTED_CORE_EMAILS.includes(row.email.toLowerCase().trim());
        const isSelf = row.id === currentUserId;

        return (
          <div className="flex items-center justify-end gap-1.5">
            {/* Ubah Role */}
            <button
              type="button"
              disabled={isCoreAccount || isPending}
              onClick={() => setEditingUser(row)}
              title={
                isCoreAccount
                  ? 'Role pejabat resmi dilindungi di server publik'
                  : 'Ubah role pengguna'
              }
              className="rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Ubah Role
            </button>

            {/* Reset Password */}
            <button
              type="button"
              disabled={isCoreAccount || isPending}
              onClick={() => setResetUser(row)}
              title={
                isCoreAccount
                  ? 'Kata sandi akun resmi dilindungi di server publik'
                  : 'Reset kata sandi ke Password123!'
              }
              className="rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-amber-400 dark:hover:bg-amber-950/30"
            >
              Reset Sandi
            </button>

            {/* Toggle Status Aktif/Nonaktif */}
            <button
              type="button"
              disabled={isCoreAccount || isSelf || isPending}
              onClick={() => handleToggleStatus(row)}
              title={
                isCoreAccount
                  ? 'Akun resmi tidak boleh dinonaktifkan di server publik'
                  : isSelf
                    ? 'Tidak dapat menonaktifkan akun sendiri'
                    : row.isActive
                      ? 'Nonaktifkan akun'
                      : 'Aktifkan akun'
              }
              className={`rounded px-2 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                row.isActive
                  ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
              }`}
            >
              {row.isActive ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 border-b border-zinc-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Kelola Pengguna Sistem
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Pusat manajemen hak akses staf, otorisasi peran (RBAC), reset kredensial, dan proteksi
            anti-lockout.
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-xs">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Pengguna Baru
        </Button>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`flex items-center justify-between rounded-lg p-3 text-xs font-medium shadow-xs ${
            feedbackMsg.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Showcase Production Control & Data Sanitation Card */}
      <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] via-zinc-50 to-white p-4.5 shadow-xs dark:border-amber-500/20 dark:from-amber-500/[0.05] dark:via-zinc-900/60 dark:to-[#111113]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 font-bold text-zinc-950 shadow-xs">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-800 uppercase dark:text-amber-400">
                  Showcase Public Protection
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-600">•</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Sistem Data Terkelola
                </span>
              </div>
              <h2 className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Pusat Kontrol Showcase &amp; Siklus Pemulihan Data Publik
              </h2>
              <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Reset otomatis berkala aktif setiap 4 jam (via Cron). Seluruh akun pejabat resmi
                (@nldlogistics.co.id) dan fasilitas gudang inti dikunci permanen agar evaluator lain
                tidak terkunci. Jika data perlu disegarkan saat ini, Anda dapat memulihkan dataset
                awal secara instan.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={resetCooldownSeconds > 0 || isResettingDb}
              onClick={() => setShowConfirmRestoreModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 shadow-xs transition hover:bg-amber-400 focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                className={`h-3.5 w-3.5 ${isResettingDb ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {isResettingDb
                ? 'Memulihkan Basis Data...'
                : resetCooldownSeconds > 0
                  ? `Cooldown (${Math.floor(resetCooldownSeconds / 60)}m ${resetCooldownSeconds % 60}s)`
                  : 'Pulihkan Data Operasional'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
          <div className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            Total Pengguna
          </div>
          <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {totalCount}
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="text-[11px] font-semibold tracking-wider text-amber-900 uppercase dark:text-amber-400">
            Administrator
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-300">
            {adminCount}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
          <div className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            Manajer
          </div>
          <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {managerCount}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
          <div className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            Staf &amp; Viewer
          </div>
          <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {staffCount}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-[#111113]">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              aria-label="Filter role pengguna"
              className="h-8 rounded-lg border border-zinc-300 bg-white px-2.5 text-xs text-zinc-800 shadow-xs focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="ALL">Semua Peran</option>
              <option value="ADMIN">ADMIN (Administrator)</option>
              <option value="MANAGER">MANAGER (Manajer Operasional)</option>
              <option value="STAFF">STAFF (Staf Gudang)</option>
              <option value="VIEWER">VIEWER (Audit / Pengamat)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Filter status pengguna"
              className="h-8 rounded-lg border border-zinc-300 bg-white px-2.5 text-xs text-zinc-800 shadow-xs focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Hanya Aktif</option>
              <option value="INACTIVE">Hanya Nonaktif</option>
            </select>
          </div>
        </div>

        <Input
          type="text"
          placeholder="Cari nama atau email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 w-full text-xs sm:w-64"
        />
      </div>

      {/* Users DataTable */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        isLoading={isLoading}
        pageSize={15}
        emptyTitle="Tidak ada pengguna yang sesuai"
        emptyDescription="Coba sesuaikan filter role, status, atau kata kunci pencarian Anda."
      />

      {/* Modal 1: Tambah Pengguna Baru */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-[#111113]">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Tambah Pengguna Sistem Baru
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Contoh: Rian Hidayat"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Alamat Email (Login) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="email"
                  required
                  placeholder="Contoh: rian@nusantaralogistik.id"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Peran Otorisasi (RBAC) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  aria-label="Pilih peran pengguna baru"
                  className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-xs text-zinc-900 shadow-xs focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="STAFF">
                    STAFF — Operasional Gudang (Barang Masuk &amp; Keluar)
                  </option>
                  <option value="MANAGER">
                    MANAGER — Approval Dokumen, Opname &amp; Rekonsiliasi
                  </option>
                  <option value="ADMIN">
                    ADMIN — Pengaturan Sistem, Master Data &amp; Hak Akses
                  </option>
                  <option value="VIEWER">VIEWER — Hanya Melihat Stok &amp; Laporan</option>
                </select>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {ROLE_LABELS[newRole]?.desc}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Kata Sandi Awal
                </label>
                <Input
                  type="text"
                  placeholder="Default: Password123!"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="mt-1 text-[11px] text-zinc-400">
                  Dapat diisi custom atau dibiarkan default (Password123!) untuk kemudahan
                  pengujian.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isPending}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Menyimpan...' : 'Simpan Pengguna'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Role Pengguna */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-[#111113]">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Ubah Role Pengguna
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Pilih level akses baru untuk <strong>{editingUser.name}</strong> ({editingUser.email}
              ):
            </p>

            <div className="mt-4 space-y-2">
              {(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleUpdateRole(editingUser, r)}
                  disabled={isPending || editingUser.role === r}
                  className={`flex w-full items-center justify-between rounded-lg border p-2.5 text-left text-xs transition ${
                    editingUser.role === r
                      ? 'border-amber-500 bg-amber-50/50 font-bold text-amber-900 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{r}</div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {ROLE_LABELS[r]?.label}
                    </div>
                  </div>
                  {editingUser.role === r && (
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      Aktif
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingUser(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Konfirmasi Reset Kata Sandi */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-[#111113]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>

            <h2 className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Konfirmasi Reset Kata Sandi
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Kata sandi untuk pengguna <strong>{resetUser.name}</strong> ({resetUser.email}) akan
              dikembalikan ke kata sandi standar demo:
            </p>

            <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-center font-mono text-xs font-bold text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              Password123!
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResetUser(null)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmResetPassword}
                disabled={isPending}
              >
                {isPending ? 'Mereset...' : 'Ya, Reset Sandi'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Konfirmasi Pemulihan Database Operasional */}
      {showConfirmRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-[#18181b]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">
              Pulihkan Dataset Operasional Awal?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              Tindakan ini akan mengkalibrasi ulang seluruh transaksi menjadi dataset bersih FMCG PT
              Nusantara Logistik Distribusi (15 produk, 20 rak, 29 stok, 55 mutasi). Seluruh akun
              uji coba yang baru dibuat akan dikembalikan ke 5 akun resmi.
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmRestoreModal(false)}
                disabled={isResettingDb}
              >
                Batal
              </Button>
              <Button size="sm" onClick={handleManualRestore} disabled={isResettingDb}>
                {isResettingDb ? 'Memulihkan...' : 'Ya, Pulihkan Sekarang'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
