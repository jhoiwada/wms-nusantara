import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { AppError, handleError } from '@/server/errors';
import { inventoryValueReportQuerySchema } from '@/schemas/report.schema';
import {
  getInventoryValueReportData,
  generateInventoryValueExcel,
  generateInventoryValuePdf,
} from '@/server/services/report.service';

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);

    const { searchParams } = req.nextUrl;
    const query = inventoryValueReportQuerySchema.parse({
      warehouseId: searchParams.get('warehouseId') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      search: searchParams.get('search') || undefined,
      format: searchParams.get('format') || 'json',
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
    });

    const isExport = query.format === 'xlsx' || query.format === 'pdf';

    // Aturan Hak Akses: Ekspor laporan hanya untuk Admin & Manager (SECURITY.md)
    if (isExport && session.role !== 'ADMIN' && session.role !== 'MANAGER') {
      throw new AppError(
        'FORBIDDEN',
        'Hanya Admin dan Manager yang berhak mengekspor laporan (SECURITY.md)',
      );
    }

    const data = await getInventoryValueReportData(query, isExport);

    if (query.format === 'xlsx') {
      const buffer = await generateInventoryValueExcel(data);

      const today = new Date().toISOString().slice(0, 10);
      return new Response(buffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="laporan-nilai-persediaan-${today}.xlsx"`,
        },
      });
    }

    if (query.format === 'pdf') {
      const buffer = await generateInventoryValuePdf(data);

      const today = new Date().toISOString().slice(0, 10);
      return new Response(buffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="laporan-nilai-persediaan-${today}.pdf"`,
        },
      });
    }

    return Response.json({ data });
  } catch (error) {
    return handleError(error);
  }
}
