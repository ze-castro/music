import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = async ({ locals }) => ({
  user: locals.user ? { username: locals.user.username, serverUrl: locals.user.serverUrl } : null
});
