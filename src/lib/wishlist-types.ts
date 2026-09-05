export type WishKind = 'artist' | 'album' | 'track';
export interface WishItem {
  kind: WishKind;
  deezerId: number;
  title: string; // album title / track title / artist name
  artist?: string; // for album + track
  album?: string; // for track
  cover: string;
  link: string; // deezer page
  preview?: string; // track only
  year?: string;
}
export interface WishRow extends WishItem {
  id: string;
  addedAt: string;
}
