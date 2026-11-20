import React from 'react';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textClassName?: string;
  className?: string;
  subtitle?: string;
}

const SIZES = {
  sm: {
    box: 'h-8 w-8 rounded-lg',
    iconSize: 20,
    titleText: 'text-xs',
    subText: 'text-[9px]',
  },
  md: {
    box: 'h-9 w-9 rounded-xl',
    iconSize: 24,
    titleText: 'text-xs',
    subText: 'text-[10px]',
  },
  lg: {
    box: 'h-11 w-11 rounded-xl',
    iconSize: 28,
    titleText: 'text-sm',
    subText: 'text-xs',
  },
  xl: {
    box: 'h-14 w-14 rounded-2xl',
    iconSize: 36,
    titleText: 'text-base',
    subText: 'text-xs',
  },
};

/**
 * Modern Corporate Monogram Logo for PT Nusantara Logistik Distribusi (NLD Logistics).
 * Built with anti-slop principles:
 * - High-contrast tactile industrial palette (Deep Carbon #09090b & Industrial Amber #f59e0b).
 * - Geometric 'N' monogram integrating Inbound (upward) and Outbound (forward) directional flow chevrons.
 * - Negative-space precision alignment and zero generic AI glows/gradients.
 */
export function BrandMark({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {/* Precision Geometric Grid - Inbound Pillar (Left, Upward Chevron Flow) */}
      <path
        d="M6 25V9.5L10.5 6L14 9V25H6Z"
        fill="currentColor"
        className="text-amber-500 dark:text-amber-400"
      />

      {/* Outbound Pillar (Right, Forward & Downward Flow) */}
      <path
        d="M18 7H26V22.5L21.5 26L18 23V7Z"
        fill="currentColor"
        className="text-amber-500 dark:text-amber-400"
      />

      {/* Dynamic Central Traverse / FEFO Velocity Chevron */}
      <path
        d="M14.5 12.8L21.5 21.2L17.5 24.5L10.5 16.1L14.5 12.8Z"
        fill="currentColor"
        className="text-amber-400 dark:text-amber-300"
      />

      {/* Tactical Center Distribution Node Indicator */}
      <rect
        x="14"
        y="14"
        width="4"
        height="4"
        rx="1"
        fill="#09090b"
        className="stroke-amber-400/80 dark:stroke-amber-300/80"
        strokeWidth="1"
      />
    </svg>
  );
}

export function BrandLogo({
  size = 'md',
  showText = false,
  textClassName = '',
  className = '',
  subtitle = 'DC Pulogadung & MM2100',
}: BrandLogoProps) {
  const cfg = SIZES[size];

  const logoMark = (
    <div
      className={`flex items-center justify-center border border-zinc-800 bg-[#09090b] shadow-sm transition-transform hover:scale-[1.02] dark:border-zinc-800 dark:bg-[#09090b] ${cfg.box} ${className}`}
    >
      <BrandMark size={cfg.iconSize} />
    </div>
  );

  if (!showText) {
    return logoMark;
  }

  return (
    <div className="flex items-center gap-3">
      {logoMark}
      <div className={textClassName}>
        <div
          className={`font-bold tracking-tight text-zinc-900 dark:text-zinc-100 ${cfg.titleText}`}
        >
          PT NUSANTARA LOGISTIK
        </div>
        <div className={`font-medium text-zinc-500 dark:text-zinc-400 ${cfg.subText}`}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}

export default BrandLogo;
