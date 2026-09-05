import { decrypt } from '../crypto';
import type { User } from '../db/schema';
import { SubsonicClient } from './client';

export * from './client';
export type * from './types';

/** Build client for a logged-in user. Password decrypted per-request, never cached. */
export async function clientForUser(user: User): Promise<SubsonicClient> {
  const password = await decrypt(user.encryptedSecret);
  return new SubsonicClient({ serverUrl: user.serverUrl, username: user.username, password });
}
