'use client';

import React, { useSyncExternalStore } from 'react';
import { useTheme } from './theme-provider';

const emptySubscribe = () => () => {};

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        mounted
          ? `Beralih ke mode ${resolvedTheme === 'dark' ? 'terang' : 'gelap'}`
          : 'Beralih mode tema'
      }
      title={
        mounted
          ? `Beralih ke mode ${resolvedTheme === 'dark' ? 'terang' : 'gelap'}`
          : 'Beralih mode tema'
      }
      suppressHydrationWarning
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200 hover:text-zinc-900 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus:ring-offset-zinc-950 ${className}`}
    >
      {!mounted ? (
        <span className="h-4 w-4" aria-hidden="true" />
      ) : resolvedTheme === 'dark' ? (
        // Ikon Matahari (Mode Terang)
        <svg
          className="h-4 w-4 text-amber-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        // Ikon Bulan (Mode Gelap)
        <svg
          className="h-4 w-4 text-zinc-700"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}
