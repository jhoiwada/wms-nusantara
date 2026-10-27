import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { listAuditLogsQuerySchema } from '@/schemas/audit-log.schema';
import { listAuditLogs } from '@/server/services/audit-log.service';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'MANAGER']);

    const { searchParams } = req.nextUrl;
    const query = listAuditLogsQuerySchema.parse({
      entity: searchParams.get('entity') || undefined,
      action: searchParams.get('action') || undefined,
      userId: searchParams.get('userId') || undefined,
      search: searchParams.get('search') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
    });

    const result = await listAuditLogs(query);
    return Response.json(result);
  } catch (error) {
    return handleError(error);
  }
}
