import { SignJWT, jwtVerify } from 'jose';
import type { Role } from '@prisma/client';
import { env } from '@/env';

export const SESSION_COOKIE_NAME = 'wms_session';
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 jam sesuai docs/SECURITY.md

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(env.AUTH_SECRET);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    });

    if (!payload.sub || typeof payload.email !== 'string' || typeof payload.role !== 'string') {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === 'string' ? payload.name : '',
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
