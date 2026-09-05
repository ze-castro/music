import type { PageServerLoad } from './$types';
import { clientForUser } from '$lib/server/subsonic';
import { handleSubsonic } from '$lib/server/errors';

export const load: PageServerLoad = async ({ locals }) => {
  const client = await clientForUser(locals.user!);
  const [artists, scan, playlists] = await handleSubsonic(() =>
    Promise.all([client.getArtists(), client.getScanStatus(), client.getPlaylists()]),
  );
  return {
    account: { username: locals.user!.username, serverUrl: locals.user!.serverUrl },
    library: {
      artists: artists.length,
      albums: artists.reduce((n, a) => n + (a.albumCount ?? 0), 0),
      songs: scan.count ?? null,
      playlists: playlists.length,
      scanning: scan.scanning,
      lastScan: scan.lastScan ?? null,
    },
  };
};
