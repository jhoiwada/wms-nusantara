import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { approveStockOpname } from '@/server/services/stock-opname.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    // BR-23: Hanya Manager atau Admin
    const session = await requireRole(['ADMIN', 'MANAGER']);
    const { id } = await params;

    const result = await approveStockOpname(id, {
      id: session.id,
      role: session.role,
    });
    return Response.json({ data: result });
  } catch (error) {
    return handleError(error);
  }
}
