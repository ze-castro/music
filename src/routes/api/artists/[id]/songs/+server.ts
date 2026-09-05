import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clientForUser } from '$lib/server/subsonic';
import { toTrack } from '$lib/server/mappers';

// All songs for an artist (flatten every album). Lazy: only fetched on Shuffle click.
export const GET: RequestHandler = async ({ params, locals }) => {
  const client = await clientForUser(locals.user!);
  const artist = await client.getArtist(params.id);
  const albums = await Promise.all((artist.album ?? []).map((a) => client.getAlbum(a.id)));
  const tracks = albums.flatMap((al) => (al.song ?? []).map((s) => toTrack(s, al.coverArt)));
  return json({ tracks });
};
