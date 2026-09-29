import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { clientForUser, SubsonicApiError } from '$lib/server/subsonic';
import { handleSubsonic } from '$lib/server/errors';

const MAX_NAME = 200;

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

  rename: async ({ request, locals }) => {
    const form = await request.formData();
    const id = String(form.get('id') ?? '');
    const name = String(form.get('name') ?? '').trim();
    if (!id || id === 'liked') return fail(400, { rename: { message: 'That playlist cannot be renamed.' } });
    if (!name) return fail(400, { rename: { message: 'Name is required.' } });
    if (name.length > MAX_NAME) return fail(400, { rename: { message: `Max ${MAX_NAME} characters.` } });

    const client = await clientForUser(locals.user!);
    try {
      await client.updatePlaylist(id, { name });
    } catch (e) {
      // 50 = not authorized (someone else's public playlist). Show it in the dialog, not an error page.
      if (e instanceof SubsonicApiError && e.code === 50) {
        return fail(403, { rename: { message: 'Only the owner can rename this playlist.' } });
      }
      return handleSubsonic(() => Promise.reject(e));
    }
    return { rename: { ok: true } };
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
