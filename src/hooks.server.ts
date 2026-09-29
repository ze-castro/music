import type { Handle, ServerInit } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { readSession } from '$lib/server/session';
import { initDb } from '$lib/server/db';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

export const init: ServerInit = async () => {
  // Without a pinned server, the login form makes this server fetch any URL a visitor types (SSRF).
  if (!dev && !env.NAVIDROME_URL && env.ALLOW_ANY_SERVER !== 'true') {
    throw new Error('NAVIDROME_URL must be set in production (or ALLOW_ANY_SERVER=true to opt out).');
  }
  await initDb();
};

const PUBLIC = new Set(['/login']);

export const handle: Handle = async ({ event, resolve }) => {
  const s = await readSession(event.cookies);
  event.locals.user = s?.user ?? null;
  event.locals.session = s?.session ?? null;

  const path = event.url.pathname;
  const isPublic =
    PUBLIC.has(path) ||
    path.startsWith('/manifest') ||
    path.startsWith('/icon') ||
    path.startsWith('/apple-touch');
  if (!event.locals.user && !isPublic) {
    if (path.startsWith('/api/')) return new Response('unauthorized', { status: 401 });
    throw redirect(303, '/login');
  }
  if (event.locals.user && path === '/login') throw redirect(303, '/');
  return resolve(event);
};
