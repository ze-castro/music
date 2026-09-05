import type { PageServerLoad } from './$types';
import { FOR_YOU_THRESHOLD, generateRecs, isStale, loadRecs, playCount } from '$lib/server/recs';
import { listWishlist } from '$lib/server/wishlist';

export const load: PageServerLoad = async ({ locals }) => {
  const [plays, wishlist] = await Promise.all([
    playCount(locals.user!.id),
    listWishlist(locals.user!.id),
  ]);
  if (plays < FOR_YOU_THRESHOLD)
    return { plays, threshold: FOR_YOU_THRESHOLD, gated: true as const, wishlist };

  let recs = await loadRecs(locals.user!.id);
  let deezerError: string | null = null;
  if (isStale(recs.generatedAt)) {
    try {
      await generateRecs(locals.user!);
      recs = await loadRecs(locals.user!.id);
    } catch (e) {
      deezerError = (e as Error).message;
    }
  }
  return {
    plays,
    threshold: FOR_YOU_THRESHOLD,
    gated: false as const,
    wishlist,
    ...recs,
    deezerError,
  };
};
