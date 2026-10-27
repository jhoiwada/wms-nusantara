import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { listShippedDeliveryOrdersForReturn } from '@/server/services/customer-return.service';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF']);

    const { searchParams } = req.nextUrl;
    const q = searchParams.get('q') || undefined;
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const customerId = searchParams.get('customerId') || undefined;

    const data = await listShippedDeliveryOrdersForReturn({
      q,
      warehouseId,
      customerId,
    });

    return Response.json({ data });
  } catch (error) {
    return handleError(error);
  }
}
