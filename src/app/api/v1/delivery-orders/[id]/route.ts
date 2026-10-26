import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { updateDeliveryOrderSchema } from '@/schemas/delivery-order.schema';
import {
  getDeliveryOrderById,
  updateDeliveryOrder,
} from '@/server/services/delivery-order.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);
    const { id } = await params;

    const data = await getDeliveryOrderById(id);
    return Response.json({ data });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole(['ADMIN', 'MANAGER', 'STAFF']);
    const { id } = await params;

    const body: unknown = await req.json();
    const validated = updateDeliveryOrderSchema.parse(body);

    const updated = await updateDeliveryOrder(id, validated, session.id);
    return Response.json({ data: updated });
  } catch (error) {
    return handleError(error);
  }
}
