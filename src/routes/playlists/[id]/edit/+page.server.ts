import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { clientForUser } from '$lib/server/subsonic';
import { handleSubsonic } from '$lib/server/errors';
import { toTrack } from '$lib/server/mappers';

const PAGE = 500;

export const load: PageServerLoad = async ({ params, locals }) => {
  // "Liked Songs" is starred-song derived, not a real playlist — nothing to edit.
  if (params.id === 'liked') redirect(303, '/playlists/liked');

  const client = await clientForUser(locals.user!);
  const [playlist, library] = await handleSubsonic(async () => {
    const p = await client.getPlaylist(params.id);
    // Whole song list; Navidrome returns everything for an empty search3 query.
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
    return [p, all] as const;
  });

  return {
    id: params.id,
    name: playlist.name,
    coverArt: playlist.coverArt,
    existingIds: (playlist.entry ?? []).map((e) => e.id),
    library,
  };
};

export const actions: Actions = {
  add: async ({ params, request, locals }) => {
    const form = await request.formData();
    const songIds = form.getAll('songId').map(String).filter(Boolean);
    if (songIds.length === 0) return fail(400, { add: { message: 'Select at least one song.' } });
    const client = await clientForUser(locals.user!);
    await handleSubsonic(() => client.updatePlaylist(params.id, { add: songIds }));
    return { add: { ok: true, count: songIds.length } };
  },
};
