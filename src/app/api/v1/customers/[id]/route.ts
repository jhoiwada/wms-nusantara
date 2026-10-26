import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { updateCustomerSchema } from '@/schemas/master.schema';
import {
  getCustomerById,
  updateCustomer,
  deactivateCustomer,
} from '@/server/services/customer.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);
    const { id } = await params;

    const data = await getCustomerById(id);
    return Response.json({ data });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireRole(['ADMIN', 'MANAGER']);
    const { id } = await params;

    const body: unknown = await req.json();
    const validated = updateCustomerSchema.parse(body);

    const updated = await updateCustomer(id, validated);
    return Response.json({ data: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireRole(['ADMIN', 'MANAGER']);
    const { id } = await params;

    // BR-31: Soft deactivation
    const deactivated = await deactivateCustomer(id);
    return Response.json({
      data: deactivated,
      message: 'Customer berhasil dinonaktifkan',
    });
  } catch (error) {
    return handleError(error);
  }
}
