import type { PageServerLoad } from './$types';
import { clientForUser } from '$lib/server/subsonic';
import { handleSubsonic } from '$lib/server/errors';
import { toTrack } from '$lib/server/mappers';

export const load: PageServerLoad = async ({ params, locals }) => {
  const client = await clientForUser(locals.user!);
  const album = await handleSubsonic(() => client.getAlbum(params.id));
  const tracks = (album.song ?? []).map((s) => toTrack(s, album.coverArt));
  return {
    album: {
      id: album.id,
      name: album.name,
      artist: album.artist,
      artistId: album.artistId,
      coverArt: album.coverArt,
      year: album.year,
      genre: album.genre,
      duration: album.duration,
      songCount: album.songCount,
    },
    tracks,
  };
};
