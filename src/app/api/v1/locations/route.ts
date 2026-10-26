import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { createLocationSchema } from '@/schemas/warehouse.schema';
import { listLocations, createLocation } from '@/server/services/location.service';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);

    const { searchParams } = req.nextUrl;
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 20;
    const q = searchParams.get('q') || undefined;
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const isFrozen =
      searchParams.get('isFrozen') === 'true'
        ? true
        : searchParams.get('isFrozen') === 'false'
          ? false
          : undefined;

    const result = await listLocations({
      page,
      pageSize,
      q,
      warehouseId,
      activeOnly,
      isFrozen,
    });
    return Response.json(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER']);

    const body: unknown = await req.json();
    const validated = createLocationSchema.parse(body);

    const created = await createLocation(validated);
    return Response.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
