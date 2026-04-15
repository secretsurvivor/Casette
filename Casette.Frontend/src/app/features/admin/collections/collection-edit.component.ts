import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminCollection, CollectionEntryItem, AdminEntry } from '../../../shared/models';
import { GraphqlService } from '../../../core/services/graphql.service';
import { AdminService } from '../../../core/services/admin.service';
import { TmdbService } from '../../../core/services/tmdb.service';

@Component({
  selector: 'app-collection-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h2>Edit Collection</h2>
      <button class="btn btn-ghost" (click)="router.navigate(['/admin/collections'])">← Back</button>
    </div>

    @if (loading()) {
      <div class="loading">Loading...</div>
    } @else if (collection()) {
      <div class="edit-card">
        <!-- Title -->
        <div class="field">
          <label>Title</label>
          <div class="title-row">
            <input type="text" [(ngModel)]="title" />
            <button class="btn btn-primary btn-sm" (click)="saveTitle()" [disabled]="savingTitle()">Save</button>
          </div>
        </div>

        @if (titleMessage()) {
          <div class="msg success">{{ titleMessage() }}</div>
        }
      </div>

      <!-- Entries List -->
      <div class="entries-card">
        <div class="section-label">Entries ({{ collection()!.entries.length }})</div>

        @if (collection()!.entries.length === 0) {
          <div class="empty">No entries in this collection yet.</div>
        } @else {
          <div class="entry-list">
            @for (entry of sortedEntries(); track entry.entryId; let i = $index) {
              <div class="entry-row">
                <span class="entry-pos">{{ entry.position }}</span>
                <img [src]="tmdb.posterUrl(entry.posterPath, 'w342')" alt="" class="entry-poster" />
                <span class="entry-title">{{ entry.title }}</span>
                <div class="entry-actions">
                  <button class="icon-btn" (click)="moveEntry(entry, -1)" [disabled]="i === 0" title="Move up">↑</button>
                  <button class="icon-btn" (click)="moveEntry(entry, 1)" [disabled]="i === sortedEntries().length - 1" title="Move down">↓</button>
                  <button class="icon-btn danger" (click)="removeEntry(entry)" title="Remove">✕</button>
                </div>
              </div>
            }
          </div>
        }

        <!-- Add Entry -->
        <div class="add-section">
          <div class="section-label">Add Entry</div>
          <input type="text" placeholder="Search entries by title..."
            (input)="searchTerm.set($any($event.target).value)" />

          @if (filteredEntries().length > 0) {
            <div class="search-results">
              @for (entry of filteredEntries(); track entry.id) {
                <div class="search-row" (click)="addEntry(entry)">
                  <img [src]="tmdb.posterUrl(entry.posterPath, 'w342')" alt="" class="search-poster" />
                  <span>{{ entry.title }}</span>
                </div>
              }
            </div>
          }
        </div>
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

    .loading, .empty {
      color: #666;
      padding: 20px 0;
      font-size: 14px;
    }

    .edit-card, .entries-card {
      background: #0f0f13;
      border: 1px solid #1a1a22;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .field label {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666;
      margin-bottom: 6px;
    }

    .title-row {
      display: flex;
      gap: 12px;
    }

    .title-row input {
      flex: 1;
      padding: 10px 14px;
      background: #16161c;
      border: 1px solid #2a2a32;
      border-radius: 6px;
      color: #f0eee8;
      font-size: 14px;
      outline: none;
    }

    .title-row input:focus {
      border-color: #e8c97a;
    }

    .section-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #e8c97a;
      margin-bottom: 16px;
    }

    .entry-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 24px;
    }

    .entry-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-radius: 6px;
      transition: background 0.12s ease;
    }

    .entry-row:hover {
      background: #16161c;
    }

    .entry-pos {
      font-size: 14px;
      color: #666;
      min-width: 24px;
      text-align: center;
    }

    .entry-poster {
      width: 32px;
      height: 48px;
      object-fit: cover;
      border-radius: 4px;
    }

    .entry-title {
      flex: 1;
      font-size: 14px;
    }

    .entry-actions {
      display: flex;
      gap: 4px;
    }

    .icon-btn {
      background: none;
      border: none;
      color: #666;
      font-size: 15px;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
    }

    .icon-btn:hover:not(:disabled) {
      background: #1a1a22;
      color: #f0eee8;
    }

    .icon-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .icon-btn.danger:hover {
      color: #ef4444;
    }

    .add-section {
      padding-top: 16px;
      border-top: 1px solid #1a1a22;
    }

    .add-section input {
      width: 100%;
      max-width: 400px;
      padding: 10px 14px;
      background: #16161c;
      border: 1px solid #2a2a32;
      border-radius: 6px;
      color: #f0eee8;
      font-size: 14px;
      outline: none;
    }

    .search-results {
      margin-top: 8px;
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #1a1a22;
      border-radius: 6px;
    }

    .search-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.12s ease;
    }

    .search-row:hover {
      background: #16161c;
    }

    .search-poster {
      width: 28px;
      height: 42px;
      object-fit: cover;
      border-radius: 3px;
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

    .btn-sm { padding: 8px 16px; }

    .btn-primary {
      background: #e8c97a;
      color: #0a0a0c;
    }

    .btn-primary:hover:not(:disabled) {
      background: #f0d78a;
    }

    .btn-ghost {
      background: transparent;
      color: #888;
      border: 1px solid #2a2a32;
      text-decoration: none;
    }

    .btn-ghost:hover {
      color: #f0eee8;
      border-color: #444;
    }

    .msg.success {
      color: #4ade80;
      font-size: 13px;
      margin-top: 8px;
    }
  `]
})
export class CollectionEditComponent implements OnInit {
  collection = signal<AdminCollection | null>(null);
  allEntries = signal<AdminEntry[]>([]);
  loading = signal(true);
  savingTitle = signal(false);
  titleMessage = signal('');
  searchTerm = signal('');

  title = '';
  private collectionId = '';

  sortedEntries = computed(() => {
    const col = this.collection();
    if (!col) return [];
    return [...col.entries].sort((a, b) => a.position - b.position);
  });

  filteredEntries = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return [];
    const existingIds = new Set(this.collection()?.entries.map(e => e.entryId) || []);
    return this.allEntries().filter(e =>
      !existingIds.has(e.id) && e.title.toLowerCase().includes(term)
    );
  });

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private graphql: GraphqlService,
    private admin: AdminService,
    public tmdb: TmdbService,
  ) {}

  ngOnInit() {
    this.collectionId = this.route.snapshot.paramMap.get('id')!;
    this.loadData();
  }

  private loadData() {
    this.loading.set(true);
    this.graphql.getCollections().subscribe(cols => {
      const col = cols.find(c => c.id === this.collectionId);
      if (col) {
        this.collection.set(col);
        this.title = col.title;
      }
      this.loading.set(false);
    });
    this.graphql.getAdminEntries().subscribe(e => this.allEntries.set(e));
  }

  saveTitle() {
    if (!this.title.trim()) return;
    this.savingTitle.set(true);
    this.admin.updateCollection(this.collectionId, this.title.trim()).subscribe({
      next: () => {
        this.savingTitle.set(false);
        this.titleMessage.set('Title saved.');
        this.collection.update(c => c ? { ...c, title: this.title.trim() } : c);
        setTimeout(() => this.titleMessage.set(''), 2000);
      },
      error: () => this.savingTitle.set(false),
    });
  }

  addEntry(entry: AdminEntry) {
    const nextPos = (this.collection()?.entries.length || 0) + 1;
    this.admin.addCollectionEntry(this.collectionId, entry.id, nextPos).subscribe(() => {
      this.collection.update(c => c ? {
        ...c,
        entries: [...c.entries, {
          entryId: entry.id,
          title: entry.title,
          position: nextPos,
          posterPath: entry.posterPath,
        }]
      } : c);
      this.searchTerm.set('');
    });
  }

  removeEntry(entry: CollectionEntryItem) {
    this.admin.removeCollectionEntry(this.collectionId, entry.entryId).subscribe(() => {
      this.collection.update(c => c ? {
        ...c,
        entries: c.entries.filter(e => e.entryId !== entry.entryId)
      } : c);
    });
  }

  moveEntry(entry: CollectionEntryItem, direction: number) {
    const sorted = this.sortedEntries();
    const idx = sorted.findIndex(e => e.entryId === entry.entryId);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= sorted.length) return;

    const swapEntry = sorted[newIdx];
    // Swap positions
    this.admin.updateCollectionEntry(this.collectionId, entry.entryId, swapEntry.position).subscribe();
    this.admin.updateCollectionEntry(this.collectionId, swapEntry.entryId, entry.position).subscribe();

    this.collection.update(c => {
      if (!c) return c;
      const entries = c.entries.map(e => {
        if (e.entryId === entry.entryId) return { ...e, position: swapEntry.position };
        if (e.entryId === swapEntry.entryId) return { ...e, position: entry.position };
        return e;
      });
      return { ...c, entries };
    });
  }
}
