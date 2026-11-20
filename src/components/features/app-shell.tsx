'use client';

import React, { useState } from 'react';
import type { SessionUser } from '@/server/auth/session';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#fbfbfa] text-zinc-900 transition-colors duration-150 selection:bg-amber-500/30 selection:text-amber-950 dark:bg-[#111113] dark:text-zinc-100 dark:selection:bg-amber-500/30 dark:selection:text-amber-200">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-shrink-0">
        <Sidebar user={user} className="w-64" />
      </div>

      {/* Mobile Sidebar Overlay Drawer */}
      {isMobileMenuOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative z-10 flex h-full w-72 max-w-[80vw] flex-col shadow-2xl">
            <Sidebar
              user={user}
              onItemClick={() => setIsMobileMenuOpen(false)}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={user} onMenuToggle={() => setIsMobileMenuOpen((prev) => !prev)} />

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
