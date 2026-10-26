import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { receiveGoodsReceipt } from '@/server/services/goods-receipt.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole(['ADMIN', 'MANAGER', 'STAFF']);
    const { id } = await params;

    const received = await receiveGoodsReceipt(id, session.id);
    return Response.json({
      data: received,
      message: 'Barang berhasil diterima dan stok telah bertambah',
    });
  } catch (error) {
    return handleError(error);
  }
}
