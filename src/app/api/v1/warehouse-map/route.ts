import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { getWarehouseMapData } from '@/server/services/warehouse-map.service';

export async function GET(req: NextRequest) {
  try {
    // All roles can view warehouse map layout and stock locations
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);

    const { searchParams } = req.nextUrl;
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const zone = searchParams.get('zone') || undefined;
    const q = searchParams.get('q') || undefined;

    const result = await getWarehouseMapData({
      warehouseId,
      zone,
      q,
    });

    return Response.json({
      data: result,
    });
  } catch (error) {
    return handleError(error);
  }
}
