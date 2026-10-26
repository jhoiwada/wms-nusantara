import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { verifyStockConsistency } from '@/server/services/stock.service';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);

    const { searchParams } = req.nextUrl;
    const productId = searchParams.get('productId') || undefined;

    const audit = await verifyStockConsistency(productId);
    return Response.json({ data: audit });
  } catch (error) {
    return handleError(error);
  }
}
