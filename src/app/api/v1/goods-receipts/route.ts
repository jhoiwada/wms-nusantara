import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { createGoodsReceiptSchema } from '@/schemas/goods-receipt.schema';
import { listGoodsReceipts, createGoodsReceipt } from '@/server/services/goods-receipt.service';
import type { GoodsReceiptStatus } from '@/types/document';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);

    const { searchParams } = req.nextUrl;
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 20;
    const q = searchParams.get('q') || undefined;
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const supplierId = searchParams.get('supplierId') || undefined;
    const status = (searchParams.get('status') as GoodsReceiptStatus) || undefined;

    const result = await listGoodsReceipts({
      page,
      pageSize,
      q,
      warehouseId,
      supplierId,
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
    const validated = createGoodsReceiptSchema.parse(body);

    const created = await createGoodsReceipt(validated, session.id);
    return Response.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
