import type { RequestHandler } from './$types';

// Cheap "am I still signed in?" probe for the player. hooks.server.ts answers 401 before this runs.
export const GET: RequestHandler = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
