import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminCollection } from '../../../shared/models';
import { GraphqlService } from '../../../core/services/graphql.service';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-collection-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="page-header">
      <h2>Collections</h2>
    </div>

    <!-- Create new collection -->
    <div class="create-row">
      <input type="text" [(ngModel)]="newTitle" placeholder="New collection title..."
        (keyup.enter)="createCollection()" />
      <button class="btn btn-primary" (click)="createCollection()" [disabled]="!newTitle.trim() || creating()">
        {{ creating() ? 'Creating...' : '+ Create' }}
      </button>
    </div>

    @if (loading()) {
      <div class="loading">Loading collections...</div>
    } @else if (collections().length === 0) {
      <div class="empty">No collections yet.</div>
    } @else {
      <div class="collection-grid">
        @for (col of collections(); track col.id) {
          <div class="collection-card" (click)="router.navigate(['/admin/collections', col.id])">
            <div class="card-header">
              <span class="card-title">{{ col.title }}</span>
              <button class="icon-btn danger" (click)="deleteCollection(col, $event)" title="Delete">✕</button>
            </div>
            <div class="card-entries">
              {{ col.entries.length }} {{ col.entries.length === 1 ? 'entry' : 'entries' }}
            </div>
            @if (col.entries.length > 0) {
              <div class="poster-strip">
                @for (entry of col.entries.slice(0, 5); track entry.entryId) {
                  <img [src]="posterUrl(entry.posterPath)" alt="" />
                }
              </div>
            }
          </div>
        }
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

    .create-row {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
    }

    .create-row input {
      flex: 1;
      max-width: 400px;
      padding: 10px 16px;
      background: #16161c;
      border: 1px solid #2a2a32;
      border-radius: 8px;
      color: #f0eee8;
      font-size: 14px;
      outline: none;
    }

    .create-row input:focus {
      border-color: #e8c97a;
    }

    .btn {
      padding: 10px 20px;
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

    .loading, .empty {
      color: #666;
      padding: 40px 0;
      text-align: center;
      font-size: 14px;
    }

    .collection-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .collection-card {
      background: #0f0f13;
      border: 1px solid #1a1a22;
      border-radius: 10px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .collection-card:hover {
      border-color: #2a2a32;
      background: #12121a;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .card-title {
      font-size: 16px;
      font-weight: 400;
    }

    .icon-btn {
      background: none;
      border: none;
      color: #666;
      font-size: 14px;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
    }

    .icon-btn.danger:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .card-entries {
      font-size: 13px;
      color: #666;
      margin-bottom: 12px;
    }

    .poster-strip {
      display: flex;
      gap: 4px;
    }

    .poster-strip img {
      width: 40px;
      height: 60px;
      object-fit: cover;
      border-radius: 4px;
    }
  `]
})
export class CollectionListComponent implements OnInit {
  collections = signal<AdminCollection[]>([]);
  loading = signal(true);
  creating = signal(false);
  newTitle = '';

  constructor(
    private graphql: GraphqlService,
    private admin: AdminService,
    public router: Router,
  ) {}

  ngOnInit() {
    this.loadCollections();
  }

  loadCollections() {
    this.loading.set(true);
    this.graphql.getCollections().subscribe({
      next: cols => {
        this.collections.set(cols);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  createCollection() {
    if (!this.newTitle.trim()) return;
    this.creating.set(true);
    this.admin.createCollection(this.newTitle.trim()).subscribe({
      next: (id) => {
        const cleanId = id.replace(/"/g, '');
        this.creating.set(false);
        this.newTitle = '';
        this.router.navigate(['/admin/collections', cleanId]);
      },
      error: () => this.creating.set(false),
    });
  }

  deleteCollection(col: AdminCollection, event: Event) {
    event.stopPropagation();
    if (!confirm(`Delete collection "${col.title}"?`)) return;
    this.admin.deleteCollection(col.id).subscribe(() => {
      this.collections.update(c => c.filter(x => x.id !== col.id));
    });
  }

  posterUrl(path: string): string {
    if (!path) return '/assets/poster-placeholder.svg';
    return `https://image.tmdb.org/t/p/w342${path}`;
  }
}
