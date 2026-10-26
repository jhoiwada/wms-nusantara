import { requireAuth } from '@/server/auth/rbac';
import { handleError } from '@/server/errors';

export async function GET(_req: Request) {
  try {
    const user = await requireAuth();

    return Response.json({
      data: { user },
    });
  } catch (error) {
    return handleError(error);
  }
}
