'use client';

import React from 'react';
import { encodeCode128B } from '@/lib/barcode';

export interface BarcodeSvgProps {
  value: string;
  text?: string;
  height?: number;
  showText?: boolean;
  quietZone?: number;
  className?: string;
}

export function BarcodeSvg({
  value,
  text,
  height = 50,
  showText = true,
  quietZone = 10,
  className = '',
}: BarcodeSvgProps) {
  const encoded = encodeCode128B(value, quietZone);
  const totalWidth = encoded.totalModules;
  const totalHeight = showText ? height + 16 : height;
  const displayText = text ?? encoded.text;

  if (!value || encoded.bars.length === 0) {
    return (
      <div
        className={`flex h-12 items-center justify-center rounded border border-dashed border-zinc-300 text-xs text-zinc-400 dark:border-zinc-700 dark:text-zinc-500 ${className}`}
      >
        (Barcode Kosong)
      </div>
    );
  }

  return (
    <div className={`inline-block select-none ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="h-auto max-h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Barcode: ${displayText}`}
      >
        {encoded.bars.map((bar, index) => (
          <rect key={index} x={bar.x} y={0} width={bar.width} height={height} fill="#000000" />
        ))}
        {showText && displayText && (
          <text
            x={totalWidth / 2}
            y={height + 12}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
            fontSize={10}
            fontWeight="bold"
            textAnchor="middle"
            fill="#18181b"
          >
            {displayText}
          </text>
        )}
      </svg>
    </div>
  );
}
