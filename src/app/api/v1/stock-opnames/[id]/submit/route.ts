import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { submitStockOpname } from '@/server/services/stock-opname.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole(['ADMIN', 'MANAGER', 'STAFF']);
    const { id } = await params;

    const updated = await submitStockOpname(id, session.id);
    return Response.json({ data: updated });
  } catch (error) {
    return handleError(error);
  }
}
