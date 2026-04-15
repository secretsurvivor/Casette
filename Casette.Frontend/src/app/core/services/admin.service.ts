import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TmdbSearchResponse, VideoMarker } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // --- Entries ---

  createEntry(body: { title: string; type: number; tmdbId: number; isVisible: boolean; tags: string[] }): Observable<string> {
    return this.http.post(`${this.api}/entry`, body, { responseType: 'text' });
  }

  updateEntry(id: string, body: { title: string; isVisible: boolean; tags: string[] }): Observable<void> {
    return this.http.put<void>(`${this.api}/entry/${id}`, body);
  }

  deleteEntry(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/entry/${id}`);
  }

  // --- Collections ---

  createCollection(title: string): Observable<string> {
    return this.http.post(`${this.api}/collection`, { title }, { responseType: 'text' });
  }

  updateCollection(id: string, title: string): Observable<void> {
    return this.http.put<void>(`${this.api}/collection/${id}`, { title });
  }

  deleteCollection(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/collection/${id}`);
  }

  addCollectionEntry(collectionId: string, entryId: string, position: number): Observable<void> {
    return this.http.post<void>(`${this.api}/collection/${collectionId}/entry`, { position, entryId });
  }

  updateCollectionEntry(collectionId: string, entryId: string, position: number): Observable<void> {
    return this.http.put<void>(`${this.api}/collection/${collectionId}/entry/${entryId}`, { position });
  }

  removeCollectionEntry(collectionId: string, entryId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/collection/${collectionId}/entry/${entryId}`);
  }

  // --- Seasons ---

  createSeason(entryId: string, position: number): Observable<string> {
    return this.http.post(`${this.api}/season`, { position, entryId }, { responseType: 'text' });
  }

  updateSeason(id: string, position: number): Observable<void> {
    return this.http.put<void>(`${this.api}/season/${id}`, { position });
  }

  deleteSeason(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/season/${id}`);
  }

  addEpisode(seasonId: string, videoId: string, position: number): Observable<void> {
    return this.http.post<void>(`${this.api}/season/${seasonId}/episode`, { position, videoId });
  }

  updateEpisode(seasonId: string, videoId: string, position: number): Observable<void> {
    return this.http.put<void>(`${this.api}/season/${seasonId}/episode/${videoId}`, { position });
  }

  removeEpisode(seasonId: string, videoId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/season/${seasonId}/episode/${videoId}`);
  }

  // --- Video Markers ---

  getMarkers(videoId: string): Observable<VideoMarker[]> {
    return this.http.get<VideoMarker[]>(`${this.api}/video/${videoId}/markers`);
  }

  createMarker(body: { videoId: string; startInSeconds: number; endInSeconds: number; type: number }): Observable<string> {
    return this.http.post(`${this.api}/video/marker`, body, { responseType: 'text' });
  }

  updateMarker(id: string, body: { startInSeconds: number; endInSeconds: number; type: number }): Observable<void> {
    return this.http.put<void>(`${this.api}/video/marker/${id}`, body);
  }

  deleteMarker(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/video/marker/${id}`);
  }

  // --- Video Default ---

  setDefaultVideo(videoId: string): Observable<void> {
    return this.http.put<void>(`${this.api}/video/${videoId}/default`, {});
  }

  // --- TMDB Search ---

  searchMovies(query: string, page = 1): Observable<TmdbSearchResponse> {
    const params = new HttpParams().set('query', query).set('page', page);
    return this.http.get<TmdbSearchResponse>(`${this.api}/tmdb/search/movie`, { params });
  }

  searchTv(query: string, page = 1): Observable<TmdbSearchResponse> {
    const params = new HttpParams().set('query', query).set('page', page);
    return this.http.get<TmdbSearchResponse>(`${this.api}/tmdb/search/tv`, { params });
  }
}
