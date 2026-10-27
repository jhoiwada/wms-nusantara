import { prisma } from '@/server/db';
import type { Prisma } from '@prisma/client';
import type { MovementType } from '@/types/document';
import type { MovementsReportQuery, InventoryValueReportQuery } from '@/schemas/report.schema';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const INCOMING_TYPES = new Set<MovementType>(['IN', 'ADJUST_IN', 'TRANSFER_IN']);

export interface MovementReportItem {
  id: string;
  createdAt: string;
  refNo: string;
  refType: string;
  movementType: MovementType;
  product: {
    id: string;
    sku: string;
    name: string;
    uom: string;
    categoryName?: string;
  };
  location: {
    id: string;
    code: string;
    warehouse: {
      id: string;
      code: string;
      name: string;
    };
  };
  batch: {
    id: string;
    batchNo: string;
    expiryDate: string | null;
  };
  quantity: number;
  signedQuantity: number;
  balanceAfter: number;
  user: {
    id: string;
    name: string;
    email: string;
  };
  notes: string | null;
}

export interface MovementsReportSummary {
  totalMovements: number;
  totalInQty: number;
  totalOutQty: number;
  netQty: number;
}

export interface MovementsReportResult {
  items: MovementReportItem[];
  summary: MovementsReportSummary;
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface InventoryValueProductItem {
  productId: string;
  sku: string;
  name: string;
  uom: string;
  categoryName: string;
  minStock: number;
  costPrice: number;
  totalQuantity: number;
  availableQuantity: number;
  expiredQuantity: number;
  totalValue: number;
  isLowStock: boolean;
  warehouses: {
    id: string;
    code: string;
    name: string;
    quantity: number;
    value: number;
  }[];
}

export interface InventoryValueWarehouseSummary {
  id: string;
  code: string;
  name: string;
  totalUnits: number;
  totalValue: number;
}

export interface InventoryValueReportSummary {
  totalInventoryValue: number;
  totalPhysicalUnits: number;
  totalSkus: number;
  lowStockSkus: number;
  outOfStockSkus: number;
  warehouseBreakdown: InventoryValueWarehouseSummary[];
}

export interface InventoryValueReportResult {
  items: InventoryValueProductItem[];
  summary: InventoryValueReportSummary;
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Mengambil data laporan mutasi stok berdasarkan filter
 */
export async function getMovementsReportData(
  query: MovementsReportQuery,
  isExport = false,
): Promise<MovementsReportResult> {
  const where: Prisma.StockMovementWhereInput = {};

  if (query.productId) {
    where.productId = query.productId;
  }

  if (query.type) {
    where.movementType = query.type;
  }

  if (query.warehouseId) {
    where.location = { warehouseId: query.warehouseId };
  }

  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) {
      const fromDate = new Date(query.from);
      fromDate.setHours(0, 0, 0, 0);
      where.createdAt.gte = fromDate;
    }
    if (query.to) {
      const toDate = new Date(query.to);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  }

  // Hitung total dan agregat kuantitas
  const [totalCount, allMatching] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      select: {
        movementType: true,
        quantity: true,
      },
    }),
  ]);

  let totalInQty = 0;
  let totalOutQty = 0;
  for (const m of allMatching) {
    if (INCOMING_TYPES.has(m.movementType as MovementType)) {
      totalInQty += m.quantity;
    } else {
      totalOutQty += m.quantity;
    }
  }

  const page = query.page || 1;
  const pageSize = isExport ? 5000 : query.pageSize || 50;
  const skip = isExport ? 0 : (page - 1) * pageSize;

  const movements = await prisma.stockMovement.findMany({
    where,
    include: {
      product: {
        include: {
          category: {
            select: { name: true },
          },
        },
      },
      location: {
        include: {
          warehouse: {
            select: { id: true, code: true, name: true },
          },
        },
      },
      batch: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: pageSize,
  });

  const items: MovementReportItem[] = movements.map((m) => {
    const isIncoming = INCOMING_TYPES.has(m.movementType as MovementType);
    return {
      id: m.id,
      createdAt: m.createdAt.toISOString(),
      refNo: m.refNo,
      refType: m.refType,
      movementType: m.movementType as MovementType,
      product: {
        id: m.product.id,
        sku: m.product.sku,
        name: m.product.name,
        uom: m.product.uom,
        categoryName: m.product.category?.name,
      },
      location: {
        id: m.location.id,
        code: m.location.code,
        warehouse: {
          id: m.location.warehouse.id,
          code: m.location.warehouse.code,
          name: m.location.warehouse.name,
        },
      },
      batch: {
        id: m.batch.id,
        batchNo: m.batch.batchNo,
        expiryDate: m.batch.expiryDate ? m.batch.expiryDate.toISOString() : null,
      },
      quantity: m.quantity,
      signedQuantity: isIncoming ? m.quantity : -m.quantity,
      balanceAfter: m.balanceAfter,
      user: {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
      },
      notes: m.notes,
    };
  });

  return {
    items,
    summary: {
      totalMovements: totalCount,
      totalInQty,
      totalOutQty,
      netQty: totalInQty - totalOutQty,
    },
    meta: {
      page,
      pageSize,
      total: totalCount,
      totalPages: Math.ceil(totalCount / pageSize) || 1,
    },
  };
}

