import { fail, redirect } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { db, schema } from '$lib/server/db';
import { encrypt } from '$lib/server/crypto';
import { createSession } from '$lib/server/session';
import { validateServer, normalizeServerUrl, SubsonicApiError, SubsonicNetworkError } from '$lib/server/subsonic';

export const load: PageServerLoad = async () => ({ pinnedServer: env.NAVIDROME_URL || null });

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const serverUrl = normalizeServerUrl(String(env.NAVIDROME_URL || form.get('server') || ''));
    const username = String(form.get('username') ?? '').trim();
    const password = String(form.get('password') ?? '');

    if (!serverUrl || !username || !password) {
      return fail(400, { error: 'Server, username and password are required.', serverUrl, username });
    }

    // Validate BEFORE storing anything.
    try {
      await validateServer({ serverUrl, username, password });
    } catch (e) {
      if (e instanceof SubsonicApiError) {
        // 40 = wrong user/pass, 41 = token auth unsupported, 10 = missing param
        const msg = e.code === 40 ? 'Wrong username or password.' : `Server rejected login: ${e.message}`;
        return fail(401, { error: msg, serverUrl, username });
      }
      if (e instanceof SubsonicNetworkError) {
        const msg =
          e.message === 'timeout' ? `Server at ${serverUrl} timed out.` :
          e.message === 'unreachable' ? `Can't reach server at ${serverUrl} — check the address and try again.` :
          `Server at ${serverUrl}: ${e.message}`;
        return fail(502, { error: msg, serverUrl, username });
      }
      return fail(500, { error: 'Unexpected error validating server.', serverUrl, username });
    }

    const encryptedSecret = await encrypt(password);
    let user = await db.query.users.findFirst({
      where: and(eq(schema.users.serverUrl, serverUrl), eq(schema.users.username, username))
    });
    if (user) {
      await db.update(schema.users).set({ encryptedSecret }).where(eq(schema.users.id, user.id));
    } else {
      [user] = await db.insert(schema.users).values({ id: crypto.randomUUID(), serverUrl, username, encryptedSecret }).returning();
    }
    await createSession(cookies, user.id);
    throw redirect(303, '/');
  }
};
