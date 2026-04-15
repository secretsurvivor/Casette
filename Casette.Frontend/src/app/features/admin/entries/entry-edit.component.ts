import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EntryDetail } from '../../../shared/models';
import { EntryService } from '../../../core/services/entry.service';
import { AdminService } from '../../../core/services/admin.service';
import { GraphqlService } from '../../../core/services/graphql.service';
import { TmdbService } from '../../../core/services/tmdb.service';

@Component({
  selector: 'app-entry-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h2>Edit Entry</h2>
    </div>

    @if (loading()) {
      <div class="loading">Loading...</div>
    } @else if (entry()) {
      <div class="edit-card">
        <div class="edit-layout">
          <div class="poster-side">
            <img [src]="tmdb.posterUrl(entry()!.posterPath, 'w500')" alt="" class="edit-poster" />
            <div class="poster-meta">
              @if (entry()!.isSeries) {
                <span class="badge series">SERIES</span>
              } @else {
                <span class="badge film">FILM</span>
              }
            </div>
          </div>

          <div class="form-side">
            <div class="field">
              <label>Title</label>
              <input type="text" [(ngModel)]="title" />
            </div>

            <div class="field">
              <label>Overview</label>
              <div class="readonly-text">{{ entry()!.overview }}</div>
            </div>

            <div class="field">
              <label>Release Date</label>
              <div class="readonly-text">{{ entry()!.releaseDate }}</div>
            </div>

            <div class="field">
              <label>Tags (comma-separated)</label>
              <input type="text" [(ngModel)]="tagsInput" placeholder="action, sci-fi" />
            </div>

            <div class="field">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="isVisible" />
                <span>Visible in library</span>
              </label>
            </div>

            <div class="form-actions">
              <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
                {{ saving() ? 'Saving...' : 'Save Changes' }}
              </button>
              <button class="btn btn-danger" (click)="confirmDelete()" [disabled]="deleting()">
                {{ deleting() ? 'Deleting...' : 'Delete Entry' }}
              </button>
            </div>

            @if (message()) {
              <div class="message" [class.error]="isError()">{{ message() }}</div>
            }
          </div>
        </div>
      </div>
    } @else {
      <div class="loading">Entry not found.</div>
    }
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }

    h2 {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 32px;
      letter-spacing: 2px;
      color: #f0eee8;
    }

    .loading {
      color: #666;
      padding: 40px 0;
      text-align: center;
      font-size: 14px;
    }

    .edit-card {
      background: #0f0f13;
      border: 1px solid #1a1a22;
      border-radius: 10px;
      padding: 24px;
    }

    .edit-layout {
      display: flex;
      gap: 32px;
      align-items: flex-start;
    }

    .poster-side {
      flex-shrink: 0;
    }

    .edit-poster {
      width: 200px;
      border-radius: 8px;
    }

    .poster-meta {
      margin-top: 12px;
      display: flex;
      gap: 8px;
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

    .form-side {
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

    .readonly-text {
      font-size: 14px;
      color: #888;
      line-height: 1.5;
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

    .btn-danger {
      background: rgba(239, 68, 68, 0.12);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }

    .btn-danger:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.22);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .message {
      font-size: 13px;
      color: #4ade80;
    }

    .message.error {
      color: #ef4444;
    }
  `]
})
export class EntryEditComponent implements OnInit {
  entry = signal<EntryDetail | null>(null);
  loading = signal(true);
  saving = signal(false);
  deleting = signal(false);
  message = signal('');
  isError = signal(false);

  title = '';
  tagsInput = '';
  isVisible = true;

  private entryId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private entryService: EntryService,
    private admin: AdminService,
    private graphql: GraphqlService,
    public tmdb: TmdbService,
  ) {}

  ngOnInit() {
    this.entryId = this.route.snapshot.paramMap.get('id')!;
    this.loadEntry();
  }

  private loadEntry() {
    this.loading.set(true);
    this.entryService.getDetail(this.entryId).subscribe({
      next: (entry) => {
        this.entry.set(entry);
        this.title = entry.title;
        this.loadAdminData();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadAdminData() {
    this.graphql.getAdminEntries().subscribe(entries => {
      const adminEntry = entries.find(e => e.id === this.entryId);
      if (adminEntry) {
        this.tagsInput = adminEntry.tags.join(', ');
        this.isVisible = adminEntry.isVisible;
      }
    });
  }

  save() {
    if (!this.title.trim()) return;
    this.saving.set(true);
    this.message.set('');

    const tags = this.tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    this.admin.updateEntry(this.entryId, {
      title: this.title.trim(),
      isVisible: this.isVisible,
      tags,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set('Changes saved successfully.');
        this.isError.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        this.message.set(err?.error?.message || 'Failed to save changes.');
        this.isError.set(true);
      },
    });
  }

  confirmDelete() {
    if (!confirm('Are you sure you want to delete this entry? This cannot be undone.')) return;
    this.deleting.set(true);
    this.admin.deleteEntry(this.entryId).subscribe({
      next: () => this.router.navigate(['/admin/entries']),
      error: (err) => {
        this.deleting.set(false);
        this.message.set(err?.error?.message || 'Failed to delete entry.');
        this.isError.set(true);
      },
    });
  }
}
