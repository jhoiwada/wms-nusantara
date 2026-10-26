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
          <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-slate-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border bg-slate-950/70 px-3.5 py-2 text-sm text-white placeholder-slate-500 transition focus:ring-1 focus:outline-none ${
            error
              ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500'
              : 'border-slate-800 focus:border-emerald-500 focus:ring-emerald-500'
          } ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-rose-400">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