/**
 * Mengambil data laporan nilai persediaan berdasarkan filter
 */
export async function getInventoryValueReportData(
  query: InventoryValueReportQuery,
  isExport = false,
): Promise<InventoryValueReportResult> {
  const whereProduct: Prisma.ProductWhereInput = {
    isActive: true,
  };

  if (query.categoryId) {
    whereProduct.categoryId = query.categoryId;
  }

  if (query.search?.trim()) {
    const s = query.search.trim();
    whereProduct.OR = [
      { sku: { contains: s, mode: 'insensitive' } },
      { name: { contains: s, mode: 'insensitive' } },
      { barcode: { contains: s, mode: 'insensitive' } },
    ];
  }

  const [totalSkus, warehouses, products] = await Promise.all([
    prisma.product.count({ where: whereProduct }),
    prisma.warehouse.findMany({
      where: query.warehouseId ? { id: query.warehouseId } : { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    }),
    prisma.product.findMany({
      where: whereProduct,
      include: {
        category: {
          select: { name: true },
        },
        stocks: {
          where: query.warehouseId ? { location: { warehouseId: query.warehouseId } } : undefined,
          include: {
            batch: true,
            location: {
              include: {
                warehouse: {
                  select: { id: true, code: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { sku: 'asc' },
      skip: isExport ? 0 : ((query.page || 1) - 1) * (query.pageSize || 50),
      take: isExport ? 5000 : query.pageSize || 50,
    }),
  ]);

  const now = new Date();
  const whMap = new Map<string, { totalUnits: number; totalValue: number }>();
  for (const w of warehouses) {
    whMap.set(w.id, { totalUnits: 0, totalValue: 0 });
  }

  let totalInventoryValue = 0;
  let totalPhysicalUnits = 0;
  let lowStockSkus = 0;
  let outOfStockSkus = 0;

  const items: InventoryValueProductItem[] = products.map((prod) => {
    let totalQty = 0;
    let availableQty = 0;
    let expiredQty = 0;
    const costPrice = Number(prod.costPrice) || 0;

    const prodWhMap = new Map<
      string,
      { id: string; code: string; name: string; quantity: number; value: number }
    >();
    for (const w of warehouses) {
      prodWhMap.set(w.id, { id: w.id, code: w.code, name: w.name, quantity: 0, value: 0 });
    }

    for (const s of prod.stocks) {
      totalQty += s.quantity;
      const isExpired = s.batch.expiryDate ? s.batch.expiryDate < now : false;
      if (isExpired) {
        expiredQty += s.quantity;
      } else {
        availableQty += s.quantity;
      }

      const whId = s.location.warehouse.id;
      const existing = prodWhMap.get(whId);
      if (existing) {
        existing.quantity += s.quantity;
        existing.value += s.quantity * costPrice;
      }

      const globalWh = whMap.get(whId);
      if (globalWh) {
        globalWh.totalUnits += s.quantity;
        globalWh.totalValue += s.quantity * costPrice;
      }
    }

    const totalVal = totalQty * costPrice;
    totalInventoryValue += totalVal;
    totalPhysicalUnits += totalQty;

    const isLowStock = totalQty <= prod.minStock;
    if (isLowStock) lowStockSkus++;
    if (totalQty === 0) outOfStockSkus++;

    return {
      productId: prod.id,
      sku: prod.sku,
      name: prod.name,
      uom: prod.uom,
      categoryName: prod.category?.name || 'Tanpa Kategori',
      minStock: prod.minStock,
      costPrice,
      totalQuantity: totalQty,
      availableQuantity: availableQty,
      expiredQuantity: expiredQty,
      totalValue: totalVal,
      isLowStock,
      warehouses: Array.from(prodWhMap.values()),
    };
  });

  const warehouseBreakdown: InventoryValueWarehouseSummary[] = warehouses.map((w) => {
    const stats = whMap.get(w.id) || { totalUnits: 0, totalValue: 0 };
    return {
      id: w.id,
      code: w.code,
      name: w.name,
      totalUnits: stats.totalUnits,
      totalValue: stats.totalValue,
    };
  });

  return {
    items,
    summary: {
      totalInventoryValue,
      totalPhysicalUnits,
      totalSkus,
      lowStockSkus,
      outOfStockSkus,
      warehouseBreakdown,
    },
    meta: {
      page: query.page || 1,
      pageSize: isExport ? 5000 : query.pageSize || 50,
      total: totalSkus,
      totalPages: Math.ceil(totalSkus / (isExport ? 5000 : query.pageSize || 50)) || 1,
    },
  };
}

/**
 * Generate Excel (.xlsx) untuk Laporan Pergerakan Stok
 */
export async function generateMovementsExcel(
  result: MovementsReportResult,
  filterInfo?: { warehouseName?: string; dateRangeText?: string },
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Distribusi WMS Jakarta & Bekasi';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Laporan Mutasi', {
    views: [{ state: 'frozen', ySplit: 7 }],
  });

  // Judul & Header Laporan
  ws.mergeCells('A1:L1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'DISTRIBUSI WMS — LAPORAN MUTASI & PERGERAKAN STOK';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 30;

  // Metadata Filter
  ws.getCell('A2').value = 'Gudang:';
  ws.getCell('B2').value = filterInfo?.warehouseName || 'Semua Gudang (Jakarta & Bekasi)';
  ws.getCell('A3').value = 'Periode:';
  ws.getCell('B3').value = filterInfo?.dateRangeText || 'Semua Waktu';
  ws.getCell('A4').value = 'Dicetak Pada:';
  ws.getCell('B4').value =
    new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';

  // Ringkasan KPI
  ws.getCell('D2').value = 'Total Mutasi:';
  ws.getCell('E2').value = result.summary.totalMovements;
  ws.getCell('D3').value = 'Total Masuk:';
  ws.getCell('E3').value = result.summary.totalInQty;
  ws.getCell('G2').value = 'Total Keluar:';
  ws.getCell('H2').value = result.summary.totalOutQty;
  ws.getCell('G3').value = 'Perubahan Bersih:';
  ws.getCell('H3').value = result.summary.netQty;

  ['A2', 'A3', 'A4', 'D2', 'D3', 'G2', 'G3'].forEach((c) => {
    ws.getCell(c).font = { bold: true, size: 9 };
  });

  // Table Headers
  const headers = [
    'No',
    'Tanggal & Waktu',
    'No. Referensi',
    'Tipe Dokumen',
    'Tipe Mutasi',
    'SKU',
    'Nama Produk',
    'Gudang',
    'Lokasi Rak',
    'No. Batch',
    'Tgl Expired',
    'Kuantitas',
    'Saldo Berjalan',
    'Operator',
    'Catatan',
  ];

  const headerRow = ws.getRow(7);
  headerRow.values = headers;
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Data Rows
  result.items.forEach((item, idx) => {
    const row = ws.addRow([
      idx + 1,
      new Date(item.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      item.refNo,
      item.refType,
      item.movementType,
      item.product.sku,
      item.product.name,
      item.location.warehouse.name,
      item.location.code,
      item.batch.batchNo,
      item.batch.expiryDate ? new Date(item.batch.expiryDate).toLocaleDateString('id-ID') : '-',
      item.signedQuantity,
      item.balanceAfter,
      item.user.name,
      item.notes || '-',
    ]);

    row.height = 20;
    const isEven = idx % 2 === 0;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      }

      // Format alignment & color for quantity
      if (colNumber === 12) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (item.signedQuantity > 0) {
          cell.font = { color: { argb: 'FF047857' }, bold: true };
        } else {
          cell.font = { color: { argb: 'FFB91C1C' }, bold: true };
        }
      } else if (colNumber === 1 || colNumber === 13) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });
  });

  // Auto-fit column widths
  ws.columns = [
    { width: 5 }, // No
    { width: 18 }, // Tanggal
    { width: 16 }, // Ref No
    { width: 16 }, // Ref Type
    { width: 14 }, // Movement Type
    { width: 14 }, // SKU
    { width: 28 }, // Nama Produk
    { width: 20 }, // Gudang
    { width: 12 }, // Rak
    { width: 14 }, // Batch
    { width: 13 }, // Expired
    { width: 12 }, // Qty
    { width: 14 }, // Saldo
    { width: 18 }, // Operator
    { width: 25 }, // Catatan
  ];

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate PDF (.pdf) untuk Laporan Pergerakan Stok
 */
export async function generateMovementsPdf(
  result: MovementsReportResult,
  filterInfo?: { warehouseName?: string; dateRangeText?: string },
): Promise<Buffer> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DISTRIBUSI WMS — LAPORAN MUTASI STOK', 14, 15);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Gudang: ${filterInfo?.warehouseName || 'Semua Gudang'} | Periode: ${filterInfo?.dateRangeText || 'Semua Waktu'} | Dicetak: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
    14,
    21,
  );
  doc.text(
    `Total Mutasi: ${result.summary.totalMovements} | Masuk: +${result.summary.totalInQty} | Keluar: -${result.summary.totalOutQty} | Net: ${result.summary.netQty >= 0 ? '+' : ''}${result.summary.netQty}`,
    14,
    26,
  );

  const tableRows = result.items.map((item, idx) => [
    idx + 1,
    new Date(item.createdAt).toLocaleDateString('id-ID') +
      ' ' +
      new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    item.refNo,
    item.movementType,
    item.product.sku,
    item.product.name.length > 25 ? item.product.name.slice(0, 23) + '...' : item.product.name,
    item.location.warehouse.code,
    item.location.code,
    item.batch.batchNo,
    item.signedQuantity > 0 ? `+${item.signedQuantity}` : `${item.signedQuantity}`,
    item.balanceAfter,
    item.user.name.split(' ')[0] ?? item.user.name,
  ]);

  autoTable(doc, {
    startY: 30,
    head: [
      [
        'No',
        'Waktu',
        'No. Ref',
        'Tipe',
        'SKU',
        'Produk',
        'Gudang',
        'Rak',
        'Batch',
        'Qty',
        'Saldo',
        'Petugas',
      ],
    ],
    body: tableRows,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center' },
      3: { halign: 'center' },
      9: { halign: 'right' },
      10: { halign: 'right' },
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        `Halaman ${data.pageNumber} dari ${pageCount}`,
        doc.internal.pageSize.width - 30,
        doc.internal.pageSize.height - 8,
      );
    },
  });

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Generate Excel (.xlsx) untuk Laporan Nilai Persediaan
 */
export async function generateInventoryValueExcel(
  result: InventoryValueReportResult,
  filterInfo?: { warehouseName?: string },
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Distribusi WMS Jakarta & Bekasi';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Nilai Persediaan', {
    views: [{ state: 'frozen', ySplit: 7 }],
  });

  // Header Title
  ws.mergeCells('A1:J1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'DISTRIBUSI WMS — LAPORAN NILAI PERSEDIAAN BARANG';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 30;

  // Metadata Filter & Summary
  ws.getCell('A2').value = 'Gudang:';
  ws.getCell('B2').value = filterInfo?.warehouseName || 'Semua Gudang (Konsolidasi)';
  ws.getCell('A3').value = 'Dicetak Pada:';
  ws.getCell('B3').value =
    new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';

  ws.getCell('D2').value = 'Total Nilai (IDR):';
  ws.getCell('E2').value = result.summary.totalInventoryValue;
  ws.getCell('E2').numFmt = '#,##0';
  ws.getCell('D3').value = 'Total Unit Fisik:';
  ws.getCell('E3').value = result.summary.totalPhysicalUnits;

  ws.getCell('G2').value = 'Total SKU:';
  ws.getCell('H2').value = result.summary.totalSkus;
  ws.getCell('G3').value = 'SKU Menipis / Habis:';
  ws.getCell('H3').value =
    `${result.summary.lowStockSkus} (${result.summary.outOfStockSkus} habis)`;

  ['A2', 'A3', 'D2', 'D3', 'G2', 'G3'].forEach((c) => {
    ws.getCell(c).font = { bold: true, size: 9 };
  });

  // Headers
  const headers = [
    'No',
    'SKU',
    'Nama Produk',
    'Kategori',
    'Satuan',
    'Min Stok',
    'Stok Fisik',
    'Harga Pokok (IDR)',
    'Total Nilai (IDR)',
    'Status Stok',
  ];

  const headerRow = ws.getRow(7);
  headerRow.values = headers;
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  result.items.forEach((item, idx) => {
    const statusText = item.totalQuantity === 0 ? 'HABIS' : item.isLowStock ? 'MENIPIS' : 'NORMAL';

    const row = ws.addRow([
      idx + 1,
      item.sku,
      item.name,
      item.categoryName,
      item.uom,
      item.minStock,
      item.totalQuantity,
      item.costPrice,
      item.totalValue,
      statusText,
    ]);

    row.height = 20;
    const isEven = idx % 2 === 0;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      }

      if (colNumber === 8 || colNumber === 9) {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (colNumber === 6 || colNumber === 7) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (colNumber === 10) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (statusText === 'HABIS') {
          cell.font = { color: { argb: 'FFDC2626' }, bold: true };
        } else if (statusText === 'MENIPIS') {
          cell.font = { color: { argb: 'FFD97706' }, bold: true };
        } else {
          cell.font = { color: { argb: 'FF059669' } };
        }
      }
    });
  });

  // Total Summary Footer Row
  const totalRow = ws.addRow([
    '',
    'TOTAL KESELURUHAN',
    '',
    '',
    '',
    '',
    result.summary.totalPhysicalUnits,
    '',
    result.summary.totalInventoryValue,
    '',
  ]);
  totalRow.height = 22;
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };
    if (colNumber === 9) {
      cell.numFmt = '#,##0';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else if (colNumber === 7) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
  });

  ws.columns = [
    { width: 5 }, // No
    { width: 14 }, // SKU
    { width: 30 }, // Nama Produk
    { width: 18 }, // Kategori
    { width: 10 }, // UOM
    { width: 12 }, // Min Stok
    { width: 14 }, // Stok Fisik
    { width: 18 }, // Harga Pokok
    { width: 22 }, // Total Nilai
    { width: 14 }, // Status
  ];

  // Sheet 2: Breakdown per Gudang
  const wsWh = workbook.addWorksheet('Rincian per Gudang');
  wsWh.mergeCells('A1:D1');
  wsWh.getCell('A1').value = 'RINGKASAN NILAI PERSEDIAAN PER GUDANG';
  wsWh.getCell('A1').font = { bold: true, size: 12 };

  wsWh.getRow(3).values = ['Kode Gudang', 'Nama Gudang', 'Total Unit Fisik', 'Total Nilai (IDR)'];
  wsWh.getRow(3).font = { bold: true };

  result.summary.warehouseBreakdown.forEach((w) => {
    const row = wsWh.addRow([w.code, w.name, w.totalUnits, w.totalValue]);
    row.getCell(4).numFmt = '#,##0';
  });

  wsWh.columns = [{ width: 15 }, { width: 30 }, { width: 18 }, { width: 25 }];

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate PDF (.pdf) untuk Laporan Nilai Persediaan
 */
