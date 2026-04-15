import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { catchError, map, of } from 'rxjs';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const http = inject(HttpClient);

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (!auth.isAdmin()) {
    router.navigate(['/library']);
    return false;
  }

  return http.get(`${environment.apiUrl}/auth/validate/admin`).pipe(
    map(() => true),
    catchError(() => {
      router.navigate(['/library']);
      return of(false);
    })
  );
};
