import React from 'react';
import { Button } from './button';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className = '',
  icon,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-12 text-center ${className}`}
    >
      <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-800/80 text-slate-400">
        {icon || (
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        )}
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-slate-400">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
