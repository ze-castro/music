import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

const now = () => new Date();
const ts = (name: string) => integer(name, { mode: 'timestamp_ms' });

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    serverUrl: text('server_url').notNull(),
    username: text('username').notNull(),
    // AES-256-GCM encrypted Subsonic password. Needed to derive fresh salt+token per request.
    encryptedSecret: text('encrypted_secret').notNull(),
    createdAt: ts('created_at').$defaultFn(now).notNull(),
    homeScreenHintDismissed: integer('home_screen_hint_dismissed', { mode: 'boolean' })
      .default(false)
      .notNull(),
  },
  (t) => [uniqueIndex('users_server_username_idx').on(t.serverUrl, t.username)],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: ts('expires_at').notNull(),
    createdAt: ts('created_at').$defaultFn(now).notNull(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const listeningHistory = sqliteTable(
  'listening_history',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    trackId: text('track_id').notNull(),
    title: text('title').notNull(),
    artist: text('artist').notNull(),
    artistId: text('artist_id'),
    albumId: text('album_id'),
    playedAt: ts('played_at').$defaultFn(now).notNull(),
  },
  (t) => [
    index('history_user_played_idx').on(t.userId, t.playedAt),
    index('history_user_artist_idx').on(t.userId, t.artist),
  ],
);

export const recommendationsCache = sqliteTable(
  'recommendations_cache',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['artist', 'album', 'track'] }).notNull(),
    deezerId: integer('deezer_id').notNull(), // SQLite ints are 64-bit
    seedArtist: text('seed_artist').notNull(),
    payload: text('payload', { mode: 'json' }).notNull(),
    generatedAt: ts('generated_at').$defaultFn(now).notNull(),
    dismissed: integer('dismissed', { mode: 'boolean' }).default(false).notNull(),
  },
  (t) => [
    uniqueIndex('recs_user_kind_deezer_idx').on(t.userId, t.kind, t.deezerId),
    index('recs_user_generated_idx').on(t.userId, t.generatedAt),
  ],
);

// Discoveries the user wants to acquire later. Deezer objects, not library items.
export const wishlist = sqliteTable(
  'wishlist',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['artist', 'album', 'track'] }).notNull(),
    deezerId: integer('deezer_id').notNull(),
    payload: text('payload', { mode: 'json' }).notNull(),
    addedAt: ts('added_at').$defaultFn(now).notNull(),
  },
  (t) => [
    uniqueIndex('wishlist_user_kind_deezer_idx').on(t.userId, t.kind, t.deezerId),
    index('wishlist_user_added_idx').on(t.userId, t.addedAt),
  ],
);

export const lyricsCache = sqliteTable(
  'lyrics_cache',
  {
    id: text('id').primaryKey(),
    artist: text('artist').notNull(),
    title: text('title').notNull(),
    durationSec: integer('duration_sec').notNull(),
    // Both null = looked up, nothing found. Negative cache prevents repeat lrclib hits.
    syncedLyrics: text('synced_lyrics'),
    plainLyrics: text('plain_lyrics'),
    fetchedAt: ts('fetched_at').$defaultFn(now).notNull(),
  },
  (t) => [uniqueIndex('lyrics_key_idx').on(t.artist, t.title, t.durationSec)],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
