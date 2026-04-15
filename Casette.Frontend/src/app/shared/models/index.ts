export interface AuthResponse {
  token: string;
  isAdmin: boolean;
}

export interface LibraryEntry {
  id: string;
  title: string;
  type: 'FILM' | 'SERIES';
  popularity: number;
  releaseDate: string;
  durationInSeconds: number;
  posterPath: string;
  backdropPath: string;
}

export interface EntryDetail {
  id: string;
  title: string;
  overview: string;
  releaseDate: string;
  posterPath: string;
  backdropPath: string;
  videoId: string;
  videoMarkers: VideoMarker[];
  durationInSeconds: number;
  currentProgressInSeconds: number | null;
  inCollection: boolean;
  isSeries: boolean;
}

export interface VideoMarker {
  id: string;
  startInSeconds: number;
  endInSeconds: number;
  type: number;
}

export const VideoMarkerType = {
  Skip: 0,
  Credits: 1,
} as const;

export const EntryType = {
  Film: 0,
  Series: 1,
} as const;

export interface AdminEntry {
  id: string;
  title: string;
  type: 'FILM' | 'SERIES';
  isVisible: boolean;
  posterPath: string;
  tags: string[];
  videoCount: number;
}

export interface AdminVideo {
  id: string;
  entryId: string;
  entryTitle: string;
  filename: string;
  durationInSeconds: number;
  isDefault: boolean;
  created: string;
  markerCount: number;
}

export interface AdminCollection {
  id: string;
  title: string;
  entries: CollectionEntryItem[];
}

export interface CollectionEntryItem {
  entryId: string;
  title: string;
  position: number;
  posterPath: string;
}

export interface AdminSeason {
  id: string;
  entryId: string;
  position: number;
  episodes: EpisodeItem[];
}

export interface EpisodeItem {
  position: number;
  videoId: string;
  videoMarkers?: VideoMarker[];
}

// ── Navigation / Playback ────────────────────────────────

export interface NavigationItem {
  entryId: string;
  videoId: string;
  title: string;
  label: string;
}

export interface PlaybackNavigation {
  previous: NavigationItem | null;
  next: NavigationItem | null;
  currentLabel: string;
}

export interface ProgressEntry {
  videoId: string;
  entryId: string;
  posterPath: string;
  backdropPath: string;
  positionInSeconds: number;
  durationInSeconds: number;
}

/** State passed via Angular router navigate extras – no query params. */
export interface PlayerState {
  videoId?: string;
  collectionId?: string;
  positionInSeconds?: number;
}

// ── TMDB ─────────────────────────────────────────────────

export interface TmdbSearchResult {
  id: number;
  title: string;
  releaseDate: string;
  posterPath: string;
  voteAverage: number;
  voteCount: number;
}

export interface TmdbSearchResponse {
  page: number;
  results: TmdbSearchResult[];
  totalPages: number;
  totalResults: number;
}

// ── Pagination ────────────────────────────────────────────

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface PaginatedResult<T> {
  nodes: T[];
  pageInfo: PageInfo;
  totalCount: number;
}

// ── Helpers ──────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const mins = Math.round(seconds / 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
