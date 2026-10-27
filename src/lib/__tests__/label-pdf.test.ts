import { describe, it, expect } from 'vitest';
import { generateLabelsPdf } from '@/lib/label-pdf';
import type { LabelItem } from '@/types/label';

describe('Label PDF Generator', () => {
  const sampleItems: LabelItem[] = [
    {
      id: 'item-1',
      type: 'PRODUCT',
      title: 'Kopi Kapal Api Special 165g',
      subtitle: 'Kategori: Makanan & Minuman',
      barcodeValue: '899123456789',
      displayCode: 'SKU-KOPI-01',
      secondaryInfo: 'Rp 14.500 / PCS',
      copies: 2,
    },
    {
      id: 'item-2',
      type: 'LOCATION',
      title: 'Gudang Utama (WH1)',
      subtitle: 'Zona A - Rak 02 - Tingkat 01',
      barcodeValue: 'WH1-A-02-01',
      displayCode: 'WH1-A-02-01',
      copies: 1,
    },
  ];

  it('generates a valid 50x30 thermal PDF with multiple pages for copies', () => {
    const doc = generateLabelsPdf(sampleItems, '50x30');
    expect(doc).toBeDefined();
    // 2 copies of item-1 + 1 copy of item-2 = 3 pages
    expect(doc.getNumberOfPages()).toBe(3);
    const arrayBuffer = doc.output('arraybuffer');
    expect(arrayBuffer.byteLength).toBeGreaterThan(1000);
  });

  it('generates a valid 70x40 standard thermal PDF', () => {
    const doc = generateLabelsPdf(sampleItems, '70x40');
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(3);
    const arrayBuffer = doc.output('arraybuffer');
    expect(arrayBuffer.byteLength).toBeGreaterThan(1000);
  });

  it('generates a valid 100x50 large rack label PDF', () => {
    const doc = generateLabelsPdf(sampleItems, '100x50');
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(3);
  });

  it('generates a valid A4 sheet grid PDF (24 labels per sheet)', () => {
    // 3 labels fit within 1 A4 page
    const doc = generateLabelsPdf(sampleItems, 'A4-24');
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
    const arrayBuffer = doc.output('arraybuffer');
    expect(arrayBuffer.byteLength).toBeGreaterThan(1000);
  });

  it('handles empty label list gracefully', () => {
    const doc = generateLabelsPdf([], '70x40');
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
  });
});
