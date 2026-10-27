import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { getDeliveryOrderReturnDetails } from '@/server/services/customer-return.service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF']);
    const { id } = await params;

    const data = await getDeliveryOrderReturnDetails(id);
    return Response.json({ data });
  } catch (error) {
    return handleError(error);
  }
}
