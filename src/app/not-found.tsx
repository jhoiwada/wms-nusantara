import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { BrandLogo } from '@/components/ui/brand-logo';

export const metadata: Metadata = {
  title: '404 — Halaman Tidak Ditemukan | PT Nusantara Logistik Distribusi',
};

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-[#0a0a0b]">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Logo */}
        <div className="flex justify-center">
          <BrandLogo size="xl" />
        </div>

        {/* Error Code */}
        <div>
          <p className="font-mono text-7xl font-black tracking-tight text-zinc-200 dark:text-zinc-800">
            404
          </p>
          <h1 className="mt-2 text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Halaman Tidak Ditemukan
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Halaman yang kamu cari tidak ada atau telah dipindahkan. Periksa kembali URL yang kamu
            masukkan.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-amber-400"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Ke Dashboard
          </Link>
          <Link
            href="/goods-receipts"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Barang Masuk (GR)
          </Link>
        </div>

        {/* Footer hint */}
        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          PT Nusantara Logistik Distribusi &mdash; DC Pulogadung &amp; MM2100
        </p>
      </div>
    </div>
  );
}
