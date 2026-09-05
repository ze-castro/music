import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';

export const DELETE: RequestHandler = async ({ params, locals }) => {
  await db
    .delete(schema.wishlist)
    .where(and(eq(schema.wishlist.id, params.id), eq(schema.wishlist.userId, locals.user!.id)));
  return new Response(null, { status: 204 });
};
