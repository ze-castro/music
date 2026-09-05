import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

// Single-file SQLite via Bun's built-in driver. Opened once from hooks.server.ts `init`.
// Build must run under Bun (`bun --bun vite build`) because drizzle's driver imports `bun:sqlite`.
let _db: BunSQLiteDatabase<typeof schema> | null = null;

export async function initDb() {
  if (_db) return _db;
  const { Database } = await import('bun:sqlite');
  const file = env.DATABASE_URL || './data/music.db';
  mkdirSync(dirname(resolve(file)), { recursive: true });
  const sqlite = new Database(file, { create: true });
  sqlite.run('PRAGMA journal_mode = WAL');
  sqlite.run('PRAGMA foreign_keys = ON');
  sqlite.run('PRAGMA busy_timeout = 5000');
  _db = drizzle(sqlite, { schema });
  migrate(_db, { migrationsFolder: env.MIGRATIONS_DIR || './drizzle' });
  return _db;
}

export const db = new Proxy({} as BunSQLiteDatabase<typeof schema>, {
  get(_, prop) {
    if (!_db) throw new Error('db not initialised — initDb() must run in hooks.server.ts init');
    const real = _db as unknown as Record<string | symbol, unknown>;
    const v = real[prop];
    return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(real) : v;
  },
});
export { schema };
