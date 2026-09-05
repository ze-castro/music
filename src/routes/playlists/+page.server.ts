import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
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

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const form = await request.formData();
    const name = String(form.get('name') ?? '').trim();
    if (!name) return fail(400, { create: { message: 'Name is required.' } });
    const client = await clientForUser(locals.user!);
    const created = await handleSubsonic(() => client.createPlaylist(name));
    // Navidrome returns the new playlist; jump straight into the song picker.
    if (created?.id) redirect(303, `/playlists/${created.id}/edit`);
    return { create: { ok: true } };
  },

  delete: async ({ request, locals }) => {
    const form = await request.formData();
    const id = String(form.get('id') ?? '');
    if (!id || id === 'liked') return fail(400, { delete: { message: 'That playlist cannot be deleted.' } });
    const client = await clientForUser(locals.user!);
    await handleSubsonic(() => client.deletePlaylist(id));
    return { delete: { ok: true } };
  },
};
