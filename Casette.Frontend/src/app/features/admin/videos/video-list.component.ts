import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminVideo, AdminEntry, PageInfo, formatDuration } from '../../../shared/models';
import { GraphqlService } from '../../../core/services/graphql.service';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-video-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="page-header">
      <h2>Videos</h2>
    </div>

    <div class="filters">
      <select (change)="onEntryFilter($any($event.target).value)">
        <option value="">All entries</option>
        @for (entry of entries(); track entry.id) {
          <option [value]="entry.id">{{ entry.title }}</option>
        }
      </select>
    </div>

    @if (loading()) {
      <div class="loading">Loading videos...</div>
    } @else if (videos().length === 0) {
      <div class="empty">No videos found.</div>
    } @else {
      <div class="video-table">
        <div class="table-header">
          <span class="col-file">Filename</span>
          <span class="col-entry">Entry</span>
          <span class="col-dur">Duration</span>
          <span class="col-default">Default</span>
          <span class="col-markers">Markers</span>
          <span class="col-date">Created</span>
          <span class="col-actions"></span>
        </div>
        @for (video of videos(); track video.id) {
          <div class="table-row">
            <span class="col-file" [title]="video.filename">{{ video.filename }}</span>
            <span class="col-entry">{{ video.entryTitle }}</span>
            <span class="col-dur">{{ fmtDuration(video.durationInSeconds) }}</span>
            <span class="col-default">
              @if (video.isDefault) {
                <span class="default-badge">DEFAULT</span>
              }
            </span>
            <span class="col-markers">{{ video.markerCount }}</span>
            <span class="col-date">{{ video.created | date:'mediumDate' }}</span>
            <span class="col-actions">
              <div class="menu-wrap">
                <button class="menu-btn" (click)="toggleMenu(video.id)">⋯</button>
                @if (openMenu() === video.id) {
                  <div class="menu-dropdown"
                    [style.top.px]="menuPosition().top"
                    [style.left.px]="menuPosition().left">
                    @if (!video.isDefault) {
                      <button (click)="setDefault(video)">Set as default</button>
                    }
                    <button (click)="router.navigate(['/admin/videos', video.id, 'markers'])">
                      Manage markers
                    </button>
                  </div>
                }
              </div>
            </span>
          </div>
        }
      </div>

      <!-- Pagination -->
      <div class="pagination">
        <span class="page-info">
          Showing {{ videos().length }} of {{ totalCount() }}
        </span>
        <div class="page-btns">
          <button class="btn btn-page" (click)="prevPage()" [disabled]="!canGoPrev()">← Previous</button>
          <button class="btn btn-page" (click)="nextPage()" [disabled]="!pageInfo().hasNextPage">Next →</button>
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

    .filters {
      margin-bottom: 20px;
    }

    .filters select {
      padding: 8px 14px;
      background: #16161c;
      border: 1px solid #2a2a32;
      border-radius: 6px;
      color: #f0eee8;
      font-size: 14px;
      outline: none;
      min-width: 250px;
    }

    .loading, .empty {
      color: #666;
      padding: 40px 0;
      text-align: center;
      font-size: 14px;
    }

    .video-table {
      border: 1px solid #1a1a22;
      border-radius: 8px;
    }

    .table-header {
      display: grid;
      grid-template-columns: 1fr 1fr 90px 80px 70px 120px 50px;
      gap: 12px;
      padding: 10px 16px;
      background: #0f0f13;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #666;
      border-radius: 8px 8px 0 0;
    }

    .table-row {
      display: grid;
      grid-template-columns: 1fr 1fr 90px 80px 70px 120px 50px;
      gap: 12px;
      padding: 10px 16px;
      align-items: center;
      border-top: 1px solid #1a1a22;
      font-size: 14px;
    }

    .table-row:hover {
      background: #16161c;
    }

    .col-file {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .col-entry {
      color: #888;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .col-dur, .col-markers { color: #888; text-align: center; }
    .col-date { color: #666; font-size: 13px; }

    .default-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      background: rgba(74, 222, 128, 0.15);
      color: #4ade80;
      font-weight: 500;
      letter-spacing: 0.5px;
    }

    .menu-wrap {
      position: relative;
    }

    .menu-btn {
      background: none;
      border: none;
      color: #888;
      font-size: 18px;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
    }

    .menu-btn:hover {
      background: #1a1a22;
      color: #f0eee8;
    }

    .menu-dropdown {
      position: fixed;
      background: #1a1a22;
      border: 1px solid #2a2a32;
      border-radius: 6px;
      overflow: hidden;
      z-index: 9999;
      min-width: 180px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }

    .menu-dropdown button {
      display: block;
      width: 100%;
      text-align: left;
      padding: 10px 14px;
      background: transparent;
      border: none;
      color: #ccc;
      font-size: 13px;
      cursor: pointer;
    }

    .menu-dropdown button:hover {
      background: #2a2a32;
      color: #f0eee8;
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 0;
      margin-top: 4px;
    }

    .page-info {
      font-size: 13px;
      color: #666;
    }

    .page-btns {
      display: flex;
      gap: 8px;
    }

    .btn-page {
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      border: 1px solid #2a2a32;
      background: #16161c;
      color: #ccc;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-page:hover:not(:disabled) {
      background: #1a1a22;
      border-color: #e8c97a;
      color: #e8c97a;
    }

    .btn-page:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  `],
  host: {
    '(document:click)': 'openMenu.set(null)',
  }
})
export class VideoListComponent implements OnInit {
  videos = signal<AdminVideo[]>([]);
  entries = signal<AdminEntry[]>([]);
  loading = signal(true);
  openMenu = signal<string | null>(null);
  menuPosition = signal<{ top: number; left: number }>({ top: 0, left: 0 });
  pageInfo = signal<PageInfo>({ hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null });
  totalCount = signal(0);

  /** Stack of endCursors for previous pages. */
  private cursorStack: string[] = [];
  private currentEntryId: string | undefined;
  private readonly PAGE_SIZE = 20;

  fmtDuration = formatDuration;

  constructor(
    private graphql: GraphqlService,
    private admin: AdminService,
    public router: Router,
  ) {}

  ngOnInit() {
    this.loadPage();
    this.graphql.getAdminEntries().subscribe(e => this.entries.set(e));
  }

  canGoPrev(): boolean {
    return this.cursorStack.length > 0;
  }

  loadPage(after?: string) {
    this.loading.set(true);
    this.graphql.getVideosPaginated({
      first: this.PAGE_SIZE,
      after,
      entryId: this.currentEntryId,
    }).subscribe({
      next: (result) => {
        this.videos.set(result.nodes);
        this.pageInfo.set(result.pageInfo);
        this.totalCount.set(result.totalCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  nextPage() {
    const endCursor = this.pageInfo().endCursor;
    if (!endCursor) return;
    this.cursorStack.push(endCursor);
    this.loadPage(endCursor);
  }

  prevPage() {
    this.cursorStack.pop(); // remove current page cursor
    const after = this.cursorStack.length > 0 ? this.cursorStack[this.cursorStack.length - 1] : undefined;
    // We need to pop the previous page's cursor to "go to" it
    // Actually, the stack represents cursors used to reach the current page.
    // To go back: pop the last cursor (which got us to current page), then load with the new top.
    this.loadPage(after);
  }

  onEntryFilter(entryId: string) {
    this.currentEntryId = entryId || undefined;
    this.cursorStack = [];
    this.loadPage();
  }

  toggleMenu(videoId: string) {
    event?.stopPropagation();
    if (this.openMenu() === videoId) {
      this.openMenu.set(null);
      return;
    }
    const btn = event?.target as HTMLElement;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      this.menuPosition.set({
        top: rect.bottom + 4,
        left: rect.right - 180,
      });
    }
    this.openMenu.set(videoId);
  }

  setDefault(video: AdminVideo) {
    this.openMenu.set(null);
    this.admin.setDefaultVideo(video.id).subscribe(() => {
      this.videos.update(vids =>
        vids.map(v => ({
          ...v,
          isDefault: v.entryId === video.entryId ? v.id === video.id : v.isDefault
        }))
      );
    });
  }
}
