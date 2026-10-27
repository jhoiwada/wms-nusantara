import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { getStockAdjustmentByRefNo } from '@/server/services/stock-adjustment.service';

interface RouteParams {
  params: Promise<{ refNo: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);
    const { refNo } = await params;

    const data = await getStockAdjustmentByRefNo(refNo);
    return Response.json({ data });
  } catch (error) {
    return handleError(error);
  }
}
