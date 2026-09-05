import type { PageServerLoad } from './$types';
import { clientForUser } from '$lib/server/subsonic';
import { handleSubsonic } from '$lib/server/errors';
import { toTrack } from '$lib/server/mappers';

const PAGE = 500;
export const load: PageServerLoad = async ({ locals }) => {
  const client = await clientForUser(locals.user!);
  // Whole song list; Navidrome returns everything for empty search3 query.
  const tracks = await handleSubsonic(async () => {
    const all = [];
    for (let offset = 0; ; offset += PAGE) {
      const r = await client.search3('', {
        artistCount: 0,
        albumCount: 0,
        songCount: PAGE,
        offset,
      });
      all.push(...r.song.map((s) => toTrack(s)));
      if (r.song.length < PAGE) break;
    }
    return all;
  });
  return { tracks };
};
