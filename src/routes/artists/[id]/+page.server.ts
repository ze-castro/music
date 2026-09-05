import type { PageServerLoad } from './$types';
import { clientForUser } from '$lib/server/subsonic';
import { handleSubsonic } from '$lib/server/errors';

export const load: PageServerLoad = async ({ params, locals }) => {
  const client = await clientForUser(locals.user!);
  const artist = await handleSubsonic(() => client.getArtist(params.id));
  return {
    artist: { id: artist.id, name: artist.name, coverArt: artist.coverArt },
    albums: (artist.album ?? []).sort((a, b) => (b.year ?? 0) - (a.year ?? 0)).map((a) => ({ id: a.id, name: a.name, coverArt: a.coverArt, year: a.year }))
  };
};
