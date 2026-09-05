// lrclib.net public API. No auth. Ask for User-Agent identifying the app.
const BASE = 'https://lrclib.net/api';
const UA = 'music/0.1 (navidrome client; https://github.com/)';

export interface LrcLibResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

/** Exact match by artist/title/duration. Returns null on 404 (expected, common). */
export async function lrclibGet(artist: string, title: string, durationSec: number, album?: string): Promise<LrcLibResult | null> {
  const url = new URL(BASE + '/get');
  url.searchParams.set('artist_name', artist);
  url.searchParams.set('track_name', title);
  url.searchParams.set('duration', String(Math.round(durationSec)));
  if (album) url.searchParams.set('album_name', album);
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`lrclib http ${res.status}`);
  return (await res.json()) as LrcLibResult;
}

/** Parse LRC "[mm:ss.xx] text" into timed lines. */
export function parseLrc(lrc: string): { t: number; text: string }[] {
  const out: { t: number; text: string }[] = [];
  for (const line of lrc.split('\n')) {
    const m = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    if (!m) continue;
    out.push({ t: Number(m[1]) * 60 + Number(m[2]), text: m[3].trim() });
  }
  return out.sort((a, b) => a.t - b.t);
}
