import type { PageServerLoad } from './$types';
import { clientForUser } from '$lib/server/subsonic';
import { handleSubsonic } from '$lib/server/errors';
import { toTrack } from '$lib/server/mappers';

export const load: PageServerLoad = async ({ params, locals }) => {
  const client = await clientForUser(locals.user!);
  if (params.id === 'liked') {
    const s = await handleSubsonic(() => client.getStarred2());
    return { name: 'Liked Songs', coverArt: undefined, liked: true, unavailable: 0, tracks: s.song.map((t) => toTrack(t)) };
  }
  // The list is fetched only for its songCount; if it fails the page still works without the note.
  const [p, listed] = await handleSubsonic(() =>
    Promise.all([client.getPlaylist(params.id), client.getPlaylists().catch(() => [])]),
  );
  const tracks = (p.entry ?? []).map((t) => toTrack(t));
  // Navidrome's stored songCount (what getPlaylists returns, shown in the playlists list) also
  // counts entries whose file has gone missing from the library. getPlaylist leaves those out of
  // `entry` and recomputes its own songCount to match, so the stored number has to come from the
  // list. Report the gap so the two views add up.
  const stored = listed.find((l) => l.id === params.id)?.songCount ?? tracks.length;
  const unavailable = Math.max(0, stored - tracks.length);
  return { name: p.name, coverArt: p.coverArt, liked: false, unavailable, tracks };
};
