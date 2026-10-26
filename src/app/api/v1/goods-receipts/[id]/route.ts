import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { updateGoodsReceiptSchema } from '@/schemas/goods-receipt.schema';
import { getGoodsReceiptById, updateGoodsReceipt } from '@/server/services/goods-receipt.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);
    const { id } = await params;

    const data = await getGoodsReceiptById(id);
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
    const validated = updateGoodsReceiptSchema.parse(body);

    const updated = await updateGoodsReceipt(id, validated, session.id);
    return Response.json({ data: updated });
  } catch (error) {
    return handleError(error);
  }
}
