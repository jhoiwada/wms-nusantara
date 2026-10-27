import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { getCustomerReturnByRefNo } from '@/server/services/customer-return.service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ refNo: string }> }) {
  try {
    await requireRole(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);
    const { refNo } = await params;

    const result = await getCustomerReturnByRefNo(refNo);
    return Response.json({ data: result });
  } catch (error) {
    return handleError(error);
  }
}
