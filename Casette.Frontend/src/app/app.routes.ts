import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'library',
    loadComponent: () =>
      import('./features/library/library.component').then(m => m.LibraryComponent),
    canActivate: [authGuard],
  },
  {
    path: 'player/:id',
    loadComponent: () =>
      import('./features/player/player.component').then(m => m.PlayerComponent),
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes'),
    canActivate: [adminGuard],
  },
  { path: '', redirectTo: 'library', pathMatch: 'full' },
  { path: '**', redirectTo: 'library' },
];
