import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { updateProductSchema } from '@/schemas/product.schema';
import {
  getProductById,
  updateProduct,
  deactivateProduct,
} from '@/server/services/product.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);
    const { id } = await params;

    const data = await getProductById(id);
    return Response.json({ data });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole(['ADMIN', 'MANAGER']);
    const { id } = await params;

    const body: unknown = await req.json();
    const validated = updateProductSchema.parse(body);

    const updated = await updateProduct(id, validated, {
      id: session.id,
      name: session.name,
      role: session.role,
    });
    return Response.json({ data: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole(['ADMIN', 'MANAGER']);
    const { id } = await params;

    // BR-31: Soft deactivation
    const deactivated = await deactivateProduct(id, {
      id: session.id,
      name: session.name,
      role: session.role,
    });
    return Response.json({
      data: deactivated,
      message: 'Produk berhasil dinonaktifkan',
    });
  } catch (error) {
    return handleError(error);
  }
}
