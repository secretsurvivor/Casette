import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  LibraryEntry,
  AdminEntry,
  AdminVideo,
  AdminCollection,
  AdminSeason,
  ProgressEntry,
  PaginatedResult,
} from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class GraphqlService {
  private url = `${environment.apiUrl}/graphql`;

  constructor(private http: HttpClient) {}

  private query<T>(query: string, variables?: object): Observable<T> {
    return this.http
      .post<{ data: T }>(this.url, { query, variables })
      .pipe(map(res => res.data));
  }

  getEntries(searchString?: string): Observable<LibraryEntry[]> {
    return this.query<{ entries: { nodes: LibraryEntry[] } }>(`
      query GetEntries($searchString: String) {
        entries(searchString: $searchString) {
          nodes {
            id
            title
            type
            popularity
            releaseDate
            durationInSeconds
            posterPath
            backdropPath
          }
        }
      }
    `, searchString ? { searchString } : undefined).pipe(
      map(data => data.entries?.nodes ?? [])
    );
  }

  getAdminEntries(searchString?: string): Observable<AdminEntry[]> {
    return this.query<{ adminEntries: AdminEntry[] }>(`
      query GetAdminEntries($searchString: String) {
        adminEntries(searchString: $searchString) {
          id
          title
          type
          isVisible
          posterPath
          tags
          videoCount
        }
      }
    `, searchString ? { searchString } : undefined).pipe(
      map(data => data.adminEntries ?? [])
    );
  }

  /** Paginated videos with proper GraphQL variables. */
  getVideosPaginated(opts: { first?: number; after?: string; entryId?: string; filenameContains?: string } = {}): Observable<PaginatedResult<AdminVideo>> {
    const where: Record<string, any> = {};
    if (opts.entryId) where['entryId'] = { eq: opts.entryId };
    if (opts.filenameContains) where['filename'] = { contains: opts.filenameContains };

    return this.query<{ videos: PaginatedResult<AdminVideo> }>(`
      query GetVideos($first: Int, $after: String, $where: AdminVideoResponseFilterInput) {
        videos(first: $first, after: $after, where: $where) {
          nodes {
            id
            entryId
            entryTitle
            filename
            durationInSeconds
            isDefault
            created
            markerCount
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          totalCount
        }
      }
    `, {
      first: opts.first ?? 20,
      after: opts.after ?? null,
      ...(Object.keys(where).length > 0 ? { where } : {}),
    }).pipe(
      map(data => data.videos ?? { nodes: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, totalCount: 0 })
    );
  }

  /** Non-paginated convenience — returns all nodes (up to MaxPageSize). */
  getVideos(entryId?: string): Observable<AdminVideo[]> {
    return this.getVideosPaginated({ entryId }).pipe(
      map(result => result.nodes)
    );
  }

  getCollections(): Observable<AdminCollection[]> {
    return this.query<{ collections: { nodes: AdminCollection[] } }>(`
      query GetCollections {
        collections {
          nodes {
            id
            title
            entries {
              entryId
              title
              position
              posterPath
            }
          }
        }
      }
    `).pipe(
      map(data => data.collections?.nodes ?? [])
    );
  }

  /** Load seasons for a specific entry (lightweight — no videoMarkers). */
  getSeasonsByEntry(entryId: string): Observable<AdminSeason[]> {
    return this.query<{ adminSeasons: AdminSeason[] }>(`
      query GetAdminSeasons($where: AdminSeasonResponseFilterInput) {
        adminSeasons(where: $where) {
          id
          entryId
          position
          episodes {
            position
            videoId
          }
        }
      }
    `, { where: { entryId: { eq: entryId } } }).pipe(
      map(data => data.adminSeasons ?? [])
    );
  }

  /** Load all seasons (used by player for navigation). */
  getSeasons(): Observable<AdminSeason[]> {
    return this.query<{ seasons: { nodes: AdminSeason[] } }>(`
      query GetSeasons {
        seasons {
          nodes {
            id
            entryId
            position
            episodes {
              position
              videoId
              videoMarkers {
                id
                startInSeconds
                endInSeconds
                type
              }
            }
          }
        }
      }
    `).pipe(
      map(data => data.seasons?.nodes ?? [])
    );
  }

  getProgress(): Observable<ProgressEntry[]> {
    return this.query<{ progress: { nodes: ProgressEntry[] } }>(`
      query GetProgress {
        progress {
          nodes {
            videoId
            entryId
            posterPath
            backdropPath
            positionInSeconds
            durationInSeconds
          }
        }
      }
    `).pipe(
      map(data => data.progress?.nodes ?? [])
    );
  }
}
