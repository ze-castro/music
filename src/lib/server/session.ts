import { SignJWT, jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db, schema } from './db';

const COOKIE = 'music_session';
const TTL_DAYS = 30;

function secret() {
  if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET not set');
  return new TextEncoder().encode(env.SESSION_SECRET);
}

// Session row in DB (revocable) + signed cookie carrying session id (tamper-proof).
export async function createSession(cookies: Cookies, userId: string) {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000);
  await db.insert(schema.sessions).values({ id, userId, expiresAt });

  const jwt = await new SignJWT({ sid: id })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresAt)
    .sign(secret());

  cookies.set(COOKIE, jwt, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE !== 'false', // dev compose sets false (Safari drops Secure cookies on http://localhost)
    expires: expiresAt
  });
}

export async function readSession(cookies: Cookies) {
  const raw = cookies.get(COOKIE);
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, secret());
    const sid = payload.sid as string;
    const row = await db.query.sessions.findFirst({ where: eq(schema.sessions.id, sid) });
    if (!row || row.expiresAt < new Date()) return null;
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, row.userId) });
    return user ? { session: row, user } : null;
  } catch {
    return null;
  }
}

export async function destroySession(cookies: Cookies) {
  const raw = cookies.get(COOKIE);
  if (raw) {
    try {
      const { payload } = await jwtVerify(raw, secret());
      await db.delete(schema.sessions).where(eq(schema.sessions.id, payload.sid as string));
    } catch {}
  }
  cookies.delete(COOKIE, { path: '/' });
}
