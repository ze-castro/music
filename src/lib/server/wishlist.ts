import { desc, eq } from 'drizzle-orm';
import { db, schema } from './db';
import type { WishItem, WishRow } from '$lib/wishlist-types';

export async function listWishlist(userId: string): Promise<WishRow[]> {
  const rows = await db.query.wishlist.findMany({
    where: eq(schema.wishlist.userId, userId),
    orderBy: desc(schema.wishlist.addedAt),
  });
  return rows.map((r) => ({
    id: r.id,
    addedAt: r.addedAt.toISOString(),
    ...(r.payload as WishItem),
  }));
}
