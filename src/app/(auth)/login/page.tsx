'use client';

import { Suspense, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ThemeToggle } from '@/components/features/theme-toggle';
import { BrandLogo } from '@/components/ui/brand-logo';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Email dan kata sandi wajib diisi');
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
          setError(
            json.error?.message || 'Autentikasi gagal. Periksa kembali email dan kata sandi Anda.',
          );
          return;
        }

        router.push(callbackUrl);
        router.refresh();
      } catch {
        setError('Terjadi kendala jaringan saat menghubungkan ke gateway autentikasi.');
      }
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#fbfbfa] px-4 py-12 text-zinc-900 transition-colors selection:bg-amber-500/30 selection:text-amber-950 dark:bg-[#111113] dark:text-zinc-100 dark:selection:text-amber-200">
      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex">
            <BrandLogo size="xl" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            PT Nusantara Logistik Distribusi
          </h1>
          <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Portal Otentikasi Terpusat DC Pulogadung &amp; MM2100 Cikarang
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-lg dark:border-zinc-800 dark:bg-zinc-900/90">
          <div className="mb-6 flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Masuk ke Portal WMS
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Masukkan akun resmi terdaftar untuk melanjutkan
              </p>
            </div>
            <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
              SSL SECURED
            </span>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Alamat Email Resmi
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@nldlogistics.co.id"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-600"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
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
                className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-600"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 shadow-sm transition hover:bg-amber-400 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-zinc-900"
            >
              {isPending ? 'Memvalidasi Kredensial...' : 'Masuk ke Sistem WMS'}
            </button>
          </form>

          {/* Enterprise Security Notice */}
          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-[11px] leading-relaxed text-zinc-500 dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:text-zinc-400">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>
              Akses sistem dipantau dan diaudit oleh tim keamanan internal. Percobaan login yang
              gagal berulang kali akan memicu penguncian alamat IP otomatis (*Rate Limiter Active*).
            </span>
          </div>

          {/* Corporate Support / IT Helpdesk Footer */}
          <div className="mt-6 border-t border-zinc-100 pt-4 text-center dark:border-zinc-800">
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Mengalami kendala otentikasi atau kehilangan hak akses? Hubungi Administrator TI
              internal di{' '}
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                support@nldlogistics.co.id
              </span>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
          PT Nusantara Logistik Distribusi &bull; Hak Cipta &copy; 2026. Seluruh hak dilindungi
          undang-undang.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbfbfa] dark:bg-[#111113]" />}>
      <LoginForm />
    </Suspense>
  );
}
