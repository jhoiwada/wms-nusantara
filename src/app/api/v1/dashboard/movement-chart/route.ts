import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { getMovementChart } from '@/server/services/dashboard.service';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);

    const { searchParams } = req.nextUrl;
    const range = (searchParams.get('range') as '7d' | '30d' | '90d') || '7d';
    const warehouseId = searchParams.get('warehouseId') || undefined;

    const data = await getMovementChart(range, warehouseId);
    return Response.json({ data });
  } catch (error) {
    return handleError(error);
  }
}
