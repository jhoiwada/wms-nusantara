import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { updateStockOpnameCountsSchema } from '@/schemas/stock-opname.schema';
import {
  getStockOpnameById,
  updateStockOpnameCounts,
  cancelStockOpname,
} from '@/server/services/stock-opname.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);
    const { id } = await params;

    const data = await getStockOpnameById(id);
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
    const validated = updateStockOpnameCountsSchema.parse(body);

    const updated = await updateStockOpnameCounts(id, validated, session.id);
    return Response.json({ data: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole(['ADMIN', 'MANAGER', 'STAFF']);
    const { id } = await params;

    const result = await cancelStockOpname(id, {
      id: session.id,
      role: session.role,
    });
    return Response.json({ data: result });
  } catch (error) {
    return handleError(error);
  }
}
