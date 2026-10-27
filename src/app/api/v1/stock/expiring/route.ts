import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { getExpiringBatches, type ExpiryStatus } from '@/server/services/stock.service';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);

    const { searchParams } = req.nextUrl;
    const days = searchParams.has('days') ? Number(searchParams.get('days')) : 30;
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const statusParam = searchParams.get('status')?.toUpperCase();
    const status = (
      statusParam && ['EXPIRED', 'CRITICAL', 'WARNING', 'SAFE'].includes(statusParam)
        ? statusParam
        : 'ALL'
    ) as 'ALL' | ExpiryStatus;
    const includeExpired = searchParams.get('includeExpired') !== 'false';

    const result = await getExpiringBatches({
      days,
      warehouseId,
      status,
      includeExpired,
    });

    return Response.json({
      data: result.items,
      meta: result.summary,
    });
  } catch (error) {
    return handleError(error);
  }
}
