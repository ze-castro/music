import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { clientForUser } from '$lib/server/subsonic';

// Called by player once a track passes ~50% or 4 min (Last.fm-style rule, decided client-side).
// Writes local listening_history (rec engine input) AND forwards scrobble to Navidrome.
export const POST: RequestHandler = async ({ request, locals }) => {
  const body = (await request.json()) as { id: string; title: string; artist: string; artistId?: string; albumId?: string };
  if (!body?.id) return new Response('bad request', { status: 400 });

  await db.insert(schema.listeningHistory).values({
    id: crypto.randomUUID(),
    userId: locals.user!.id,
    trackId: body.id,
    title: body.title,
    artist: body.artist,
    artistId: body.artistId,
    albumId: body.albumId
  });

  // Navidrome scrobble is best-effort; local history is source of truth for recs.
  try {
    const client = await clientForUser(locals.user!);
    await client.scrobble(body.id, true);
  } catch (e) {
    console.warn('scrobble forward failed', e);
  }
  return json({ ok: true });
};
