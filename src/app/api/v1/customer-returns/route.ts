import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { createCustomerReturnSchema } from '@/schemas/customer-return.schema';
import {
  listCustomerReturns,
  createCustomerReturn,
} from '@/server/services/customer-return.service';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);

    const { searchParams } = req.nextUrl;
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 20;
    const q = searchParams.get('q') || undefined;
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const customerId = searchParams.get('customerId') || undefined;

    const result = await listCustomerReturns({
      page,
      pageSize,
      q,
      warehouseId,
      customerId,
    });

    return Response.json(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Viewer is not allowed to create returns (BR-35)
    const session = await requireRole(['ADMIN', 'MANAGER', 'STAFF']);
    const body = await req.json();
    const validated = createCustomerReturnSchema.parse(body);

    const result = await createCustomerReturn(validated, {
      id: session.id,
      role: session.role,
      name: session.name,
    });

    return Response.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
