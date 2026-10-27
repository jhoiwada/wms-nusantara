'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@/types/auth';
import { Badge } from '@/components/ui/badge';
import type { SessionUser } from '@/server/auth/session';

interface NavItem {
  label: string;
  href: string;
  roles: UserRole[];
  section?: string;
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
      className={`flex h-full w-64 flex-col justify-between border-r border-slate-800 bg-slate-950 p-4 select-none ${className}`}
    >
      <div>
        {/* Logo / Brand Header */}
        <div className="mb-4 flex items-center gap-3 border-b border-slate-800/80 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-sm font-bold tracking-wide text-emerald-400">
            WMS
          </div>
          <div>
            <div className="text-xs font-bold tracking-tight text-white">DISTRIBUSI WMS</div>
            <div className="text-[10px] text-slate-400">Jakarta &amp; Bekasi</div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-4">
          {sections.map((section) => (
            <div key={section}>
              <div className="mb-1.5 px-2.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                {section}
              </div>
              <ul className="space-y-0.5">
                {visibleItems
                  .filter((item) => item.section === section)
                  .map((item) => {
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
                              ? 'border border-emerald-800/50 bg-emerald-950/60 text-emerald-300'
                              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                          }`}
                        >
                          <span>{item.label}</span>
                          {isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
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
      <div className="mt-6 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="max-w-[140px] truncate text-xs font-semibold text-white">
            {user.name}
          </span>
          <Badge variant={user.role}>{user.role}</Badge>
        </div>
        <p className="truncate text-[11px] text-slate-400">{user.email}</p>
      </div>
    </aside>
  );
}
