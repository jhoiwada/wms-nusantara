import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { cancelGoodsReceipt } from '@/server/services/goods-receipt.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole(['ADMIN', 'MANAGER']);
    const { id } = await params;

    const cancelled = await cancelGoodsReceipt(id, session.id);
    return Response.json({
      data: cancelled,
      message: 'Dokumen penerimaan berhasil dibatalkan',
    });
  } catch (error) {
    return handleError(error);
  }
}
