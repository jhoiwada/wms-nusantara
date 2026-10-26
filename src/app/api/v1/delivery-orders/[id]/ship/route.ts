import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { shipDeliveryOrder } from '@/server/services/delivery-order.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole(['ADMIN', 'MANAGER', 'STAFF']);
    const { id } = await params;

    const shipped = await shipDeliveryOrder(id, session.id);
    return Response.json({
      data: shipped,
      message: 'Barang berhasil dikirim dan stok telah dikurangi',
    });
  } catch (error) {
    return handleError(error);
  }
}
