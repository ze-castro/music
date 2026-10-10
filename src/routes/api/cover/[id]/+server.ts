import type { RequestHandler } from './$types';
import { clientForUser, SubsonicNetworkError } from '$lib/server/subsonic';

export const GET: RequestHandler = async ({ params, url, locals }) => {
  const client = await clientForUser(locals.user!);
  const size = url.searchParams.get('size');
  let upstream: Response;
  try {
    upstream = await client.coverArt(params.id, size ? Number(size) : undefined);
  } catch (e) {
    if (e instanceof SubsonicNetworkError) return new Response(null, { status: 502 });
    throw e;
  }
  if (!upstream.ok) return new Response(null, { status: 404 });
  const h = new Headers();
  h.set('content-type', upstream.headers.get('content-type') ?? 'image/jpeg');
  h.set('cache-control', 'private, max-age=86400');
  return new Response(upstream.body, { status: 200, headers: h });
};