export async function generateInventoryValuePdf(
  result: InventoryValueReportResult,
  filterInfo?: { warehouseName?: string },
): Promise<Buffer> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Title Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DISTRIBUSI WMS — LAPORAN NILAI PERSEDIAAN', 14, 15);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  });

  doc.text(
    `Gudang: ${filterInfo?.warehouseName || 'Semua Gudang'} | Dicetak: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
    14,
    21,
  );
  doc.text(
    `Total Nilai: ${currencyFormatter.format(result.summary.totalInventoryValue)} | Total Unit: ${result.summary.totalPhysicalUnits.toLocaleString('id-ID')} | Total SKU: ${result.summary.totalSkus} | Menipis: ${result.summary.lowStockSkus} (${result.summary.outOfStockSkus} habis)`,
    14,
    26,
  );

  const tableRows = result.items.map((item, idx) => {
    const statusText = item.totalQuantity === 0 ? 'HABIS' : item.isLowStock ? 'MENIPIS' : 'NORMAL';

    return [
      idx + 1,
      item.sku,
      item.name.length > 30 ? item.name.slice(0, 28) + '...' : item.name,
      item.categoryName,
      item.uom,
      item.totalQuantity.toLocaleString('id-ID'),
      currencyFormatter.format(item.costPrice),
      currencyFormatter.format(item.totalValue),
      statusText,
    ];
  });

  autoTable(doc, {
    startY: 30,
    head: [
      [
        'No',
        'SKU',
        'Nama Produk',
        'Kategori',
        'UOM',
        'Stok',
        'Harga Pokok',
        'Total Nilai',
        'Status',
      ],
    ],
    body: tableRows,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 1.5,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'center' },
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        `Halaman ${data.pageNumber} dari ${pageCount}`,
        doc.internal.pageSize.width - 30,
        doc.internal.pageSize.height - 8,
      );
    },
  });

  return Buffer.from(doc.output('arraybuffer'));
}
