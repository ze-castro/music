import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clientForUser } from '$lib/server/subsonic';

export const POST: RequestHandler = async ({ locals }) =>
  json(await (await clientForUser(locals.user!)).startScan());
export const GET: RequestHandler = async ({ locals }) =>
  json(await (await clientForUser(locals.user!)).getScanStatus());
