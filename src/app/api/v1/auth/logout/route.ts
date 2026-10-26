import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/server/auth/session';
import { handleError } from '@/server/errors';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);

    return Response.json({
      data: { success: true },
    });
  } catch (error) {
    return handleError(error);
  }
}
