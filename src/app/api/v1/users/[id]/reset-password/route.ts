import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { resetPasswordSchema } from '@/schemas/user.schema';
import { resetUserPassword } from '@/server/services/user.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole(['ADMIN']);
    const { id } = await params;

    let newPassword: string | undefined;
    try {
      const body: unknown = await req.json();
      const validated = resetPasswordSchema.parse(body);
      newPassword = validated.newPassword;
    } catch {
      // Body opsional, default ke Password123!
    }

    const result = await resetUserPassword(id, newPassword, {
      id: session.id,
      name: session.name,
      role: session.role,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return Response.json({ data: result });
  } catch (error) {
    return handleError(error);
  }
}
