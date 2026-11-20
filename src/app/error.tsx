'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/brand-logo';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception to client console for telemetry/debugging
    console.error('Unhandled application exception captured in error boundary:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-[#0a0a0b]">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Brand Logo */}
        <div className="flex justify-center">
          <BrandLogo size="xl" />
        </div>

        {/* Error Code & Status */}
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 font-mono text-xs font-bold text-rose-700 dark:border-rose-500/20 dark:text-rose-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
            <span>KENDALA SISTEM (500)</span>
          </span>
          <h1 className="mt-3 text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Terjadi Gangguan pada Layanan
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Sistem mendeteksi kendala pada pemrosesan permintaan Anda. Transaksi basis data Anda
            tetap terlindungi oleh prinsip integritas ACID dan tidak ada saldo persediaan yang
            terdampak.
          </p>

          {error?.digest && (
            <p className="mt-2 font-mono text-[10px] text-zinc-400 dark:text-zinc-600">
              ID Insiden: {error.digest}
            </p>
          )}
        </div>

        {/* Recovery Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-amber-400 active:translate-y-0.5"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Muat Ulang Halaman</span>
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Ke Dashboard
          </Link>
        </div>

        {/* Support Footer */}
        <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
          PT Nusantara Logistik Distribusi &bull; Bantuan TI:{' '}
          <span className="font-mono text-zinc-500 dark:text-zinc-400">
            support@nldlogistics.co.id
          </span>
        </p>
      </div>
    </div>
  );
}
