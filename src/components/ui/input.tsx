import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border px-3.5 py-2 text-sm transition focus:ring-1 focus:outline-none ${
            error
              ? 'border-rose-400 bg-rose-50/30 text-rose-950 placeholder-rose-300 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-500/60 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder-rose-400/50'
              : 'border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:ring-amber-500 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder-zinc-500'
          } ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
