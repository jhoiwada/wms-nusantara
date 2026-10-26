import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import {
  getStockSummaryByProduct,
  getStockSummaryByLocation,
} from '@/server/services/stock.service';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);

    const { searchParams } = req.nextUrl;
    const groupBy = searchParams.get('groupBy') || 'product';
    const q = searchParams.get('q') || undefined;
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const zone = searchParams.get('zone') || undefined;
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 20;

    if (groupBy === 'location') {
      const result = await getStockSummaryByLocation({
        warehouseId,
        zone,
        q,
        page,
        pageSize,
      });
      return Response.json(result);
    }

    const result = await getStockSummaryByProduct({
      q,
      categoryId,
      warehouseId,
      lowStockOnly,
      page,
      pageSize,
    });

    return Response.json(result);
  } catch (error) {
    return handleError(error);
  }
}
