// Deezer public API. No auth. Rate limit ~50 req / 5 s per IP; keep calls lazy + cached.
const BASE = 'https://api.deezer.com';

export interface DeezerArtist {
  id: number;
  name: string;
  picture_medium: string;
  picture_big: string;
  nb_fan?: number;
  link: string;
}
export interface DeezerAlbum {
  id: number;
  title: string;
  cover_medium: string;
  cover_big: string;
  release_date: string;
  record_type: string;
  artist?: DeezerArtist;
  link: string;
}
export interface DeezerTrack {
  id: number;
  title: string;
  duration: number;
  preview: string;
  artist: DeezerArtist;
  album: { id: number; title: string; cover_medium: string };
  link: string;
}

export class DeezerError extends Error {
  constructor(
    m: string,
    public status?: number,
  ) {
    super(m);
    this.name = 'DeezerError';
  }
}

async function get<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new DeezerError(`http ${res.status}`, res.status);
  const body = await res.json();
  if (body?.error) throw new DeezerError(body.error.message ?? 'deezer error', body.error.code);
  return body as T;
}

export const deezer = {
  searchArtist: (q: string) =>
    get<{ data: DeezerArtist[] }>('/search/artist', { q, limit: 5 }).then((r) => r.data),
  artist: (id: number) => get<DeezerArtist>(`/artist/${id}`),
  related: (id: number, limit = 20) =>
    get<{ data: DeezerArtist[] }>(`/artist/${id}/related`, { limit }).then((r) => r.data),
  albums: (id: number, limit = 50) =>
    get<{ data: DeezerAlbum[] }>(`/artist/${id}/albums`, { limit }).then((r) => r.data),
  topTracks: (id: number, limit = 10) =>
    get<{ data: DeezerTrack[] }>(`/artist/${id}/top`, { limit }).then((r) => r.data),
  albumTracks: (id: number) =>
    get<{ data: DeezerTrack[] }>(`/album/${id}/tracks`).then((r) => r.data),
  track: (id: number) => get<DeezerTrack>(`/track/${id}`),
};
