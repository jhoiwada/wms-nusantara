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
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variantClasses = {
      primary:
        'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold focus:ring-amber-500 border border-amber-500/60 shadow-xs dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-zinc-950',
      secondary:
        'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 focus:ring-zinc-400 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-700 dark:focus:ring-zinc-600',
      outline:
        'bg-transparent hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 border border-zinc-300 focus:ring-amber-500 dark:hover:bg-zinc-800/80 dark:text-zinc-300 dark:hover:text-white dark:border-zinc-700 dark:focus:ring-amber-500',
      ghost:
        'bg-transparent hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 focus:ring-amber-500 dark:hover:bg-zinc-800/80 dark:text-zinc-400 dark:hover:text-white dark:focus:ring-amber-500',
      danger:
        'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 border border-rose-600/50 shadow-xs dark:hover:bg-rose-500',
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
