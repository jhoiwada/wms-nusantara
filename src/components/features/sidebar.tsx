'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@/types/auth';
import { Badge } from '@/components/ui/badge';
import { BrandLogo } from '@/components/ui/brand-logo';
import type { SessionUser } from '@/server/auth/session';

interface NavItem {
  label: string;
  href: string;
  roles: UserRole[];
  section?: string;
  soon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  // Utama
  {
    label: 'Dashboard',
    href: '/dashboard',
    roles: ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
    section: 'Utama',
  },

  // Transaksi
  {
    label: 'Barang Masuk (GR)',
    href: '/goods-receipts',
    roles: ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
    section: 'Operasional',
  },
  {
    label: 'Barang Keluar (DO)',
    href: '/delivery-orders',
    roles: ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
    section: 'Operasional',
  },
  {
    label: 'Stok Gudang',
    href: '/stock',
    roles: ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
    section: 'Operasional',
  },
  {
    label: 'Stock Opname',
    href: '/stock-opname',
    roles: ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
    section: 'Operasional',
  },
  {
    label: 'Penyesuaian Stok',
    href: '/stock-adjustments',
    roles: ['ADMIN', 'MANAGER'],
    section: 'Operasional',
  },
  {
    label: 'Transfer Stok',
    href: '/stock-transfers',
    roles: ['ADMIN', 'MANAGER', 'STAFF'],
    section: 'Operasional',
  },
  {
    label: 'Cetak Label Barcode',
    href: '/barcode-labels',
    roles: ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
    section: 'Operasional',
  },
  {
    label: 'Denah Gudang',
    href: '/warehouse-map',
    roles: ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
    section: 'Operasional',
  },
  {
    label: 'Retur Customer',
    href: '/customer-returns',
    roles: ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
    section: 'Operasional',
  },

  // Master Data
  {
    label: 'Produk (SKU)',
    href: '/products',
    roles: ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
    section: 'Master Data',
  },
  {
    label: 'Gudang & Lokasi',
    href: '/warehouses',
    roles: ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
    section: 'Master Data',
  },
  { label: 'Kategori', href: '/categories', roles: ['ADMIN', 'MANAGER'], section: 'Master Data' },
  { label: 'Supplier', href: '/suppliers', roles: ['ADMIN', 'MANAGER'], section: 'Master Data' },
  { label: 'Customer', href: '/customers', roles: ['ADMIN', 'MANAGER'], section: 'Master Data' },

  // Laporan & Admin
  {
    label: 'Laporan & Mutasi',
    href: '/reports',
    roles: ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
    section: 'Analisis',
  },
  {
    label: 'Audit Log',
    href: '/audit-logs',
    roles: ['ADMIN', 'MANAGER'],
    section: 'Sistem',
  },
  { label: 'Kelola Pengguna', href: '/users', roles: ['ADMIN'], section: 'Sistem' },
];

export interface SidebarProps {
  user: SessionUser;
  onItemClick?: () => void;
  className?: string;
}

export function Sidebar({ user, onItemClick, className = '' }: SidebarProps) {
  const pathname = usePathname();

  // Filter menu menurut role pengguna (BR & SECURITY.md)
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  // Kelompokkan menu berdasarkan section
  const sections = Array.from(new Set(visibleItems.map((item) => item.section || 'Lainnya')));

  return (
    <aside
      className={`flex h-full w-64 flex-col justify-between border-r border-zinc-200 bg-white p-4 transition-colors duration-150 select-none dark:border-zinc-800/80 dark:bg-[#111113] ${className}`}
    >
      <div>
        {/* Logo / Brand Header */}
        <div className="mb-4 border-b border-zinc-200/80 px-2 py-3 dark:border-zinc-800/80">
          <BrandLogo size="md" showText subtitle="Pulogadung & MM2100" />
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-4">
          {sections.map((section) => (
            <div key={section}>
              <div className="mb-1.5 px-2.5 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                {section}
              </div>
              <ul className="space-y-0.5">
                {visibleItems
                  .filter((item) => item.section === section)
                  .map((item) => {
                    if (item.soon) {
                      return (
                        <li key={item.href}>
                          <span className="flex cursor-default items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 dark:text-zinc-600">
                            <span>{item.label}</span>
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-zinc-500 uppercase dark:bg-zinc-800 dark:text-zinc-500">
                              Soon
                            </span>
                          </span>
                        </li>
                      );
                    }

                    const isActive =
                      item.href === '/dashboard'
                        ? pathname === '/dashboard'
                        : pathname.startsWith(item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onItemClick}
                          className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            isActive
                              ? 'border border-amber-500/40 bg-amber-500/10 font-bold text-amber-900 shadow-xs dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400'
                              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
                          }`}
                        >
                          <span>{item.label}</span>
                          {isActive && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* User Session Footer Card */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-3 transition-colors dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="max-w-[140px] truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">
            {user.name}
          </span>
          <Badge variant={user.role}>{user.role}</Badge>
        </div>
        <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">{user.email}</p>
        <form action="/api/v1/auth/logout" method="POST" className="mt-2">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Keluar dari Sistem
          </button>
        </form>
      </div>
    </aside>
  );
}
