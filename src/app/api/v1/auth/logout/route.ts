import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAME } from '@/server/auth/session';
import { handleError } from '@/server/errors';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);

    return redirect('/login');
  } catch (error) {
    return handleError(error);
  }
}

// Support GET for direct link navigation (e.g. logout link)
export async function GET() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);

    return redirect('/login');
  } catch (error) {
    return handleError(error);
  }
}
