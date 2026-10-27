import { jsPDF } from 'jspdf';
import { encodeCode128B } from '@/lib/barcode';
import { LABEL_PRESETS, type LabelItem, type LabelSizePreset } from '@/types/label';

/**
 * Draws a Code 128 barcode into jsPDF using crisp vector rectangles.
 */
function drawVectorBarcode(
  doc: jsPDF,
  barcodeValue: string,
  startX: number,
  startY: number,
  targetWidthMm: number,
  targetHeightMm: number,
): void {
  const encoded = encodeCode128B(barcodeValue, 8);
  if (!encoded.bars.length || encoded.totalModules <= 0) return;

  const moduleWidthMm = targetWidthMm / encoded.totalModules;

  // Set fill color to black
  doc.setFillColor(0, 0, 0);

  for (const bar of encoded.bars) {
    const x = startX + bar.x * moduleWidthMm;
    const w = bar.width * moduleWidthMm;
    doc.rect(x, startY, w, targetHeightMm, 'F');
  }
}

/**
 * Generates a jsPDF document containing all labels formatted to the chosen preset.
 */
export function generateLabelsPdf(items: LabelItem[], preset: LabelSizePreset = '70x40'): jsPDF {
  const config = LABEL_PRESETS[preset];

  // Flatten items according to their requested copies
  const expandedList: LabelItem[] = [];
  for (const item of items) {
    const count = Math.max(1, item.copies || 1);
    for (let c = 0; c < count; c++) {
      expandedList.push(item);
    }
  }

  if (expandedList.length === 0) {
    const emptyDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    emptyDoc.text('Tidak ada label untuk dicetak', 105, 50, { align: 'center' });
    return emptyDoc;
  }

  // Handle Sheet format (A4-24)
  if (config.isSheet) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const cols = config.columns ?? 3;
    const rows = config.rows ?? 8;
    const cellWidth = 63.5;
    const cellHeight = 33.8;
    const marginLeft = 7.5;
    const marginTop = 11.0;
    const gapX = 2.5;

    let currentIndex = 0;

    for (let i = 0; i < expandedList.length; i++) {
      if (i > 0 && i % (cols * rows) === 0) {
        doc.addPage('a4', 'portrait');
        currentIndex = 0;
      }

      const col = currentIndex % cols;
      const row = Math.floor(currentIndex / cols);

      const x = marginLeft + col * (cellWidth + gapX);
      const y = marginTop + row * cellHeight;

      // Draw light dashed border guide
      doc.setDrawColor(220, 225, 230);
      doc.setLineWidth(0.1);
      doc.rect(x, y, cellWidth, cellHeight);

      const item = expandedList[i];
      if (!item) continue;

      // Item Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      const title = doc.splitTextToSize(item.title, cellWidth - 6);
      doc.text(title[0] || '', x + cellWidth / 2, y + 5, { align: 'center' });

      // Subtitle / category
      if (item.subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(item.subtitle, x + cellWidth / 2, y + 8, { align: 'center' });
      }

      // Barcode
      const bcWidth = cellWidth - 10;
      const bcHeight = 12;
      const bcX = x + 5;
      const bcY = y + 10;
      drawVectorBarcode(doc, item.barcodeValue, bcX, bcY, bcWidth, bcHeight);

      // Display code
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(item.displayCode, x + cellWidth / 2, y + 26, { align: 'center' });

      // Secondary info / price
      if (item.secondaryInfo) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(16, 149, 107);
        doc.text(item.secondaryInfo, x + cellWidth / 2, y + 30, { align: 'center' });
      }

      currentIndex++;
    }

    return doc;
  }

  // Handle continuous thermal roll presets (50x30, 70x40, 100x50)
  const isLandscape = config.widthMm > config.heightMm;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [config.heightMm, config.widthMm],
  });

  expandedList.forEach((item, index) => {
    if (index > 0) {
      doc.addPage([config.heightMm, config.widthMm], isLandscape ? 'landscape' : 'portrait');
    }

    const w = config.widthMm;
    const h = config.heightMm;

    // Background border guide
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.1);
    doc.rect(1, 1, w - 2, h - 2);

    if (preset === '50x30') {
      // 50x30 Compact thermal
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      const title = doc.splitTextToSize(item.title, w - 4);
      doc.text(title[0] || '', w / 2, 4.5, { align: 'center' });

      if (item.subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text(item.subtitle, w / 2, 7.5, { align: 'center' });
      }

      // Barcode
      const bcY = item.subtitle ? 9 : 7;
      const bcHeight = 11;
      drawVectorBarcode(doc, item.barcodeValue, 3, bcY, w - 6, bcHeight);

      // Display code
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(item.displayCode, w / 2, bcY + bcHeight + 4, { align: 'center' });

      // Secondary info (price / UOM)
      if (item.secondaryInfo) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(16, 149, 107);
        doc.text(item.secondaryInfo, w / 2, h - 1.5, { align: 'center' });
      }
    } else if (preset === '70x40') {
      // 70x40 Standard thermal
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      const title = doc.splitTextToSize(item.title, w - 8);
      doc.text(title[0] || '', w / 2, 6, { align: 'center' });

      if (item.subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(item.subtitle, w / 2, 10, { align: 'center' });
      }

      // Barcode
      const bcY = item.subtitle ? 12 : 9;
      const bcHeight = 15;
      drawVectorBarcode(doc, item.barcodeValue, 5, bcY, w - 10, bcHeight);

      // Display code
      doc.setFont('courier', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(item.displayCode, w / 2, bcY + bcHeight + 5, { align: 'center' });

      // Secondary Info
      if (item.secondaryInfo) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(16, 149, 107);
        doc.text(item.secondaryInfo, w / 2, h - 2.5, { align: 'center' });
      }
    } else {
      // 100x50 Large Rack / Shipping label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      const title = doc.splitTextToSize(item.title, w - 12);
      doc.text(title[0] || '', w / 2, 8, { align: 'center' });

      if (item.subtitle) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(item.subtitle, w / 2, 13, { align: 'center' });
      }

      // Large Barcode
      const bcY = item.subtitle ? 16 : 12;
      const bcHeight = 20;
      drawVectorBarcode(doc, item.barcodeValue, 8, bcY, w - 16, bcHeight);

      // Display Code
      doc.setFont('courier', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(item.displayCode, w / 2, bcY + bcHeight + 6, { align: 'center' });

      // Secondary Info
      if (item.secondaryInfo) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(16, 149, 107);
        doc.text(item.secondaryInfo, w / 2, h - 3, { align: 'center' });
      }
    }
  });

  return doc;
}
