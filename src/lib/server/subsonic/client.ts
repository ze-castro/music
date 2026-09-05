import type {
  SubsonicEnvelope,
  AlbumID3,
  ArtistID3,
  Child,
  Playlist,
  Genre,
  AlbumListType,
  ScanStatus,
} from './types';

export class SubsonicApiError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
    this.name = 'SubsonicApiError';
  }
}
export class SubsonicNetworkError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = 'SubsonicNetworkError';
  }
}

const CLIENT_NAME = 'music';
const API_VERSION = '1.16.1';
const DEFAULT_TIMEOUT_MS = 10_000;

export interface SubsonicCredentials {
  serverUrl: string;
  username: string;
  password: string; // plaintext, decrypted just-in-time. Never leaves server.
}

async function md5Hex(input: string): Promise<string> {
  // Bun and Node 22 expose crypto.createHash; WebCrypto has no md5.
  const { createHash } = await import('node:crypto');
  return createHash('md5').update(input).digest('hex');
}

function randomSalt(bytes = 8): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function normalizeServerUrl(raw: string): string {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
  return u.replace(/\/+$/, '');
}

export class SubsonicClient {
  constructor(
    private creds: SubsonicCredentials,
    private timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {
    this.creds = { ...creds, serverUrl: normalizeServerUrl(creds.serverUrl) };
  }

  /** Fresh salt+token per request per Subsonic auth spec. */
  private async authParams(): Promise<URLSearchParams> {
    const salt = randomSalt();
    const token = await md5Hex(this.creds.password + salt);
    return new URLSearchParams({
      u: this.creds.username,
      t: token,
      s: salt,
      v: API_VERSION,
      c: CLIENT_NAME,
      f: 'json',
    });
  }

  /** Build URL for an endpoint. Used both for JSON calls and binary (stream/cover) proxying. */
  async url(
    endpoint: string,
    params: Record<string, string | number | boolean | undefined> = {},
  ): Promise<string> {
    const qs = await this.authParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.append(k, String(v));
    return `${this.creds.serverUrl}/rest/${endpoint}?${qs}`;
  }

  private async call<T>(
    endpoint: string,
    params: Record<string, string | number | boolean | undefined> = {},
  ): Promise<SubsonicEnvelope<T>['subsonic-response']> {
    const url = await this.url(endpoint, params);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, { signal: ctrl.signal });
    } catch (e) {
      const aborted = (e as Error)?.name === 'AbortError';
      throw new SubsonicNetworkError(aborted ? 'timeout' : 'unreachable', e);
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new SubsonicNetworkError(`http ${res.status}`);
    let body: SubsonicEnvelope<T>;
    try {
      body = (await res.json()) as SubsonicEnvelope<T>;
    } catch (e) {
      throw new SubsonicNetworkError('invalid json (not a Subsonic server?)', e);
    }
    const r = body['subsonic-response'];
    if (!r) throw new SubsonicNetworkError('missing subsonic-response (not a Subsonic server?)');
    if (r.status !== 'ok') {
      const err = r.error ?? { code: -1, message: 'unknown error' };
      throw new SubsonicApiError(err.code, err.message);
    }
    return r;
  }

  /** Binary fetch (stream / coverArt). Returns raw Response for proxying. */
  async fetchBinary(
    endpoint: string,
    params: Record<string, string | number | undefined>,
    headers?: HeadersInit,
  ): Promise<Response> {
    const url = await this.url(endpoint, params);
    try {
      return await fetch(url, { headers });
    } catch (e) {
      throw new SubsonicNetworkError('unreachable', e);
    }
  }

  // ---- system ----
  ping() {
    return this.call<{ openSubsonic?: boolean; serverVersion?: string; type?: string }>('ping');
  }
  getOpenSubsonicExtensions() {
    return this.call<{ openSubsonicExtensions: { name: string; versions: number[] }[] }>(
      'getOpenSubsonicExtensions',
    );
  }
  async startScan(): Promise<ScanStatus> {
    const r = await this.call<{ scanStatus: ScanStatus; }>('startScan');
    return r.scanStatus;
  }
  async getScanStatus(): Promise<ScanStatus> {
    const r = await this.call<{ scanStatus: ScanStatus; }>('getScanStatus');
    return r.scanStatus;
  }

