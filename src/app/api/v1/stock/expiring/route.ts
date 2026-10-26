import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { getExpiringBatches } from '@/server/services/stock.service';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);

    const { searchParams } = req.nextUrl;
    const days = Number(searchParams.get('days')) || 30;
    const warehouseId = searchParams.get('warehouseId') || undefined;

    const data = await getExpiringBatches({ days, warehouseId });
    return Response.json({ data });
  } catch (error) {
    return handleError(error);
  }
}
