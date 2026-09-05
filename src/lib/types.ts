// Client-safe track shape (subset of Subsonic Child). Never includes server creds.
export interface Track {
  id: string;
  title: string;
  artist?: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  coverArt?: string;
  duration?: number;
  track?: number;
  discNumber?: number;
  starred?: boolean;
  trackGain?: number; // ReplayGain dB, from OpenSubsonic
  albumGain?: number;
  created?: string;
  playCount?: number;
}
