'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionUser } from '@/server/auth/session';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ThemeToggle } from './theme-toggle';

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
      className={`flex h-14 w-full items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-sm transition-colors duration-150 select-none md:px-6 dark:border-zinc-800 dark:bg-[#111113]/90 ${className}`}
    >
      {/* Mobile Menu Button & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200 md:hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
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

        <div className="flex items-center gap-2.5 text-xs">
          <div className="md:hidden">
            <BrandLogo size="sm" />
          </div>
          <span className="font-bold text-zinc-900 dark:text-zinc-100">
            PT Nusantara Logistik Distribusi
          </span>
          <span className="hidden text-zinc-400 sm:inline dark:text-zinc-600">/</span>
          <span className="hidden text-zinc-600 sm:inline dark:text-zinc-400">
            DC Pulogadung &amp; MM2100
          </span>
        </div>
      </div>

      {/* Right Controls: Theme Toggle, User summary & Logout */}
      <div className="flex items-center gap-3">
        <ThemeToggle />

        <div className="hidden items-center gap-2.5 text-right sm:flex">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{user.name}</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{user.email}</span>
          </div>
          <Badge variant={user.role} className="font-mono text-[10px] font-bold uppercase">
            {user.role}
          </Badge>
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
