import type { PageServerLoad } from './$types';
import { clientForUser } from '$lib/server/subsonic';
import { handleSubsonic } from '$lib/server/errors';
import { toTrack } from '$lib/server/mappers';
import type { Track } from '$lib/types';

const TOP_SONGS = 20;

export const load: PageServerLoad = async ({ params, locals }) => {
  const client = await clientForUser(locals.user!);
  const artist = await handleSubsonic(() => client.getArtist(params.id));
  const albums = artist.album ?? [];

  // The user's own play counts from Navidrome. All albums are fetched at once;
  // one album failing only drops its songs from the ranking.
  const results = await Promise.allSettled(albums.map((a) => client.getAlbum(a.id)));
  const seen = new Set<string>();
  const played: Track[] = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const s of r.value.song ?? []) {
      if (!s.playCount || seen.has(s.id)) continue;
      seen.add(s.id);
      played.push(toTrack(s, r.value.coverArt));
    }
  }
  played.sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0) || a.title.localeCompare(b.title));

  return {
    artist: { id: artist.id, name: artist.name, coverArt: artist.coverArt },
    topSongs: played.slice(0, TOP_SONGS),
    albums: albums
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
      .map((a) => ({ id: a.id, name: a.name, coverArt: a.coverArt, year: a.year }))
  };
};
