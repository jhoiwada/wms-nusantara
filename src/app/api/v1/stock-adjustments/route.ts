import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { createStockAdjustmentSchema } from '@/schemas/stock-adjustment.schema';
import {
  listStockAdjustments,
  createStockAdjustment,
} from '@/server/services/stock-adjustment.service';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);

    const { searchParams } = req.nextUrl;
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 20;
    const q = searchParams.get('q') || undefined;
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const productId = searchParams.get('productId') || undefined;
    const movementType =
      (searchParams.get('movementType') as 'ADJUST_IN' | 'ADJUST_OUT') || undefined;

    const result = await listStockAdjustments({
      page,
      pageSize,
      q,
      warehouseId,
      productId,
      movementType,
    });

    return Response.json(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // BR-26: Hanya oleh Manager atau Admin
    const session = await requireRole(['ADMIN', 'MANAGER']);

    const body: unknown = await req.json();
    const validated = createStockAdjustmentSchema.parse(body);

    const created = await createStockAdjustment(validated, {
      id: session.id,
      role: session.role,
      name: session.name,
    });

    return Response.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
