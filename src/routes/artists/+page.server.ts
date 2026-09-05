import type { PageServerLoad } from './$types';
import { clientForUser } from '$lib/server/subsonic';
import { handleSubsonic } from '$lib/server/errors';

export const load: PageServerLoad = async ({ locals }) => {
  const client = await clientForUser(locals.user!);
  const artists = await handleSubsonic(() => client.getArtists());
  return { artists: artists.map((a) => ({ id: a.id, name: a.name, coverArt: a.coverArt, albumCount: a.albumCount })) };
};
