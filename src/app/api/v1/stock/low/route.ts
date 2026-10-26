import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { getLowStockProducts } from '@/server/services/stock.service';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);

    const { searchParams } = req.nextUrl;
    const warehouseId = searchParams.get('warehouseId') || undefined;

    const data = await getLowStockProducts({ warehouseId });
    return Response.json({ data });
  } catch (error) {
    return handleError(error);
  }
}
