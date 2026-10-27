'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BarcodeSvg } from '@/components/ui/barcode';
import { LABEL_PRESETS, type LabelItem, type LabelSizePreset } from '@/types/label';
import { generateLabelsPdf } from '@/lib/label-pdf';

interface BarcodeLabelPrinterProps {
  initialItems: LabelItem[];
  defaultPreset?: LabelSizePreset;
  onClose?: () => void;
  isModal?: boolean;
}

export function BarcodeLabelPrinter({
  initialItems,
  defaultPreset = '70x40',
  onClose,
  isModal = false,
}: BarcodeLabelPrinterProps) {
  const [items, setItems] = useState<LabelItem[]>(initialItems);
  const [preset, setPreset] = useState<LabelSizePreset>(defaultPreset);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const selectedPresetConfig = LABEL_PRESETS[preset];

  // Update copies for a specific item
  const handleUpdateCopies = (id: string, copies: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, copies: Math.max(1, copies) } : item)),
    );
  };

  // Remove an item from the print queue
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Set all copies to a uniform number
  const handleSetAllCopies = (num: number) => {
    setItems((prev) => prev.map((item) => ({ ...item, copies: Math.max(1, num) })));
  };

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  // Trigger PDF download
  const handleDownloadPdf = () => {
    try {
      setIsExportingPdf(true);
      const doc = generateLabelsPdf(items, preset);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      doc.save(`labels-${preset}-${timestamp}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const totalLabels = items.reduce((sum, item) => sum + (item.copies || 1), 0);

  // Flatten items for live preview and browser printing
  const flattenedLabels: { item: LabelItem; copyIndex: number }[] = [];
  items.forEach((item) => {
    const count = Math.max(1, item.copies || 1);
    for (let c = 0; c < count; c++) {
      flattenedLabels.push({ item, copyIndex: c });
    }
  });

  return (
    <div className="space-y-6">
      {/* Dynamic Print CSS for flawless page layout */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          nav,
          header,
          aside,
          .no-print {
            display: none !important;
          }
          .print-container {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .print-sheet-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 63.5mm) !important;
            gap: 2.5mm 0mm !important;
            padding-left: 7.5mm !important;
            padding-top: 11mm !important;
          }
          .print-label-item {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-thermal-roll .print-label-item {
            page-break-after: always !important;
            break-after: page !important;
          }
          @page {
            size: ${
              preset === 'A4-24'
                ? 'A4 portrait'
                : `${selectedPresetConfig.widthMm}mm ${selectedPresetConfig.heightMm}mm`
            };
            margin: 0;
          }
        }
      `}</style>

      {/* Control Bar (Hidden on print) */}
      <div className="no-print rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Pengaturan Cetak Label</h2>
            <p className="text-xs text-slate-500">
              Total {items.length} item unik ({totalLabels} total label dicetak)
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {onClose && isModal && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Tutup
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf || items.length === 0}
              className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {isExportingPdf ? 'Menyiapkan PDF...' : 'Unduh PDF'}
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              disabled={items.length === 0}
              className="gap-1.5 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Cetak Sekarang
            </Button>
          </div>
        </div>

        {/* Preset & Quick Copies */}
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Ukuran / Format Label
            </label>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as LabelSizePreset)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
            >
              {(Object.keys(LABEL_PRESETS) as LabelSizePreset[]).map((key) => (
                <option key={key} value={key}>
                  {LABEL_PRESETS[key].name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Set Semua Copies
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 5, 10, 20].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleSetAllCopies(num)}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  {num}x
                </button>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-slate-700">Info Preset</span>
            <div className="rounded bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
              {selectedPresetConfig.description}
            </div>
          </div>
        </div>

        {/* Selected Items List */}
        {items.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="mb-2 text-xs font-medium text-slate-700">Daftar Item Label:</div>
            <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto">
              {items.map((it) => (
                <div key={it.id} className="flex items-center justify-between py-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                      {it.displayCode}
                    </span>
                    <span className="max-w-xs truncate font-medium text-slate-900">{it.title}</span>
                    {it.secondaryInfo && (
                      <span className="text-[11px] font-semibold text-emerald-700">
                        {it.secondaryInfo}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Jumlah:</span>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={it.copies}
                      onChange={(e) => handleUpdateCopies(it.id, parseInt(e.target.value, 10) || 1)}
                      className="w-16 rounded border border-slate-300 px-2 py-0.5 text-center font-mono text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.id)}
                      className="px-1 text-slate-400 hover:text-rose-600"
                      title="Hapus dari antrean cetak"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live Label Preview Section */}
      <div className="print-container">
        <div className="no-print mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Pratinjau Label ({flattenedLabels.length} Stiker)
          </h3>
          <span className="text-xs text-slate-400">
            {preset === 'A4-24' ? 'Tampilan Lembar A4' : 'Tampilan Stiker Gulungan Termal'}
          </span>
        </div>

        {flattenedLabels.length === 0 ? (
          <div className="no-print rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            Tidak ada item label dalam antrean cetak.
          </div>
        ) : (
          <div
            className={` ${preset === 'A4-24' ? 'print-sheet-grid grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-100 p-4 sm:grid-cols-2 md:grid-cols-3' : 'print-thermal-roll flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-slate-100 p-4'} `}
          >
            {flattenedLabels.map(({ item, copyIndex }, idx) => (
              <div
                key={`${item.id}-${copyIndex}-${idx}`}
                className={`print-label-item relative flex flex-col justify-between overflow-hidden border border-slate-200 bg-white text-slate-900 shadow-xs ${preset === '50x30' ? 'h-[120px] w-[190px] p-2 text-[10px]' : ''} ${preset === '70x40' ? 'h-[155px] w-[260px] p-3 text-xs' : ''} ${preset === '100x50' ? 'h-[190px] w-[360px] p-4 text-sm' : ''} ${preset === 'A4-24' ? 'h-[135px] w-full rounded-lg p-2 text-xs' : 'rounded-md'} `}
              >
                {/* Header (Title & Subtitle) */}
                <div>
                  <div className="truncate text-center leading-tight font-bold text-slate-900">
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div className="mt-0.5 truncate text-center text-[10px] leading-tight text-slate-500">
                      {item.subtitle}
                    </div>
                  )}
                </div>

                {/* Barcode Vector Graphic */}
                <div className="my-auto flex items-center justify-center py-1">
                  <BarcodeSvg
                    value={item.barcodeValue}
                    text={item.displayCode}
                    height={preset === '100x50' ? 60 : preset === '70x40' ? 45 : 32}
                    showText={true}
                    className="max-h-full w-full"
                  />
                </div>

                {/* Footer (Secondary info / price) */}
                {item.secondaryInfo ? (
                  <div className="text-center text-[11px] leading-tight font-bold text-emerald-700">
                    {item.secondaryInfo}
                  </div>
                ) : (
                  <div className="h-1" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
