import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TmdbService {
  posterUrl(path: string | null, size: 'w342' | 'w500' | 'original' = 'w342'): string {
    if (!path) return '/assets/poster-placeholder.svg';
    return `${environment.tmdbImageBase}/${size}${path}`;
  }

  backdropUrl(path: string | null, size: 'w1280' | 'original' = 'w1280'): string {
    if (!path) return '/assets/backdrop-placeholder.svg';
    return `${environment.tmdbImageBase}/${size}${path}`;
  }
}
