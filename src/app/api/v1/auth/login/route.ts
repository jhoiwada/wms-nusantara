import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { loginSchema } from '@/schemas/auth.schema';
import { getSessionCookieOptions } from '@/server/auth/session';
import { handleError } from '@/server/errors';
import { loginUser } from '@/server/services/auth.service';

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const validated = loginSchema.parse(body);

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const { token, user } = await loginUser(validated, clientIp);

    const cookieStore = await cookies();
    const cookieOptions = getSessionCookieOptions();

    cookieStore.set(cookieOptions.name, token, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge,
    });

    return Response.json({
      data: { user },
    });
  } catch (error) {
    return handleError(error);
  }
}
