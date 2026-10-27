/**
 * Code 128 Barcode Generator (Pure TypeScript / Zero External Dependencies)
 * Standard: ISO/IEC 15417:2007 (Code Set B for all printable ASCII 32..126)
 */

export const CODE128_PATTERNS: readonly string[] = [
  '212222',
  '222122',
  '222221',
  '121223',
  '121322',
  '131222',
  '122213',
  '122312',
  '132212',
  '221213',
  '221312',
  '231212',
  '112232',
  '122132',
  '122231',
  '113222',
  '123122',
  '123221',
  '223211',
  '221132',
  '221231',
  '213212',
  '223112',
  '312131',
  '311222',
  '321122',
  '321221',
  '312212',
  '322112',
  '322211',
  '212123',
  '212321',
  '232121',
  '111323',
  '131123',
  '131321',
  '112313',
  '132113',
  '132311',
  '211313',
  '231113',
  '231311',
  '112133',
  '112331',
  '132131',
  '113123',
  '113321',
  '133121',
  '313121',
  '211331',
  '231131',
  '213113',
  '213311',
  '213131',
  '311123',
  '311321',
  '331121',
  '312113',
  '312311',
  '332111',
  '314111',
  '221411',
  '431111',
  '111224',
  '111422',
  '121124',
  '121421',
  '141122',
  '141221',
  '112214',
  '112412',
  '122114',
  '122411',
  '142112',
  '142211',
  '241211',
  '221114',
  '413111',
  '241112',
  '134111',
  '111242',
  '121142',
  '121241',
  '114212',
  '124112',
  '124211',
  '411212',
  '421112',
  '421211',
  '212141',
  '214121',
  '412121',
  '111143',
  '111341',
  '131141',
  '114113',
  '114311',
  '411113',
  '411311',
  '113141',
  '114131',
  '311141',
  '411131',
  '211412',
  '211214',
  '211232',
  '2331112',
];

export const START_CODE_B = 104;
export const STOP_CODE = 106;

export interface BarcodeBar {
  x: number;
  width: number;
}

export interface EncodedBarcode {
  text: string;
  checksum: number;
  totalModules: number;
  bars: BarcodeBar[];
  quietZone: number;
}

export interface BarcodeRenderOptions {
  height?: number;
  barWidth?: number;
  quietZone?: number;
  showText?: boolean;
  className?: string;
}

/**
 * Encodes an ASCII string into Code 128B bar widths and positions.
 */
export function encodeCode128B(rawText: string, quietZone = 10): EncodedBarcode {
  const text = (rawText || '').trim();
  if (!text) {
    return {
      text: '',
      checksum: 0,
      totalModules: quietZone * 2,
      bars: [],
      quietZone,
    };
  }

  const codes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 32;
    if (code < 0 || code > 95) {
      // Replace out-of-range ASCII with '?' (ASCII 63 -> code 31)
      codes.push(31);
    } else {
      codes.push(code);
    }
  }

  let sum = START_CODE_B;
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i] ?? 0;
    sum += code * (i + 1);
  }
  const checksum = sum % 103;

  const allSymbols = [START_CODE_B, ...codes, checksum, STOP_CODE];
  const widthsString = allSymbols.map((s) => CODE128_PATTERNS[s] ?? '').join('');

  let currentX = quietZone;
  const bars: BarcodeBar[] = [];

  for (let i = 0; i < widthsString.length; i++) {
    const wChar = widthsString[i] ?? '1';
    const width = parseInt(wChar, 10);
    // Even index is black bar, odd index is white space
    if (i % 2 === 0) {
      bars.push({ x: currentX, width });
    }
    currentX += width;
  }

  const totalModules = currentX + quietZone;

  return {
    text,
    checksum,
    totalModules,
    bars,
    quietZone,
  };
}

/**
 * Generates an SVG string representation of the Code 128 barcode.
 */
export function generateBarcodeSvgString(text: string, options: BarcodeRenderOptions = {}): string {
  const height = options.height ?? 50;
  const quietZone = options.quietZone ?? 10;
  const showText = options.showText ?? true;

  const encoded = encodeCode128B(text, quietZone);
  const totalWidth = encoded.totalModules;
  const totalHeight = showText ? height + 16 : height;

  const rects = encoded.bars
    .map(
      (bar) => `<rect x="${bar.x}" y="0" width="${bar.width}" height="${height}" fill="#000000" />`,
    )
    .join('');

  const textElement =
    showText && encoded.text
      ? `<text x="${totalWidth / 2}" y="${height + 12}" font-family="monospace, monospace" font-size="10" font-weight="bold" text-anchor="middle" fill="#1e293b">${escapeXml(encoded.text)}</text>`
      : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${rects}${textElement}</svg>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
