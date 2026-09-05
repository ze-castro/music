import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clientForUser } from '$lib/server/subsonic';

export const POST: RequestHandler = async ({ request, locals }) => {
  const { id, starred } = (await request.json()) as { id: string; starred: boolean };
  if (!id) return new Response('bad request', { status: 400 });
  const client = await clientForUser(locals.user!);
  await (starred ? client.star({ id }) : client.unstar({ id }));
  return json({ ok: true, id, starred });
};
