import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, locals }) => {
  const { rowId } = (await request.json()) as { rowId: string };
  await db
    .update(schema.recommendationsCache)
    .set({ dismissed: true })
    .where(
      and(
        eq(schema.recommendationsCache.id, rowId),
        eq(schema.recommendationsCache.userId, locals.user!.id),
      ),
    );
  return json({ ok: true });
};
