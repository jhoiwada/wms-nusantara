import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { updateWarehouseSchema } from '@/schemas/warehouse.schema';
import {
  getWarehouseById,
  updateWarehouse,
  deactivateWarehouse,
} from '@/server/services/warehouse.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);
    const { id } = await params;

    const data = await getWarehouseById(id);
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
    const validated = updateWarehouseSchema.parse(body);

    const updated = await updateWarehouse(id, validated);
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
    const deactivated = await deactivateWarehouse(id);
    return Response.json({
      data: deactivated,
      message: 'Gudang berhasil dinonaktifkan',
    });
  } catch (error) {
    return handleError(error);
  }
}
