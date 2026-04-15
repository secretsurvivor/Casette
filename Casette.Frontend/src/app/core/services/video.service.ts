import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class VideoService {
  constructor(private http: HttpClient) {}

  getStreamUrl(videoId: string): Observable<string> {
    return this.http
      .get<{ streamUrl: string }>(`${environment.apiUrl}/video/${videoId}/stream`)
      .pipe(map(res => res.streamUrl));
  }

  saveProgress(videoId: string, positionInSeconds: number): Observable<void> {
    return this.http.put<void>(
      `${environment.apiUrl}/video/${videoId}/progress`,
      positionInSeconds
    );
  }
}
