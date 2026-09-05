import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { listWishlist } from '$lib/server/wishlist';
import type { WishItem } from '$lib/wishlist-types';

export const GET: RequestHandler = async ({ locals }) => json(await listWishlist(locals.user!.id));

export const POST: RequestHandler = async ({ request, locals }) => {
  const item = (await request.json()) as WishItem;
  if (!item?.kind || !item.deezerId) return new Response('bad request', { status: 400 });
  const [row] = await db
    .insert(schema.wishlist)
    .values({
      id: crypto.randomUUID(),
      userId: locals.user!.id,
      kind: item.kind,
      deezerId: item.deezerId,
      payload: item,
    })
    .onConflictDoUpdate({
      target: [schema.wishlist.userId, schema.wishlist.kind, schema.wishlist.deezerId],
      set: { payload: sql`excluded.payload` },
    })
    .returning();
  return json({ id: row.id });
};
