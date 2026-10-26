'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionUser } from '@/server/auth/session';
import { Button } from '@/components/ui/button';

export interface TopbarProps {
  user: SessionUser;
  onMenuToggle: () => void;
  className?: string;
}

export function Topbar({ user, onMenuToggle, className = '' }: TopbarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await fetch('/api/v1/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
      } catch {
        router.push('/login');
      }
    });
  };

  return (
    <header
      className={`flex h-14 w-full items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur-sm select-none md:px-6 ${className}`}
    >
      {/* Mobile Menu Button & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 md:hidden"
          aria-label="Buka menu navigasi"
        >
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-white">Sistem Gudang</span>
          <span className="text-slate-600">/</span>
          <span className="rounded-md border border-slate-800 bg-slate-900/80 px-2 py-0.5 text-[11px] text-slate-300">
            Multi-Warehouse (JKT &amp; BKS)
          </span>
        </div>
      </div>

      {/* Right Controls: User summary & Logout */}
      <div className="flex items-center gap-3">
        <div className="hidden flex-col text-right sm:flex">
          <span className="text-xs font-medium text-white">{user.name}</span>
          <span className="text-[10px] text-slate-400">{user.email}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          isLoading={isPending}
          className="text-xs"
        >
          Keluar
        </Button>
      </div>
    </header>
  );
}
