import { and, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from './db';
import { deezer, type DeezerTrack } from './deezer/client';
import { clientForUser } from './subsonic';
import type { User } from './db/schema';

// TEMP for testing: real value 200
export const FOR_YOU_THRESHOLD = 5;
const SEEDS = 5; // top artists used as seeds
const RELATED_PER_SEED = 6;
const NEW_RELEASE_DAYS = 365;
const REFRESH_AFTER_MS = 24 * 3600 * 1000;

export interface ArtistRec {
  id: number;
  name: string;
  picture: string;
  link: string;
  topTracks: { id: number; title: string; preview: string; cover: string }[];
}
export interface AlbumRec {
  id: number;
  title: string;
  cover: string;
  releaseDate: string;
  artist: string;
  link: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function playCount(userId: string) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.listeningHistory)
    .where(eq(schema.listeningHistory.userId, userId));
  return n;
}

export async function loadRecs(userId: string) {
  const rows = await db.query.recommendationsCache.findMany({
    where: and(
      eq(schema.recommendationsCache.userId, userId),
      eq(schema.recommendationsCache.dismissed, false),
    ),
    orderBy: desc(schema.recommendationsCache.generatedAt),
  });
  return {
    generatedAt: rows[0]?.generatedAt ?? null,
    artists: rows
      .filter((r) => r.kind === 'artist')
      .map((r) => ({ rowId: r.id, seed: r.seedArtist, ...(r.payload as ArtistRec) })),
    albums: rows
      .filter((r) => r.kind === 'album')
      .map((r) => ({ rowId: r.id, seed: r.seedArtist, ...(r.payload as AlbumRec) })),
  };
}

export function isStale(generatedAt: Date | null) {
  return !generatedAt || Date.now() - generatedAt.getTime() > REFRESH_AFTER_MS;
}

/** Pipeline: history → seeds → Deezer related/albums → filter vs library → cache. Deezer failures throw; caller falls back to cache. */
export async function generateRecs(user: User) {
  const seeds = await db
    .select({ artist: schema.listeningHistory.artist, n: sql<number>`count(*)::int` })
    .from(schema.listeningHistory)
    .where(eq(schema.listeningHistory.userId, user.id))
    .groupBy(schema.listeningHistory.artist)
    .orderBy(desc(sql`count(*)`))
    .limit(SEEDS);
  if (seeds.length === 0) return;

  const client = await clientForUser(user);
  const libArtists = await client.getArtists();
  const owned = new Set(libArtists.map((a) => norm(a.name)));
  const ownedAlbums = new Set<string>();
  for (const s of seeds) {
    const la = libArtists.find((a) => norm(a.name) === norm(s.artist));
    if (la) (await client.getArtist(la.id)).album?.forEach((al) => ownedAlbums.add(norm(al.name)));
  }

  const since = new Date(Date.now() - NEW_RELEASE_DAYS * 86400_000).toISOString().slice(0, 10);
  const rows: (typeof schema.recommendationsCache.$inferInsert)[] = [];

  for (const seed of seeds) {
    const hits = await deezer.searchArtist(seed.artist);
    const dz = hits.find((h) => norm(h.name) === norm(seed.artist)) ?? hits[0];
    if (!dz) continue;

    const related = (await deezer.related(dz.id, RELATED_PER_SEED * 2))
      .filter((r) => !owned.has(norm(r.name)))
      .slice(0, RELATED_PER_SEED);
    for (const r of related) {
      await sleep(120); // stay under Deezer 50 req / 5 s
      const top = (await deezer.topTracks(r.id, 3)).filter((t) => t.preview);
      const payload: ArtistRec = {
        id: r.id,
        name: r.name,
        picture: r.picture_big,
        link: r.link,
        topTracks: top.map(toTop),
      };
      rows.push({
        id: crypto.randomUUID(),
        userId: user.id,
        kind: 'artist',
        deezerId: r.id,
        seedArtist: seed.artist,
        payload,
      });
    }

    const seenTitles = new Set<string>();
    const albums = (await deezer.albums(dz.id, 50)).filter((a) => {
      const t = norm(a.title);
      if (
        a.release_date < since ||
        !['album', 'ep'].includes(a.record_type) ||
        ownedAlbums.has(t) ||
        seenTitles.has(t)
      )
        return false;
      seenTitles.add(t);
      return true;
    });
    for (const a of albums) {
      const payload: AlbumRec = {
        id: a.id,
        title: a.title,
        cover: a.cover_big,
        releaseDate: a.release_date,
        artist: dz.name,
        link: a.link,
      };
      rows.push({
        id: crypto.randomUUID(),
        userId: user.id,
        kind: 'album',
        deezerId: a.id,
        seedArtist: seed.artist,
        payload,
      });
    }
    await sleep(200);
  }

  if (rows.length) {
    await db
      .insert(schema.recommendationsCache)
      .values(rows)
      .onConflictDoUpdate({
        target: [
          schema.recommendationsCache.userId,
          schema.recommendationsCache.kind,
          schema.recommendationsCache.deezerId,
        ],
        set: {
          payload: sql`excluded.payload`,
          generatedAt: new Date(),
          seedArtist: sql`excluded.seed_artist`,
        },
      });
  }
}

const toTop = (t: DeezerTrack) => ({
  id: t.id,
  title: t.title,
  preview: t.preview,
  cover: t.album?.cover_medium ?? '',
});