  // ---- browsing ----
  async getArtists(): Promise<ArtistID3[]> {
    const r = await this.call<{ artists: { index: { name: string; artist: ArtistID3[] }[] } }>(
      'getArtists',
    );
    return r.artists.index?.flatMap((i) => i.artist) ?? [];
  }
  async getArtist(id: string): Promise<ArtistID3> {
    return (await this.call<{ artist: ArtistID3 }>('getArtist', { id })).artist;
  }
  async getAlbum(id: string): Promise<AlbumID3> {
    return (await this.call<{ album: AlbumID3 }>('getAlbum', { id })).album;
  }
  async getSong(id: string): Promise<Child> {
    return (await this.call<{ song: Child }>('getSong', { id })).song;
  }
  async getGenres(): Promise<Genre[]> {
    return (await this.call<{ genres: { genre: Genre[] } }>('getGenres')).genres.genre ?? [];
  }
  async getAlbumList2(
    type: AlbumListType,
    opts: {
      size?: number;
      offset?: number;
      genre?: string;
      fromYear?: number;
      toYear?: number;
    } = {},
  ): Promise<AlbumID3[]> {
    const r = await this.call<{ albumList2: { album?: AlbumID3[] } }>('getAlbumList2', {
      type,
      size: opts.size ?? 50,
      offset: opts.offset ?? 0,
      genre: opts.genre,
      fromYear: opts.fromYear,
      toYear: opts.toYear,
    });
    return r.albumList2.album ?? [];
  }
  async getStarred2(): Promise<{ artist: ArtistID3[]; album: AlbumID3[]; song: Child[] }> {
    const r = await this.call<{
      starred2: { artist?: ArtistID3[]; album?: AlbumID3[]; song?: Child[] };
    }>('getStarred2');
    return {
      artist: r.starred2.artist ?? [],
      album: r.starred2.album ?? [],
      song: r.starred2.song ?? [],
    };
  }
  async search3(
    query: string,
    opts: { artistCount?: number; albumCount?: number; songCount?: number; offset?: number } = {},
  ) {
    const r = await this.call<{
      searchResult3: { artist?: ArtistID3[]; album?: AlbumID3[]; song?: Child[] };
    }>('search3', {
      query,
      artistCount: opts.artistCount ?? 10,
      albumCount: opts.albumCount ?? 20,
      songCount: opts.songCount ?? 30,
      artistOffset: opts.offset,
      albumOffset: opts.offset,
      songOffset: opts.offset,
    });
    return {
      artist: r.searchResult3.artist ?? [],
      album: r.searchResult3.album ?? [],
      song: r.searchResult3.song ?? [],
    };
  }
  async getRandomSongs(size = 50): Promise<Child[]> {
    return (
      (await this.call<{ randomSongs: { song?: Child[] } }>('getRandomSongs', { size })).randomSongs
        .song ?? []
    );
  }

  // ---- playlists ----
  async getPlaylists(): Promise<Playlist[]> {
    return (
      (await this.call<{ playlists: { playlist?: Playlist[] } }>('getPlaylists')).playlists
        .playlist ?? []
    );
  }
  async getPlaylist(id: string): Promise<Playlist> {
    return (await this.call<{ playlist: Playlist }>('getPlaylist', { id })).playlist;
  }
  async createPlaylist(name: string, songIds: string[] = []): Promise<Playlist> {
    const url = await this.url('createPlaylist', { name });
    const qs = songIds.map((s) => `&songId=${encodeURIComponent(s)}`).join('');
    const res = await fetch(url + qs);
    const body = (await res.json()) as SubsonicEnvelope<{ playlist: Playlist }>;
    return body['subsonic-response'].playlist;
  }
  async updatePlaylist(
    playlistId: string,
    opts: { name?: string; comment?: string; add?: string[]; removeIndexes?: number[] },
  ) {
    let url = await this.url('updatePlaylist', {
      playlistId,
      name: opts.name,
      comment: opts.comment,
    });
    url += (opts.add ?? []).map((s) => `&songIdToAdd=${encodeURIComponent(s)}`).join('');
    url += (opts.removeIndexes ?? []).map((i) => `&songIndexToRemove=${i}`).join('');
    await fetch(url);
  }
  deletePlaylist(id: string) {
    return this.call('deletePlaylist', { id });
  }

  // ---- starring / scrobble ----
  star(opts: { id?: string; albumId?: string; artistId?: string }) {
    return this.call('star', opts);
  }
  unstar(opts: { id?: string; albumId?: string; artistId?: string }) {
    return this.call('unstar', opts);
  }
  /** submission=true → count as play (Navidrome increments playCount, forwards to Last.fm/ListenBrainz if configured) */
  scrobble(id: string, submission = true, time?: number) {
    return this.call('scrobble', { id, submission, time });
  }

  // ---- binary ----
  /** maxBitRate=0 or undefined → original / server default. format='raw' bypasses transcoding. */
  stream(id: string, opts: { maxBitRate?: number; format?: string } = {}, headers?: HeadersInit) {
    return this.fetchBinary(
      'stream',
      { id, maxBitRate: opts.maxBitRate, format: opts.format, estimateContentLength: 'true' },
      headers,
    );
  }
  coverArt(id: string, size?: number) {
    return this.fetchBinary('getCoverArt', { id, size });
  }
  /** OpenSubsonic: getLyricsBySongId. Navidrome supports it (embedded/.lrc lyrics). lrclib fallback lives elsewhere. */
  async getLyricsBySongId(id: string) {
    const r = await this.call<{
      lyricsList: {
        structuredLyrics?: {
          lang: string;
          synced: boolean;
          line: { start?: number; value: string }[];
        }[];
      };
    }>('getLyricsBySongId', { id });
    return r.lyricsList.structuredLyrics ?? [];
  }
}

/** Login validation: ping + OpenSubsonic check. Throws typed errors for UI mapping. */
export async function validateServer(creds: SubsonicCredentials) {
  const client = new SubsonicClient(creds);
  const ping = await client.ping();
  if (!ping.openSubsonic) {
    throw new SubsonicNetworkError('server does not advertise OpenSubsonic support');
  }
  const ext = await client.getOpenSubsonicExtensions();
  return {
    client,
    serverVersion: ping.serverVersion,
    serverType: ping.type,
    extensions: ext.openSubsonicExtensions,
  };
}
