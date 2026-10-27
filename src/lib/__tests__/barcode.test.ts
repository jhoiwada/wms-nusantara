import { describe, it, expect } from 'vitest';
import { encodeCode128B, generateBarcodeSvgString } from '@/lib/barcode';

describe('Code 128 Barcode Engine', () => {
  it('encodes an ASCII string and computes correct checksum', () => {
    // PJJ123C:
    // Start B (104)
    // P: 80 - 32 = 48 (pos 1 -> 48 * 1 = 48)
    // J: 74 - 32 = 42 (pos 2 -> 42 * 2 = 84)
    // J: 74 - 32 = 42 (pos 3 -> 42 * 3 = 126)
    // 1: 49 - 32 = 17 (pos 4 -> 17 * 4 = 68)
    // 2: 50 - 32 = 18 (pos 5 -> 18 * 5 = 90)
    // 3: 51 - 32 = 19 (pos 6 -> 19 * 6 = 114)
    // C: 67 - 32 = 35 (pos 7 -> 35 * 7 = 245)
    // Total sum = 104 + 48 + 84 + 126 + 68 + 90 + 114 + 245 = 879
    // Checksum = 879 % 103 = 55
    const res = encodeCode128B('PJJ123C');
    expect(res.text).toBe('PJJ123C');
    expect(res.checksum).toBe(55);
    // 7 characters + Start (11) + Checksum (11) + Stop (13) = 7*11 + 35 = 112 modules + 20 quiet zone = 132 modules
    expect(res.totalModules).toBe(132);
    expect(res.bars.length).toBeGreaterThan(0);
  });

  it('handles empty text gracefully', () => {
    const res = encodeCode128B('');
    expect(res.text).toBe('');
    expect(res.checksum).toBe(0);
    expect(res.bars).toEqual([]);
    expect(res.totalModules).toBe(20);
  });

  it('handles standard SKU with hyphens and numbers', () => {
    const res = encodeCode128B('SKU-1002');
    expect(res.text).toBe('SKU-1002');
    expect(res.bars.length).toBeGreaterThan(15);
    // 8 chars + start + checksum + stop = 11*10 + 13 = 123 modules + 20 = 143
    expect(res.totalModules).toBe(143);
  });

  it('generates a valid SVG string with rects and text', () => {
    const svg = generateBarcodeSvgString('TEST-123', { height: 40, showText: true });
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('<rect');
    expect(svg).toContain('<text');
    expect(svg).toContain('TEST-123');
    expect(svg).toContain('</svg>');
  });

  it('generates an SVG string without text if showText is false', () => {
    const svg = generateBarcodeSvgString('NO-TEXT', { showText: false });
    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
    expect(svg).not.toContain('<text');
  });

  it('replaces out-of-range non-ASCII characters gracefully', () => {
    const res = encodeCode128B('PROD-©');
    expect(res.bars.length).toBeGreaterThan(0);
  });
});
