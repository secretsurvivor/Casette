import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EntryDetail } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class EntryService {
  constructor(private http: HttpClient) {}

  getDetail(id: string): Observable<EntryDetail> {
    return this.http.get<EntryDetail>(`${environment.apiUrl}/entry/${id}`);
  }
}
