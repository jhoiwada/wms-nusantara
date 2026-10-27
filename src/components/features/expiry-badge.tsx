import React from 'react';

export type ExpiryStatus = 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'SAFE';

export interface ExpiryBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  expiryDate?: Date | string | null;
  daysRemaining?: number | null;
  status?: ExpiryStatus;
  showDays?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * ExpiryBadge component (BR-10).
 * Displays batch shelf-life countdown and status:
 * - EXPIRED: daysRemaining < 0 (Red / Danger)
 * - CRITICAL: 0 <= daysRemaining <= 7 (Pulsing Red / Alert)
 * - WARNING: 8 <= daysRemaining <= 30 (Amber / Hampir Expired)
 * - SAFE: daysRemaining > 30 (Emerald / Aman)
 * - NULL: Tanpa Kedaluwarsa (Slate / Neutral)
 */
export function ExpiryBadge({
  expiryDate,
  daysRemaining: initialDays,
  status: initialStatus,
  showDays = true,
  size = 'sm',
  className = '',
  ...props
}: ExpiryBadgeProps) {
  if (!expiryDate && initialDays === undefined && !initialStatus) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 ${
          size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
        } ${className}`}
        {...props}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
        Tanpa Kedaluwarsa
      </span>
    );
  }

  // Calculate days remaining relative to today start-of-day
  let computedDays = initialDays;
  if (computedDays === undefined || computedDays === null) {
    if (expiryDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const exp = new Date(expiryDate);
      exp.setHours(0, 0, 0, 0);
      computedDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    } else {
      computedDays = null;
    }
  }

  let resolvedStatus = initialStatus;
  if (!resolvedStatus) {
    if (computedDays === null) {
      resolvedStatus = 'SAFE';
    } else if (computedDays < 0) {
      resolvedStatus = 'EXPIRED';
    } else if (computedDays <= 7) {
      resolvedStatus = 'CRITICAL';
    } else if (computedDays <= 30) {
      resolvedStatus = 'WARNING';
    } else {
      resolvedStatus = 'SAFE';
    }
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  if (resolvedStatus === 'EXPIRED') {
    const dayText = computedDays !== null && showDays ? ` (${Math.abs(computedDays)}h lalu)` : '';
    return (
      <span
        aria-label={`Status kedaluwarsa: Kedaluwarsa${dayText}`}
        title={`Batch sudah kedaluwarsa${dayText}`}
        className={`inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-rose-100/90 font-semibold text-rose-900 dark:border-rose-800/80 dark:bg-rose-950/80 dark:text-rose-200 ${sizeClass} ${className}`}
        {...props}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
        Kedaluwarsa{dayText}
      </span>
    );
  }

  if (resolvedStatus === 'CRITICAL') {
    const dayText =
      computedDays !== null && showDays
        ? computedDays === 0
          ? ' (Hari Ini!)'
          : ` (${computedDays} hari)`
        : '';
    return (
      <span
        aria-label={`Status kedaluwarsa: Kritis${dayText}`}
        title={`Batch kritis mendekati kedaluwarsa${dayText}`}
        className={`inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 font-semibold text-red-800 dark:border-red-800/70 dark:bg-red-950/70 dark:text-red-300 ${sizeClass} ${className}`}
        {...props}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        Kritis{dayText}
      </span>
    );
  }

  if (resolvedStatus === 'WARNING') {
    const dayText = computedDays !== null && showDays ? ` (${computedDays} hari)` : '';
    return (
      <span
        aria-label={`Status kedaluwarsa: Mendekati Expired${dayText}`}
        title={`Batch mendekati kedaluwarsa dalam 30 hari${dayText}`}
        className={`inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 font-medium text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/70 dark:text-amber-300 ${sizeClass} ${className}`}
        {...props}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
        Hampir Expired{dayText}
      </span>
    );
  }

  // SAFE
  const dayText = computedDays !== null && showDays ? ` (${computedDays} hari)` : '';
  return (
    <span
      aria-label={`Status kedaluwarsa: Aman${dayText}`}
      title={`Batch dalam masa simpan aman${dayText}`}
      className={`inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 font-medium text-emerald-900 dark:border-emerald-800/70 dark:bg-emerald-950/70 dark:text-emerald-300 ${sizeClass} ${className}`}
      {...props}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
      Aman{dayText}
    </span>
  );
}
