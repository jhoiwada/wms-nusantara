import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { updateLocationSchema } from '@/schemas/warehouse.schema';
import {
  getLocationById,
  updateLocation,
  deactivateLocation,
} from '@/server/services/location.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);
    const { id } = await params;

    const data = await getLocationById(id);
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
    const validated = updateLocationSchema.parse(body);

    const updated = await updateLocation(id, validated);
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
    const deactivated = await deactivateLocation(id);
    return Response.json({
      data: deactivated,
      message: 'Lokasi rak berhasil dinonaktifkan',
    });
  } catch (error) {
    return handleError(error);
  }
}
