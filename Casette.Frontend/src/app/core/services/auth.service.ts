import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse } from '../../shared/models';

const TOKEN_KEY = 'casette_token';
const ADMIN_KEY = 'casette_admin';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient, private router: Router) {}

  login(accessKey: string, rememberMe: boolean) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { accessKey, rememberMe })
      .pipe(
        tap(res => {
          const storage = rememberMe ? localStorage : sessionStorage;
          storage.setItem(TOKEN_KEY, res.token);
          storage.setItem(ADMIN_KEY, String(res.isAdmin));
        })
      );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
    sessionStorage.removeItem(ADMIN_KEY);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    const val = localStorage.getItem(ADMIN_KEY) ?? sessionStorage.getItem(ADMIN_KEY);
    return val === 'true';
  }
}
