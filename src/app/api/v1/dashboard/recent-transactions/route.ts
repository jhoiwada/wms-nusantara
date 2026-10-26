import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { getRecentTransactions } from '@/server/services/dashboard.service';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);

    const { searchParams } = req.nextUrl;
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 10, 1), 50);
    const warehouseId = searchParams.get('warehouseId') || undefined;

    const data = await getRecentTransactions(limit, warehouseId);
    return Response.json({ data });
  } catch (error) {
    return handleError(error);
  }
}
