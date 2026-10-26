import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError, AppError } from '@/server/errors';
import { getAvailableBatchesForDelivery } from '@/server/services/delivery-order.service';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);

    const { searchParams } = req.nextUrl;
    const productId = searchParams.get('productId');
    const locationId = searchParams.get('locationId');

    if (!productId || !locationId) {
      throw new AppError('VALIDATION_ERROR', 'Parameter productId dan locationId wajib disertakan');
    }

    const batches = await getAvailableBatchesForDelivery({ productId, locationId });
    return Response.json({ data: batches });
  } catch (error) {
    return handleError(error);
  }
}
