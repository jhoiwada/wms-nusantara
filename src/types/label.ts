export type LabelSizePreset = '50x30' | '70x40' | '100x50' | 'A4-24';

export interface LabelPresetConfig {
  id: LabelSizePreset;
  name: string;
  description: string;
  widthMm: number;
  heightMm: number;
  isSheet?: boolean;
  columns?: number;
  rows?: number;
}

export const LABEL_PRESETS: Record<LabelSizePreset, LabelPresetConfig> = {
  '50x30': {
    id: '50x30',
    name: 'Termal Kecil (50 x 30 mm)',
    description: 'Ukuran stiker termal standar untuk kemasan kecil atau eceran',
    widthMm: 50,
    heightMm: 30,
    isSheet: false,
  },
  '70x40': {
    id: '70x40',
    name: 'Termal Standar (70 x 40 mm)',
    description: 'Ukuran stiker logistik & retail paling umum untuk produk gudang',
    widthMm: 70,
    heightMm: 40,
    isSheet: false,
  },
  '100x50': {
    id: '100x50',
    name: 'Termal Besar / Rak (100 x 50 mm)',
    description: 'Ukuran stiker besar untuk label rak, bin, karton atau palet',
    widthMm: 100,
    heightMm: 50,
    isSheet: false,
  },
  'A4-24': {
    id: 'A4-24',
    name: 'Lembar A4 (24 Label / Halaman)',
    description: 'Kertas stiker Tom & Jerry / Avery (3 kolom x 8 baris) printer biasa',
    widthMm: 210,
    heightMm: 297,
    isSheet: true,
    columns: 3,
    rows: 8,
  },
};

export interface LabelItem {
  id: string;
  type: 'PRODUCT' | 'LOCATION' | 'CUSTOM';
  title: string;
  subtitle?: string;
  barcodeValue: string;
  displayCode: string;
  secondaryInfo?: string;
  badgeText?: string;
  copies: number;
}
