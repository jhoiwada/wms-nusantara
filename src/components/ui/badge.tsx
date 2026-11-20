import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'DRAFT'
  | 'RECEIVED'
  | 'SHIPPED'
  | 'CANCELLED'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN'
  | 'OUT'
  | 'ADMIN'
  | 'MANAGER'
  | 'STAFF'
  | 'VIEWER';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  const variantStyles: Record<string, string> = {
    default:
      'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
    neutral:
      'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60',
    success:
      'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
    warning:
      'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
    danger:
      'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
    info: 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',

    // Dokumen GR & DO
    DRAFT:
      'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50',
    RECEIVED:
      'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
    SHIPPED:
      'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
    CANCELLED:
      'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',

    // Dokumen Opname
    SUBMITTED:
      'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
    APPROVED:
      'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
    REJECTED:
      'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',

    // Pergerakan stok
    IN: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
    OUT: 'bg-orange-50 text-orange-900 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60',

    // Peran pengguna
    ADMIN:
      'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60',
    MANAGER:
      'bg-amber-500/15 text-amber-900 border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40',
    STAFF:
      'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
    VIEWER:
      'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  };

  const style = variantStyles[variant] || variantStyles.default;

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase ${style} ${className}`}
      {...props}
    >
      {children || variant}
    </span>
  );
}

export {
  ExpiryBadge,
  type ExpiryBadgeProps,
  type ExpiryStatus,
} from '@/components/features/expiry-badge';
