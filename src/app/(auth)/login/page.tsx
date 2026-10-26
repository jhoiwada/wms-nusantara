'use client';

import { Suspense, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface DemoAccount {
  role: string;
  name: string;
  email: string;
  description: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'ADMIN',
    name: 'Budi Santoso',
    email: 'admin@wms.local',
    description: 'Akses penuh ke seluruh sistem, master data, opname & pengguna',
  },
  {
    role: 'MANAGER',
    name: 'Siti Rahma',
    email: 'manager@wms.local',
    description: 'Approval opname, pembatalan dokumen, dan pelaporan',
  },
  {
    role: 'STAFF',
    name: 'Agus Setiawan',
    email: 'staff@wms.local',
    description: 'Operasional gudang: Barang Masuk (GR), Barang Keluar (DO)',
  },
  {
    role: 'VIEWER',
    name: 'Dewi Lestari',
    email: 'viewer@wms.local',
    description: 'Hanya melihat stok, pergerakan, dan kartu stok',
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleQuickFill = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword('Password123!');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });

        const json = await res.json();

        if (!res.ok) {
          setError(json.error?.message || 'Login gagal. Silakan periksa kembali data Anda.');
          return;
        }

        router.push(callbackUrl);
        router.refresh();
      } catch {
        setError('Terjadi kendala jaringan saat menghubungkan ke server.');
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090d16] px-4 py-12 text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-300">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-lg font-semibold tracking-wider text-emerald-400">
            WMS
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Sistem Manajemen Gudang</h1>
          <p className="mt-1 text-sm text-slate-400">
            Distribusi multi-gudang Jakarta &amp; Bekasi
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl backdrop-blur-sm">
          <h2 className="mb-1 text-lg font-semibold text-white">Masuk ke Portal</h2>
          <p className="mb-6 text-xs text-slate-400">
            Gunakan kredensial akun terdaftar untuk melanjutkan
          </p>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-300"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-slate-300">
                Alamat Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@wms.local"
                autoComplete="email"
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-medium text-slate-300">
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-slate-400 transition hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPassword ? 'Sembunyikan' : 'Perlihatkan'}
                </button>
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Memvalidasi...' : 'Masuk'}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-8 border-t border-slate-800/80 pt-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Akun Demo Cepat</span>
              <span className="font-mono text-[11px] text-slate-500">Password123!</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickFill(acc)}
                  className="flex flex-col rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 text-left transition hover:border-slate-700 hover:bg-slate-800/40"
                >
                  <span className="text-xs font-semibold text-emerald-400">{acc.role}</span>
                  <span className="truncate text-[11px] text-slate-300">{acc.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security Note */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Sesi terenkripsi HTTP-Only dengan masa berlaku 8 jam &amp; RBAC server-side.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090d16]" />}>
      <LoginForm />
    </Suspense>
  );
}
