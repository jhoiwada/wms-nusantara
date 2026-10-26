import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variantClasses = {
      primary:
        'bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500 border border-emerald-500/30',
      secondary:
        'bg-slate-800 hover:bg-slate-700 text-slate-100 focus:ring-slate-600 border border-slate-700',
      outline:
        'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 focus:ring-slate-600',
      ghost:
        'bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white focus:ring-slate-600',
      danger:
        'bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-500 border border-rose-500/30',
    };

    const sizeClasses = {
      sm: 'px-2.5 py-1.5 text-xs gap-1.5',
      md: 'px-3.5 py-2 text-sm gap-2',
      lg: 'px-4.5 py-2.5 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg
            className="-ml-0.5 h-4 w-4 animate-spin text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
