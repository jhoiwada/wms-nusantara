import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { getProductStockCard } from '@/server/services/stock.service';

interface RouteParams {
  params: Promise<{ productId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);
    const { productId } = await params;

    const { searchParams } = req.nextUrl;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const locationId = searchParams.get('locationId') || undefined;
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 50;

    const result = await getProductStockCard(productId, {
      from,
      to,
      locationId,
      warehouseId,
      page,
      pageSize,
    });

    return Response.json({ data: result });
  } catch (error) {
    return handleError(error);
  }
}
