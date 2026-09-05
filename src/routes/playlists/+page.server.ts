import type { PageServerLoad } from './$types';
import { clientForUser } from '$lib/server/subsonic';
import { handleSubsonic } from '$lib/server/errors';
export const load: PageServerLoad = async ({ locals }) => {
  const client = await clientForUser(locals.user!);
  const [playlists, starred] = await handleSubsonic(() =>
    Promise.all([client.getPlaylists(), client.getStarred2()]),
  );
  return {
    likedCount: starred.song.length,
    playlists: playlists.map((p) => ({
      id: p.id,
      name: p.name,
      coverArt: p.coverArt,
      songCount: p.songCount,
      duration: p.duration,
      owner: p.owner,
      created: p.created,
      changed: p.changed,
    })),
  };
};
