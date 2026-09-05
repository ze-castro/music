export interface SubsonicError {
  code: number;
  message: string;
}

export interface SubsonicEnvelope<T = Record<string, unknown>> {
  'subsonic-response': {
    status: 'ok' | 'failed';
    version: string;
    type?: string;
    serverVersion?: string;
    openSubsonic?: boolean;
    error?: SubsonicError;
  } & T;
}

export interface Child {
  id: string;
  parent?: string;
  isDir: boolean;
  title: string;
  album?: string;
  artist?: string;
  albumId?: string;
  artistId?: string;
  track?: number;
  discNumber?: number;
  year?: number;
  genre?: string;
  coverArt?: string;
  size?: number;
  contentType?: string;
  suffix?: string;
  duration?: number;
  bitRate?: number;
  path?: string;
  starred?: string;
  playCount?: number;
  created?: string;
  replayGain?: { trackGain?: number; albumGain?: number; trackPeak?: number; albumPeak?: number };
}

export interface ScanStatus {
  scanning: boolean;
  count?: number;
  folderCount?: number;
  lastScan?: string;
}

export interface AlbumID3 {
  id: string;
  name: string;
  artist?: string;
  artistId?: string;
  coverArt?: string;
  songCount: number;
  duration: number;
  playCount?: number;
  created: string;
  starred?: string;
  year?: number;
  genre?: string;
  song?: Child[];
}

export interface ArtistID3 {
  id: string;
  name: string;
  coverArt?: string;
  artistImageUrl?: string;
  albumCount?: number;
  starred?: string;
  album?: AlbumID3[];
}

export interface Playlist {
  id: string;
  name: string;
  comment?: string;
  owner?: string;
  public?: boolean;
  songCount: number;
  duration: number;
  created: string;
  changed: string;
  coverArt?: string;
  entry?: Child[];
}

export interface Genre {
  value: string;
  songCount: number;
  albumCount: number;
}

export type AlbumListType =
  | 'random'
  | 'newest'
  | 'recent'
  | 'frequent'
  | 'starred'
  | 'alphabeticalByName'
  | 'alphabeticalByArtist'
  | 'byYear'
  | 'byGenre';
