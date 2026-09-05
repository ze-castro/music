import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

// Lazy: build/analysis imports this module without env. Connect on first query.
let _db: PostgresJsDatabase<typeof schema> | null = null;
function get() {
  if (_db) return _db;
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  _db = drizzle(postgres(env.DATABASE_URL, { max: 10 }), { schema });
  return _db;
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_, prop) {
    const real = get() as unknown as Record<string | symbol, unknown>;
    const v = real[prop];
    return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(real) : v;
  }
});
export { schema };
