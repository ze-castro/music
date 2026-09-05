import type { PageServerLoad } from './$types';
import { clientForUser } from '$lib/server/subsonic';
import { handleSubsonic } from '$lib/server/errors';

const PAGE = 500;
export const load: PageServerLoad = async ({ locals }) => {
  const client = await clientForUser(locals.user!);
  // Fetch whole album list once; filter/sort client-side (same as artists page).
  const albums = await handleSubsonic(async () => {
    const all = [];
    for (let offset = 0; ; offset += PAGE) {
      const page = await client.getAlbumList2('alphabeticalByName', { size: PAGE, offset });
      all.push(...page);
      if (page.length < PAGE) break;
    }
    return all;
  });
  return {
    albums: albums.map((a) => ({
      id: a.id,
      name: a.name,
      artist: a.artist,
      artistId: a.artistId,
      coverArt: a.coverArt,
      year: a.year,
      genre: a.genre,
      created: a.created,
      playCount: a.playCount ?? 0,
    })),
  };
};
