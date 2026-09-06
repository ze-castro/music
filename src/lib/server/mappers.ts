import type { Child } from './subsonic/types';
import type { Track } from '$lib/types';

export const toTrack = (s: Child, fallbackCover?: string): Track => ({
  id: s.id,
  title: s.title,
  artist: s.artist,
  artistId: s.artistId,
  album: s.album,
  albumId: s.albumId,
  coverArt: s.coverArt ?? fallbackCover,
  duration: s.duration,
  track: s.track,
  discNumber: s.discNumber,
  starred: !!s.starred,
  created: s.created,
  playCount: s.playCount ?? 0,
});
