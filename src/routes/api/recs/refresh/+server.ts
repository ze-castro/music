import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateRecs } from '$lib/server/recs';

export const POST: RequestHandler = async ({ locals }) => {
  try {
    await generateRecs(locals.user!);
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
};
