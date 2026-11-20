import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { updateUserSchema } from '@/schemas/user.schema';
import { getUserById, updateUser } from '@/server/services/user.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireRole(['ADMIN']);
    const { id } = await params;

    const data = await getUserById(id);
    return Response.json({ data });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole(['ADMIN']);
    const { id } = await params;

    const body: unknown = await req.json();
    const validated = updateUserSchema.parse(body);

    const updated = await updateUser(id, validated, {
      id: session.id,
      name: session.name,
      role: session.role,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return Response.json({ data: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole(['ADMIN']);
    const { id } = await params;

    // Soft deactivation (mengubah isActive: false)
    const deactivated = await updateUser(
      id,
      { isActive: false },
      {
        id: session.id,
        name: session.name,
        role: session.role,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      },
    );

    return Response.json({
      data: deactivated,
      message: 'Pengguna berhasil dinonaktifkan',
    });
  } catch (error) {
    return handleError(error);
  }
}
