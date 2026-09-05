import {
  pgTable,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    serverUrl: text('server_url').notNull(),
    username: text('username').notNull(),
    // AES-256-GCM encrypted Subsonic password. Needed to derive fresh salt+token per request.
    encryptedSecret: text('encrypted_secret').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    homeScreenHintDismissed: boolean('home_screen_hint_dismissed').default(false).notNull(),
  },
  (t) => [uniqueIndex('users_server_username_idx').on(t.serverUrl, t.username)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const listeningHistory = pgTable(
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
    playedAt: timestamp('played_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('history_user_played_idx').on(t.userId, t.playedAt),
    index('history_user_artist_idx').on(t.userId, t.artist),
  ],
);

export const recommendationsCache = pgTable(
  'recommendations_cache',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['artist', 'album', 'track'] }).notNull(),
    // Deezer ids exceed int32
    deezerId: bigint('deezer_id', { mode: 'number' }).notNull(),
    seedArtist: text('seed_artist').notNull(),
    payload: jsonb('payload').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
    dismissed: boolean('dismissed').default(false).notNull(),
  },
  (t) => [
    uniqueIndex('recs_user_kind_deezer_idx').on(t.userId, t.kind, t.deezerId),
    index('recs_user_generated_idx').on(t.userId, t.generatedAt),
  ],
);

// Discoveries the user wants to acquire later. Deezer objects, not library items.
export const wishlist = pgTable(
  'wishlist',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['artist', 'album', 'track'] }).notNull(),
    deezerId: bigint('deezer_id', { mode: 'number' }).notNull(),
    payload: jsonb('payload').notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('wishlist_user_kind_deezer_idx').on(t.userId, t.kind, t.deezerId),
    index('wishlist_user_added_idx').on(t.userId, t.addedAt),
  ],
);

export const lyricsCache = pgTable(
  'lyrics_cache',
  {
    id: text('id').primaryKey(),
    artist: text('artist').notNull(),
    title: text('title').notNull(),
    durationSec: integer('duration_sec').notNull(),
    // Both null = looked up, nothing found. Negative cache prevents repeat lrclib hits.
    syncedLyrics: text('synced_lyrics'),
    plainLyrics: text('plain_lyrics'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('lyrics_key_idx').on(t.artist, t.title, t.durationSec)],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
