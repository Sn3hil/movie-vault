export interface WatchedEntry {
  id: string;
  name: string;
  rating: number;
  addedAt: string;
  poster?: string;
  criticRating?: number;
  tmdbUrl?: string;
  year?: string;
  tmdbId: number;
  type: 'movie' | 'tv';
}

export interface WatchlistEntry {
  id: string;
  name: string;
  addedAt: string;
  poster?: string;
  criticRating?: number;
  tmdbUrl?: string;
  year?: string;
  tmdbId: number;
  type: 'movie' | 'tv';
}

export interface RewatchEntry {
  id: string;
  name: string;
  addedAt: string;
  poster?: string;
  criticRating?: number;
  tmdbUrl?: string;
  year?: string;
  tmdbId: number;
  type: 'movie' | 'tv';
}

export interface WatchlistOverlaps {
  [key: string]: string[];
}

export interface UserData {
  watched: WatchedEntry[];
  watchlist: WatchlistEntry[];
  rewatch: RewatchEntry[];
  watchlistOverlaps: WatchlistOverlaps;
}

export interface RoomRatings {
  [username: string]: number;
}

export interface RoomWatchedEntry {
  id: string;
  name: string;
  rating: number;
  ratings: RoomRatings;
  addedAt: string;
  poster?: string;
  criticRating?: number;
  addedBy: string;
  tmdbUrl?: string;
  year?: string;
  tmdbId: number;
  type: 'movie' | 'tv';
}

export type RoomWatchlistEntry = WatchlistEntry & {
  addedBy: string;
};

export type RoomRewatchEntry = RewatchEntry & {
  addedBy: string;
};

export interface RoomData {
  watched: RoomWatchedEntry[];
  watchlist: RoomWatchlistEntry[];
  rewatch: RoomRewatchEntry[];
}

export type TabType = 'personal' | 'room';

export interface MovieSearchResult {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  media_type: 'movie' | 'tv';
}
