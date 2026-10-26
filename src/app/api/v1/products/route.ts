import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { createProductSchema } from '@/schemas/product.schema';
import { listProducts, createProduct } from '@/server/services/product.service';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);

    const { searchParams } = req.nextUrl;
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 20;
    const q = searchParams.get('q') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const result = await listProducts({ page, pageSize, q, categoryId, activeOnly });
    return Response.json(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER']);

    const body: unknown = await req.json();
    const validated = createProductSchema.parse(body);

    const created = await createProduct(validated);
    return Response.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
