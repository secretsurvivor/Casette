import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AdminEntry } from '../../../shared/models';
import { GraphqlService } from '../../../core/services/graphql.service';
import { TmdbService } from '../../../core/services/tmdb.service';

@Component({
  selector: 'app-entry-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-header">
      <h2>Entries</h2>
      <a routerLink="/admin/entries/new" class="btn btn-primary">+ New Entry</a>
    </div>

    <div class="search-bar">
      <input type="text" placeholder="Search entries by title or tag..."
        (input)="onSearch($any($event.target).value)" />
    </div>

    @if (loading()) {
      <div class="loading">Loading entries...</div>
    } @else if (filtered().length === 0) {
      <div class="empty">No entries found.</div>
    } @else {
      <div class="entry-table">
        <div class="table-header">
          <span class="col-poster"></span>
          <span class="col-title">Title</span>
          <span class="col-type">Type</span>
          <span class="col-vis">Visible</span>
          <span class="col-videos">Videos</span>
          <span class="col-tags">Tags</span>
        </div>
        @for (entry of filtered(); track entry.id) {
          <div class="table-row" (click)="router.navigate(['/admin/entries', entry.id])">
            <span class="col-poster">
              <img [src]="tmdb.posterUrl(entry.posterPath, 'w342')" alt="" />
            </span>
            <span class="col-title">{{ entry.title }}</span>
            <span class="col-type">
              <span class="badge" [class.film]="entry.type === 'FILM'" [class.series]="entry.type === 'SERIES'">
                {{ entry.type }}
              </span>
            </span>
            <span class="col-vis">
              <span class="vis-dot" [class.visible]="entry.isVisible"></span>
            </span>
            <span class="col-videos">{{ entry.videoCount }}</span>
            <span class="col-tags">
              @for (tag of entry.tags; track tag) {
                <span class="tag">{{ tag }}</span>
              }
            </span>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    h2 {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 32px;
      letter-spacing: 2px;
      color: #f0eee8;
    }

    .btn {
      padding: 8px 20px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      border: none;
      transition: all 0.15s ease;
    }

    .btn-primary {
      background: #e8c97a;
      color: #0a0a0c;
      text-decoration: none;
    }

    .btn-primary:hover {
      background: #f0d78a;
    }

    .search-bar {
      margin-bottom: 20px;
    }

    .search-bar input {
      width: 100%;
      max-width: 400px;
      padding: 10px 16px;
      background: #16161c;
      border: 1px solid #2a2a32;
      border-radius: 8px;
      color: #f0eee8;
      font-size: 14px;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .search-bar input:focus {
      border-color: #e8c97a;
    }

    .loading, .empty {
      color: #666;
      padding: 40px 0;
      text-align: center;
      font-size: 14px;
    }

    .entry-table {
      border: 1px solid #1a1a22;
      border-radius: 8px;
      overflow: hidden;
    }

    .table-header {
      display: grid;
      grid-template-columns: 48px 1fr 80px 70px 60px 1fr;
      gap: 12px;
      padding: 10px 16px;
      background: #0f0f13;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #666;
    }

    .table-row {
      display: grid;
      grid-template-columns: 48px 1fr 80px 70px 60px 1fr;
      gap: 12px;
      padding: 8px 16px;
      align-items: center;
      cursor: pointer;
      transition: background 0.12s ease;
      border-top: 1px solid #1a1a22;
    }

    .table-row:hover {
      background: #16161c;
    }

    .col-poster img {
      width: 36px;
      height: 54px;
      object-fit: cover;
      border-radius: 4px;
    }

    .col-title {
      font-weight: 400;
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 500;
    }

    .badge.film {
      background: rgba(100, 149, 237, 0.15);
      color: #6495ed;
    }

    .badge.series {
      background: rgba(144, 238, 144, 0.15);
      color: #90ee90;
    }

    .vis-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #444;
    }

    .vis-dot.visible {
      background: #4ade80;
    }

    .col-videos {
      font-size: 14px;
      color: #888;
      text-align: center;
    }

    .col-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .tag {
      font-size: 11px;
      padding: 2px 8px;
      background: #1a1a22;
      border-radius: 4px;
      color: #888;
    }
  `]
})
export class EntryListComponent implements OnInit {
  entries = signal<AdminEntry[]>([]);
  searchTerm = signal('');
  loading = signal(true);

  filtered = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.entries();
    return this.entries().filter(e =>
      e.title.toLowerCase().includes(term) ||
      e.tags.some(t => t.toLowerCase().includes(term))
    );
  });

  constructor(
    private graphql: GraphqlService,
    public tmdb: TmdbService,
    public router: Router,
  ) {}

  ngOnInit() {
    this.loadEntries();
  }

  loadEntries() {
    this.loading.set(true);
    this.graphql.getAdminEntries().subscribe({
      next: entries => {
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(value: string) {
    this.searchTerm.set(value);
  }
}
