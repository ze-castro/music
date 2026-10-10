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
  const p = await handleSubsonic(() => client.getPlaylist(params.id));
  const tracks = (p.entry ?? []).map((t) => toTrack(t));
  // Navidrome's songCount (shown in the playlists list) also counts entries whose file has gone
  // missing from the library; `entry` leaves those out. Report the gap so the two views add up.
  const unavailable = Math.max(0, (p.songCount ?? 0) - tracks.length);
  return { name: p.name, coverArt: p.coverArt, liked: false, unavailable, tracks };
};
