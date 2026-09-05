import { error } from '@sveltejs/kit';
import { SubsonicApiError, SubsonicNetworkError } from './subsonic/client';

/** Map Subsonic failures to SvelteKit errors with a stable `code` the +error page can branch on. */
export async function handleSubsonic<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof SubsonicNetworkError) throw error(502, { message: `Can't reach your server (${e.message})`, code: 'unreachable' });
    if (e instanceof SubsonicApiError) {
      if (e.code === 40) throw error(401, { message: 'Server rejected your credentials. Sign in again.', code: 'auth' });
      throw error(502, { message: e.message, code: 'server' });
    }
    throw e;
  }
}
