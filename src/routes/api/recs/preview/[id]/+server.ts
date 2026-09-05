import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deezer } from '$lib/server/deezer/client';

// Deezer preview URLs are signed + short-lived, so stored ones go stale.
// ?kind=track|album → resolve fresh URL, 302 to it. <audio> follows redirects.
export const GET: RequestHandler = async ({ params, url }) => {
  const id = Number(params.id);
  const kind = url.searchParams.get('kind') ?? 'track';
  let preview: string | undefined;
  try {
    if (kind === 'album') preview = (await deezer.albumTracks(id)).find((t) => t.preview)?.preview;
    else preview = (await deezer.track(id)).preview;
  } catch {
    return new Response('deezer unavailable', { status: 502 });
  }
  if (!preview) return new Response('no preview', { status: 404 });
  throw redirect(302, preview);
};
