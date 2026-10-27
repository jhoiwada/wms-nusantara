import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { AppError, handleError } from '@/server/errors';
import { getAuditLogById } from '@/server/services/audit-log.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireRole(['ADMIN', 'MANAGER']);
    const { id } = await params;

    const auditLog = await getAuditLogById(id);
    if (!auditLog) {
      throw new AppError('NOT_FOUND', 'Catatan audit log tidak ditemukan');
    }

    return Response.json({ data: auditLog });
  } catch (error) {
    return handleError(error);
  }
}
