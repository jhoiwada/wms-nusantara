import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { createStockOpnameSchema } from '@/schemas/stock-opname.schema';
import { listStockOpnames, createStockOpname } from '@/server/services/stock-opname.service';
import type { StockOpnameStatus } from '@/types/document';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);

    const { searchParams } = req.nextUrl;
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 20;
    const q = searchParams.get('q') || undefined;
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const status = (searchParams.get('status') as StockOpnameStatus) || undefined;

    const result = await listStockOpnames({
      page,
      pageSize,
      q,
      warehouseId,
      status,
    });

    return Response.json(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'MANAGER', 'STAFF']);

    const body: unknown = await req.json();
    const validated = createStockOpnameSchema.parse(body);

    const created = await createStockOpname(validated, session.id);
    return Response.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
