import type { PageServerLoad } from './$types';
import { clientForUser } from '$lib/server/subsonic';
import { handleSubsonic } from '$lib/server/errors';
import { toTrack } from '$lib/server/mappers';

export const load: PageServerLoad = async ({ locals, url }) => {
  const q = (url.searchParams.get('q') ?? '').trim();
  if (!q) return { q, artists: [], albums: [], tracks: [] };
  const client = await clientForUser(locals.user!);
  const r = await handleSubsonic(() =>
    client.search3(q, { artistCount: 8, albumCount: 12, songCount: 30 }),
  );
  return {
    q,
    artists: r.artist.map((a) => ({ id: a.id, name: a.name, coverArt: a.coverArt })),
    albums: r.album.map((a) => ({
      id: a.id,
      name: a.name,
      artist: a.artist,
      artistId: a.artistId,
      coverArt: a.coverArt,
    })),
    tracks: r.song.map((s) => toTrack(s)),
  };
};
