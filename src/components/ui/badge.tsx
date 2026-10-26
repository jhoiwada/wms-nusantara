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
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    neutral: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
    success: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50',
    warning: 'bg-amber-950/50 text-amber-300 border-amber-800/50',
    danger: 'bg-rose-950/50 text-rose-300 border-rose-800/50',
    info: 'bg-sky-950/50 text-sky-300 border-sky-800/50',

    // Dokumen GR & DO
    DRAFT: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
    RECEIVED: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50',
    SHIPPED: 'bg-sky-950/50 text-sky-300 border-sky-800/50',
    CANCELLED: 'bg-rose-950/50 text-rose-300 border-rose-800/50',

    // Dokumen Opname
    SUBMITTED: 'bg-blue-950/50 text-blue-300 border-blue-800/50',
    APPROVED: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50',
    REJECTED: 'bg-rose-950/50 text-rose-300 border-rose-800/50',

    // Pergerakan stok
    IN: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50',
    OUT: 'bg-orange-950/50 text-orange-300 border-orange-800/50',

    // Peran pengguna
    ADMIN: 'bg-purple-950/50 text-purple-300 border-purple-800/50',
    MANAGER: 'bg-blue-950/50 text-blue-300 border-blue-800/50',
    STAFF: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50',
    VIEWER: 'bg-slate-800 text-slate-300 border-slate-700',
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
