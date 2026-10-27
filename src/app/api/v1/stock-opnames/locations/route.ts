import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError, AppError } from '@/server/errors';
import { getWarehouseLocationsForOpname } from '@/server/services/stock-opname.service';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF']);

    const { searchParams } = req.nextUrl;
    const warehouseId = searchParams.get('warehouseId');

    if (!warehouseId) {
      throw new AppError('VALIDATION_ERROR', 'Parameter warehouseId wajib disertakan');
    }

    const locations = await getWarehouseLocationsForOpname(warehouseId);
    return Response.json({ data: locations });
  } catch (error) {
    return handleError(error);
  }
}
