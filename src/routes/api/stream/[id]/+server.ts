import type { RequestHandler } from './$types';
import { clientForUser, SubsonicNetworkError } from '$lib/server/subsonic';

// Proxy audio so Subsonic credentials never reach the browser.
// Forwards Range for seeking. Streams body through untouched.
export const GET: RequestHandler = async ({ params, url, request, locals }) => {
  const client = await clientForUser(locals.user!);
  const maxBitRate = url.searchParams.get('maxBitRate');
  const format = url.searchParams.get('format') ?? undefined;
  const headers: Record<string, string> = {};
  const range = request.headers.get('range');
  if (range) headers.range = range;

  let upstream: Response;
  try {
    upstream = await client.stream(params.id, { maxBitRate: maxBitRate ? Number(maxBitRate) : undefined, format }, headers);
  } catch (e) {
    if (e instanceof SubsonicNetworkError) return new Response('upstream unreachable', { status: 502 });
    throw e;
  }
  if (!upstream.ok && upstream.status !== 206) return new Response('stream failed', { status: upstream.status });

  const h = new Headers();
  for (const k of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'x-content-duration']) {
    const v = upstream.headers.get(k);
    if (v) h.set(k, v);
  }
  h.set('cache-control', 'private, no-store');
  return new Response(upstream.body, { status: upstream.status, headers: h });
};
