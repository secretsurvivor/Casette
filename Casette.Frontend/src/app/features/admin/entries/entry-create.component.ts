import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { TmdbSearchResult, EntryType } from '../../../shared/models';
import { TmdbService } from '../../../core/services/tmdb.service';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-entry-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h2>Create Entry</h2>
    </div>

    @if (!selectedResult()) {
      <!-- Step 1: TMDB Search -->
      <div class="step-card">
        <div class="step-label">Step 1 — Search TMDB</div>

        <div class="type-toggle">
          <button [class.active]="searchType() === 'movie'" (click)="searchType.set('movie'); resetSearch()">Film</button>
          <button [class.active]="searchType() === 'tv'" (click)="searchType.set('tv'); resetSearch()">TV Series</button>
        </div>

        <div class="search-bar">
          <input type="text" [placeholder]="'Search for a ' + (searchType() === 'movie' ? 'movie' : 'TV show') + '...'"
            (input)="onSearchInput($any($event.target).value)" />
        </div>

        @if (searching()) {
          <div class="status">Searching...</div>
        }

        @if (results().length > 0) {
          <div class="results-grid">
            @for (result of results(); track result.id) {
              <div class="result-card" (click)="selectResult(result)">
                <img [src]="tmdb.posterUrl(result.posterPath, 'w342')" alt="" class="result-poster" />
                <div class="result-info">
                  <div class="result-title">{{ result.title }}</div>
                  <div class="result-meta">
                    {{ result.releaseDate | date:'yyyy' }}
                    @if (result.voteAverage > 0) {
                      <span> · ★ {{ result.voteAverage | number:'1.1-1' }}</span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        } @else if (!searching() && searchPerformed()) {
          <div class="status">No results found.</div>
        }
      </div>
    } @else {
      <!-- Step 2: Confirm & Create -->
      <div class="step-card">
        <div class="step-label">Step 2 — Confirm Entry</div>

        <div class="confirm-layout">
          <img [src]="tmdb.posterUrl(selectedResult()!.posterPath, 'w342')" alt="" class="confirm-poster" />
          <div class="confirm-form">
            <div class="field">
              <label>Title</label>
              <input type="text" [(ngModel)]="title" />
            </div>

            <div class="field">
              <label>Type</label>
              <div class="type-display">{{ searchType() === 'movie' ? 'Film' : 'TV Series' }}</div>
            </div>

            <div class="field">
              <label>TMDB ID</label>
              <div class="type-display">{{ selectedResult()!.id }}</div>
            </div>

            <div class="field">
              <label>Tags (comma-separated)</label>
              <input type="text" [(ngModel)]="tagsInput" placeholder="action, sci-fi, thriller" />
            </div>

            <div class="field">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="isVisible" />
                <span>Visible in library</span>
              </label>
            </div>

            <div class="form-actions">
              <button class="btn btn-ghost" (click)="selectedResult.set(null)">← Back to search</button>
              <button class="btn btn-primary" (click)="create()" [disabled]="saving()">
                {{ saving() ? 'Creating...' : 'Create Entry' }}
              </button>
            </div>

            @if (error()) {
              <div class="error">{{ error() }}</div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-header {
      margin-bottom: 24px;
    }

    h2 {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 32px;
      letter-spacing: 2px;
      color: #f0eee8;
    }

    .step-card {
      background: #0f0f13;
      border: 1px solid #1a1a22;
      border-radius: 10px;
      padding: 24px;
    }

    .step-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #e8c97a;
      margin-bottom: 20px;
    }

    .type-toggle {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .type-toggle button {
      padding: 8px 20px;
      border: 1px solid #2a2a32;
      border-radius: 6px;
      background: transparent;
      color: #888;
      font-size: 13px;
      transition: all 0.15s ease;
    }

    .type-toggle button.active {
      background: #e8c97a;
      color: #0a0a0c;
      border-color: #e8c97a;
      font-weight: 500;
    }

    .search-bar input {
      width: 100%;
      max-width: 500px;
      padding: 10px 16px;
      background: #16161c;
      border: 1px solid #2a2a32;
      border-radius: 8px;
      color: #f0eee8;
      font-size: 14px;
      outline: none;
    }

    .search-bar input:focus {
      border-color: #e8c97a;
    }

    .status {
      color: #666;
      padding: 20px 0;
      font-size: 14px;
    }

    .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }

    .result-card {
      cursor: pointer;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid transparent;
      transition: all 0.15s ease;
      background: #16161c;
    }

    .result-card:hover {
      border-color: #e8c97a;
      transform: translateY(-2px);
    }

    .result-poster {
      width: 100%;
      aspect-ratio: 2 / 3;
      object-fit: cover;
    }

    .result-info {
      padding: 8px 10px 10px;
    }

    .result-title {
      font-size: 13px;
      font-weight: 400;
      line-height: 1.3;
      margin-bottom: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .result-meta {
      font-size: 12px;
      color: #666;
    }

    /* Confirm layout */
    .confirm-layout {
      display: flex;
      gap: 32px;
      align-items: flex-start;
    }

    .confirm-poster {
      width: 200px;
      border-radius: 8px;
      flex-shrink: 0;
    }

    .confirm-form {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .field label {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666;
      margin-bottom: 6px;
    }

    .field input[type="text"] {
      width: 100%;
      padding: 10px 14px;
      background: #16161c;
      border: 1px solid #2a2a32;
      border-radius: 6px;
      color: #f0eee8;
      font-size: 14px;
      outline: none;
    }

    .field input[type="text"]:focus {
      border-color: #e8c97a;
    }

    .type-display {
      font-size: 14px;
      color: #bbb;
      padding: 8px 0;
    }

    .checkbox-label {
      display: flex !important;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
      accent-color: #e8c97a;
      width: 16px;
      height: 16px;
    }

    .checkbox-label span {
      font-size: 14px;
      color: #ccc;
      text-transform: none;
      letter-spacing: 0;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-top: 8px;
    }

    .btn {
      padding: 10px 24px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-primary {
      background: #e8c97a;
      color: #0a0a0c;
    }

    .btn-primary:hover:not(:disabled) {
      background: #f0d78a;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-ghost {
      background: transparent;
      color: #888;
      border: 1px solid #2a2a32;
    }

    .btn-ghost:hover {
      color: #f0eee8;
      border-color: #444;
    }

    .error {
      color: #ef4444;
      font-size: 13px;
      margin-top: 4px;
    }
  `]
})
export class EntryCreateComponent {
  searchType = signal<'movie' | 'tv'>('movie');
  results = signal<TmdbSearchResult[]>([]);
  searching = signal(false);
  searchPerformed = signal(false);
  selectedResult = signal<TmdbSearchResult | null>(null);

  title = '';
  tagsInput = '';
  isVisible = true;
  saving = signal(false);
  error = signal('');

  private searchSubject = new Subject<string>();

  constructor(
    public tmdb: TmdbService,
    private admin: AdminService,
    private router: Router,
  ) {
    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query.trim()) {
          this.searching.set(false);
          return of(null);
        }
        this.searching.set(true);
        return this.searchType() === 'movie'
          ? this.admin.searchMovies(query)
          : this.admin.searchTv(query);
      })
    ).subscribe(res => {
      this.searching.set(false);
      if (res) {
        this.results.set(res.results);
        this.searchPerformed.set(true);
      } else {
        this.results.set([]);
      }
    });
  }

  onSearchInput(value: string) {
    this.searchSubject.next(value);
  }

  resetSearch() {
    this.results.set([]);
    this.searchPerformed.set(false);
  }

  selectResult(result: TmdbSearchResult) {
    this.selectedResult.set(result);
    this.title = result.title;
  }

  create() {
    if (!this.selectedResult() || !this.title.trim()) return;
    this.saving.set(true);
    this.error.set('');

    const tags = this.tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    this.admin.createEntry({
      title: this.title.trim(),
      type: this.searchType() === 'movie' ? EntryType.Film : EntryType.Series,
      tmdbId: this.selectedResult()!.id,
      isVisible: this.isVisible,
      tags,
    }).subscribe({
      next: (id) => {
        // Response is the new entry GUID as text
        const cleanId = id.replace(/"/g, '');
        this.router.navigate(['/admin/entries', cleanId]);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to create entry');
        this.saving.set(false);
      },
    });
  }
}
