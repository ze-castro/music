import type { PageServerLoad } from './$types';
import { clientForUser } from '$lib/server/subsonic';
import { handleSubsonic } from '$lib/server/errors';
import { toTrack } from '$lib/server/mappers';

export const load: PageServerLoad = async ({ params, locals }) => {
  const client = await clientForUser(locals.user!);
  if (params.id === 'liked') {
    const s = await handleSubsonic(() => client.getStarred2());
    return { name: 'Liked Songs', coverArt: undefined, liked: true, tracks: s.song.map((t) => toTrack(t)) };
  }
  const p = await handleSubsonic(() => client.getPlaylist(params.id));
  return { name: p.name, coverArt: p.coverArt, liked: false, tracks: (p.entry ?? []).map((t) => toTrack(t)) };
};
