import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';
import { createUserSchema, listUsersQuerySchema } from '@/schemas/user.schema';
import { listUsers, createUser } from '@/server/services/user.service';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN']);

    const { searchParams } = req.nextUrl;
    const rawQuery = {
      q: searchParams.get('q') || undefined,
      role: searchParams.get('role') || undefined,
      isActive: searchParams.get('isActive') || undefined,
      page: searchParams.get('page') || 1,
      pageSize: searchParams.get('pageSize') || 20,
    };

    const validated = listUsersQuerySchema.parse(rawQuery);
    const result = await listUsers(validated);

    return Response.json(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);

    const body: unknown = await req.json();
    const validated = createUserSchema.parse(body);

    const created = await createUser(validated, {
      id: session.id,
      name: session.name,
      role: session.role,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return Response.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
