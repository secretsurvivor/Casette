import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout.component';

export default [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'entries', pathMatch: 'full' as const },
      {
        path: 'entries',
        loadComponent: () =>
          import('./entries/entry-list.component').then(m => m.EntryListComponent),
      },
      {
        path: 'entries/new',
        loadComponent: () =>
          import('./entries/entry-create.component').then(m => m.EntryCreateComponent),
      },
      {
        path: 'entries/:id',
        loadComponent: () =>
          import('./entries/entry-edit.component').then(m => m.EntryEditComponent),
      },
      {
        path: 'videos',
        loadComponent: () =>
          import('./videos/video-list.component').then(m => m.VideoListComponent),
      },
      {
        path: 'videos/:videoId/markers',
        loadComponent: () =>
          import('./videos/marker-editor.component').then(m => m.MarkerEditorComponent),
      },
      {
        path: 'collections',
        loadComponent: () =>
          import('./collections/collection-list.component').then(m => m.CollectionListComponent),
      },
      {
        path: 'collections/:id',
        loadComponent: () =>
          import('./collections/collection-edit.component').then(m => m.CollectionEditComponent),
      },
      {
        path: 'seasons',
        loadComponent: () =>
          import('./seasons/season-list.component').then(m => m.SeasonListComponent),
      },
    ],
  },
] satisfies Routes;
