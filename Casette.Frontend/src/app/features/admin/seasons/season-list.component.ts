import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSeason, AdminEntry, AdminVideo, EpisodeItem, PageInfo, formatDuration } from '../../../shared/models';
import { GraphqlService } from '../../../core/services/graphql.service';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-season-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h2>Seasons</h2>
    </div>

    <!-- Entry selector -->
    <div class="entry-selector">
      <div class="section-label">Select Series</div>
      <select [(ngModel)]="selectedEntryId" (ngModelChange)="onEntryChange($event)">
        <option value="">Choose a series entry...</option>
        @for (entry of seriesEntries(); track entry.id) {
          <option [value]="entry.id">{{ entry.title }}</option>
        }
      </select>
    </div>

    @if (!selectedEntryId) {
      <div class="empty">Select a series entry above to manage its seasons and episodes.</div>
    } @else if (loadingSeasons()) {
      <div class="loading">Loading seasons...</div>
    } @else {
      <!-- Add Season -->
      <div class="add-card">
        <div class="section-label">Add Season</div>
        <div class="add-row">
          <label class="field-label">Season Number</label>
          <input type="number" [(ngModel)]="newSeasonPosition" placeholder="Position" min="1" class="pos-input" />
          <button class="btn btn-primary" (click)="addSeason()" [disabled]="addingSeason()">
            {{ addingSeason() ? 'Adding...' : '+ Add Season' }}
          </button>
        </div>
      </div>

      @if (seasons().length === 0) {
        <div class="empty">No seasons for this entry. Add one above.</div>
      }

      @for (season of sortedSeasons(); track season.id) {
        <div class="season-card">
          <div class="season-header" (click)="toggleSeason(season.id)">
            <span class="season-label">Season {{ season.position }}</span>
            <span class="episode-count">{{ season.episodes.length }} {{ season.episodes.length === 1 ? 'episode' : 'episodes' }}</span>
            <div class="season-actions">
              <button class="icon-btn" title="Edit season number"
                (click)="startEditSeasonPos(season, $event)">✎</button>
              <button class="icon-btn danger" (click)="deleteSeason(season, $event)" title="Delete season">✕</button>
            </div>
            <span class="chevron" [class.open]="expandedSeason() === season.id">▸</span>
          </div>

          @if (editingSeasonId() === season.id) {
            <div class="inline-edit" (click)="$event.stopPropagation()">
              <label class="field-label">Season Number</label>
              <input type="number" [(ngModel)]="editSeasonPos" min="1" class="pos-input" />
              <button class="btn btn-sm btn-primary" (click)="saveSeasonPos(season)">Save</button>
              <button class="btn btn-sm btn-ghost" (click)="editingSeasonId.set(null)">Cancel</button>
            </div>
          }

          @if (expandedSeason() === season.id) {
            <div class="season-content">
              <!-- Episodes -->
              @if (sortedEpisodes(season).length > 0) {
                <div class="episode-list">
                  <div class="ep-header">
                    <span class="ep-col-pos">Ep #</span>
                    <span class="ep-col-video">Video</span>
                    <span class="ep-col-actions"></span>
                  </div>
                  @for (ep of sortedEpisodes(season); track ep.videoId) {
                    <div class="episode-row">
                      <span class="ep-col-pos">
                        <input type="number" [ngModel]="ep.position" min="1"
                          class="ep-pos-input"
                          (blur)="onEpisodePosChange(season, ep, $any($event.target).valueAsNumber)"
                          (keydown.enter)="$any($event.target).blur()" />
                      </span>
                      <span class="ep-col-video" [title]="getVideoName(ep.videoId)">{{ getVideoName(ep.videoId) }}</span>
                      <span class="ep-col-actions">
                        <button class="icon-btn danger" (click)="removeEpisode(season, ep)" title="Remove episode">✕</button>
                      </span>
                    </div>
                  }
                </div>
              }

              <!-- Add Episode — paginated video browser -->
              <div class="add-episode">
                <div class="section-label" style="margin-bottom: 8px">Add Episode</div>

                <div class="ep-pos-field" style="margin-bottom: 10px">
                  <label class="field-label">Episode Number</label>
                  <input type="number" [(ngModel)]="newEpPosition" min="1" class="pos-input" />
                </div>

                <!-- Video search & browse -->
                <div class="video-browser">
                  <input type="text" [ngModel]="videoSearchTerm" placeholder="Search videos by filename..."
                    class="video-search-input"
                    (ngModelChange)="onVideoSearch($event)" />

                  @if (videosLoading()) {
                    <div class="vb-loading">Loading videos...</div>
                  } @else if (browseVideos().length === 0) {
                    <div class="vb-empty">No videos found.</div>
                  } @else {
                    <div class="vb-table">
                      <div class="vb-header">
                        <span class="vb-col-file">Filename</span>
                        <span class="vb-col-dur">Duration</span>
                        <span class="vb-col-action"></span>
                      </div>
                      @for (vid of browseVideos(); track vid.id) {
                        <div class="vb-row" [class.already-added]="isAlreadyEpisode(season, vid.id)">
                          <span class="vb-col-file" [title]="vid.filename">{{ vid.filename }}</span>
                          <span class="vb-col-dur">{{ fmtDuration(vid.durationInSeconds) }}</span>
                          <span class="vb-col-action">
                            @if (isAlreadyEpisode(season, vid.id)) {
                              <span class="added-badge">Added</span>
                            } @else {
                              <button class="btn btn-xs btn-primary" (click)="addEpisodeFromBrowser(season, vid)">+ Add</button>
                            }
                          </span>
                        </div>
                      }
                    </div>

                    <!-- Pagination -->
                    <div class="vb-pagination">
                      <span class="vb-page-info">{{ browseVideos().length }} of {{ videosTotalCount() }}</span>
                      <div class="vb-page-btns">
                        <button class="btn btn-xs btn-ghost" (click)="videosPrevPage()" [disabled]="!videosCanGoPrev()">← Prev</button>
                        <button class="btn btn-xs btn-ghost" (click)="videosNextPage()" [disabled]="!videosPageInfo().hasNextPage">Next →</button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
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

    .entry-selector {
      background: #0f0f13;
      border: 1px solid #1a1a22;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .entry-selector select {
      padding: 8px 14px;
      background: #16161c;
      border: 1px solid #2a2a32;
      border-radius: 6px;
      color: #f0eee8;
      font-size: 14px;
      outline: none;
      min-width: 300px;
    }

    .section-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #e8c97a;
      margin-bottom: 12px;
    }

    .add-card {
      background: #0f0f13;
      border: 1px solid #1a1a22;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 16px;
    }

    .add-row {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .field-label {
      font-size: 12px;
      color: #888;
      margin-right: 4px;
    }

    .pos-input {
      width: 80px;
      padding: 8px 12px;
      background: #16161c;
      border: 1px solid #2a2a32;
      border-radius: 6px;
      color: #f0eee8;
      font-size: 14px;
      outline: none;
    }

    .loading, .empty {
      color: #666;
      padding: 40px 0;
      text-align: center;
      font-size: 14px;
    }

    .season-card {
      background: #0f0f13;
      border: 1px solid #1a1a22;
      border-radius: 10px;
      margin-bottom: 10px;
      overflow: hidden;
    }

    .season-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      cursor: pointer;
      transition: background 0.12s ease;
    }

    .season-header:hover { background: #16161c; }

    .season-label {
      font-size: 15px;
      font-weight: 500;
      color: #f0eee8;
    }

    .episode-count {
      flex: 1;
      font-size: 13px;
      color: #666;
    }

    .season-actions {
      display: flex;
      gap: 2px;
    }

    .chevron {
      color: #666;
      transition: transform 0.15s ease;
    }

    .chevron.open { transform: rotate(90deg); }

    .inline-edit {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px 12px;
      border-top: 1px solid #1a1a22;
    }

    .season-content {
      padding: 0 18px 18px;
    }

    /* ── Episode table ── */

    .episode-list {
      margin-bottom: 16px;
    }

    .ep-header {
      display: grid;
      grid-template-columns: 60px 1fr 40px;
      gap: 12px;
      padding: 6px 8px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #555;
    }

    .episode-row {
      display: grid;
      grid-template-columns: 60px 1fr 40px;
      gap: 12px;
      padding: 6px 8px;
      align-items: center;
      border-radius: 4px;
    }

    .episode-row:hover { background: #16161c; }

    .ep-pos-input {
      width: 48px;
      padding: 4px 6px;
      background: #16161c;
      border: 1px solid #2a2a32;
      border-radius: 4px;
      color: #f0eee8;
      font-size: 13px;
      text-align: center;
      outline: none;
    }

    .ep-pos-input:focus {
      border-color: #e8c97a;
    }

    .ep-col-video {
      font-size: 14px;
      color: #ccc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Add Episode ── */

    .add-episode {
      border-top: 1px solid #1a1a22;
      padding-top: 14px;
    }

    .ep-pos-field {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* ── Video browser ── */

    .video-browser {
      border: 1px solid #1a1a22;
      border-radius: 8px;
      overflow: hidden;
    }

    .video-search-input {
      width: 100%;
      padding: 10px 14px;
      background: #16161c;
      border: none;
      border-bottom: 1px solid #1a1a22;
      color: #f0eee8;
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
    }

    .video-search-input:focus { background: #1a1a22; }

    .vb-loading, .vb-empty {
      color: #666;
      padding: 20px;
      text-align: center;
      font-size: 13px;
    }

    .vb-header {
      display: grid;
      grid-template-columns: 1fr 80px 70px;
      gap: 10px;
      padding: 6px 14px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #555;
      background: #0c0c10;
    }

    .vb-row {
      display: grid;
      grid-template-columns: 1fr 80px 70px;
      gap: 10px;
      padding: 7px 14px;
      align-items: center;
      border-top: 1px solid #1a1a22;
      font-size: 13px;
    }

    .vb-row:hover { background: #16161c; }
    .vb-row.already-added { opacity: 0.5; }

    .vb-col-file {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #ccc;
    }

    .vb-col-dur {
      color: #888;
      text-align: center;
      font-size: 12px;
    }

    .vb-col-action { text-align: right; }

    .added-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      background: rgba(74, 222, 128, 0.12);
      color: #4ade80;
      letter-spacing: 0.5px;
    }

    .vb-pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      border-top: 1px solid #1a1a22;
    }

    .vb-page-info {
      font-size: 12px;
      color: #666;
    }

    .vb-page-btns {
      display: flex;
      gap: 6px;
    }

    /* ── Shared buttons ── */

    .icon-btn {
      background: none;
      border: none;
      color: #666;
      font-size: 14px;
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

    .icon-btn.danger:hover { color: #ef4444; }

    .btn {
      padding: 8px 20px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .btn-sm { padding: 6px 14px; font-size: 12px; }
    .btn-xs { padding: 4px 10px; font-size: 11px; }

    .btn-primary {
      background: #e8c97a;
      color: #0a0a0c;
    }

    .btn-primary:hover:not(:disabled) { background: #f0d78a; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-ghost {
      background: transparent;
      color: #888;
      border: 1px solid #2a2a32;
    }

    .btn-ghost:hover:not(:disabled) { color: #f0eee8; border-color: #555; }
    .btn-ghost:disabled { opacity: 0.3; cursor: not-allowed; }
  `]
})
export class SeasonListComponent implements OnInit {
  entries = signal<AdminEntry[]>([]);
  seasons = signal<AdminSeason[]>([]);
  loadingSeasons = signal(false);
  expandedSeason = signal<string | null>(null);

  selectedEntryId = '';
  newSeasonPosition = 1;
  addingSeason = signal(false);

  // Inline season position editing
  editingSeasonId = signal<string | null>(null);
  editSeasonPos = 1;

  // Episode adding
  newEpPosition = 1;

  // Video browser (paginated)
  browseVideos = signal<AdminVideo[]>([]);
  videosLoading = signal(false);
  videosPageInfo = signal<PageInfo>({ hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null });
  videosTotalCount = signal(0);
  videoSearchTerm = '';
  private videosCursorStack: string[] = [];
  private videosSearchTimeout: any;

  fmtDuration = formatDuration;

  seriesEntries = computed(() =>
    this.entries().filter(e => e.type === 'SERIES')
  );

  sortedSeasons = computed(() =>
    [...this.seasons()].sort((a, b) => a.position - b.position)
  );

  constructor(
    private graphql: GraphqlService,
    private admin: AdminService,
  ) {}

  ngOnInit() {
    this.graphql.getAdminEntries().subscribe(e => this.entries.set(e));
  }

  onEntryChange(entryId: string) {
    this.seasons.set([]);
    this.browseVideos.set([]);
    this.expandedSeason.set(null);
    if (!entryId) return;

    this.loadingSeasons.set(true);
    this.graphql.getSeasonsByEntry(entryId).subscribe(s => {
      this.seasons.set(s);
      this.loadingSeasons.set(false);
      this.newSeasonPosition = s.length > 0
        ? Math.max(...s.map(x => x.position)) + 1
        : 1;
    });
  }

  toggleSeason(id: string) {
    const opening = this.expandedSeason() !== id;
    this.expandedSeason.set(opening ? id : null);
    if (opening) {
      const season = this.seasons().find(s => s.id === id);
      this.newEpPosition = season ? season.episodes.length + 1 : 1;
      // Load first page of videos for this entry
      this.videoSearchTerm = '';
      this.videosCursorStack = [];
      this.loadVideosPage();
    }
  }

  sortedEpisodes(season: AdminSeason): EpisodeItem[] {
    return [...season.episodes].sort((a, b) => a.position - b.position);
  }

  getVideoName(videoId: string): string {
    const found = this.browseVideos().find(v => v.id === videoId);
    return found?.filename || videoId.substring(0, 8) + '...';
  }

  // ── Video browser ──

  onVideoSearch(term: string) {
    this.videoSearchTerm = term;
    clearTimeout(this.videosSearchTimeout);
    this.videosSearchTimeout = setTimeout(() => {
      this.videosCursorStack = [];
      this.loadVideosPage();
    }, 300);
  }

  loadVideosPage(after?: string) {
    this.videosLoading.set(true);
    this.graphql.getVideosPaginated({
      first: 10,
      after,
      entryId: this.selectedEntryId,
      filenameContains: this.videoSearchTerm.trim() || undefined,
    }).subscribe({
      next: (result) => {
        this.browseVideos.set(result.nodes);
        this.videosPageInfo.set(result.pageInfo);
        this.videosTotalCount.set(result.totalCount);
        this.videosLoading.set(false);
      },
      error: () => this.videosLoading.set(false),
    });
  }

  videosCanGoPrev(): boolean {
    return this.videosCursorStack.length > 0;
  }

  videosNextPage() {
    const cursor = this.videosPageInfo().endCursor;
    if (!cursor) return;
    this.videosCursorStack.push(cursor);
    this.loadVideosPage(cursor);
  }

  videosPrevPage() {
    this.videosCursorStack.pop();
    const after = this.videosCursorStack.length > 0
      ? this.videosCursorStack[this.videosCursorStack.length - 1]
      : undefined;
    this.loadVideosPage(after);
  }

  isAlreadyEpisode(season: AdminSeason, videoId: string): boolean {
    return season.episodes.some(ep => ep.videoId === videoId);
  }

  addEpisodeFromBrowser(season: AdminSeason, video: AdminVideo) {
    this.admin.addEpisode(season.id, video.id, this.newEpPosition).subscribe(() => {
      this.seasons.update(ss => ss.map(s =>
        s.id === season.id
          ? { ...s, episodes: [...s.episodes, { position: this.newEpPosition, videoId: video.id }] }
          : s
      ));
      this.newEpPosition++;
    });
  }

  // ── Season CRUD ──

  addSeason() {
    if (!this.selectedEntryId) return;
    this.addingSeason.set(true);
    this.admin.createSeason(this.selectedEntryId, this.newSeasonPosition).subscribe({
      next: (id) => {
        const cleanId = id.replace(/"/g, '');
        this.seasons.update(s => [...s, {
          id: cleanId,
          entryId: this.selectedEntryId,
          position: this.newSeasonPosition,
          episodes: [],
        }]);
        this.newSeasonPosition++;
        this.addingSeason.set(false);
      },
      error: () => this.addingSeason.set(false),
    });
  }

  deleteSeason(season: AdminSeason, event: Event) {
    event.stopPropagation();
    if (!confirm(`Delete Season ${season.position}? All episodes will be removed.`)) return;
    this.admin.deleteSeason(season.id).subscribe(() => {
      this.seasons.update(s => s.filter(x => x.id !== season.id));
      if (this.expandedSeason() === season.id) this.expandedSeason.set(null);
    });
  }

  startEditSeasonPos(season: AdminSeason, event: Event) {
    event.stopPropagation();
    this.editingSeasonId.set(season.id);
    this.editSeasonPos = season.position;
  }

  saveSeasonPos(season: AdminSeason) {
    if (this.editSeasonPos === season.position) {
      this.editingSeasonId.set(null);
      return;
    }
    this.admin.updateSeason(season.id, this.editSeasonPos).subscribe(() => {
      this.seasons.update(ss => ss.map(s =>
        s.id === season.id ? { ...s, position: this.editSeasonPos } : s
      ));
      this.editingSeasonId.set(null);
    });
  }

  // ── Episode CRUD ──

  onEpisodePosChange(season: AdminSeason, ep: EpisodeItem, newPos: number) {
    if (!newPos || newPos === ep.position) return;
    this.admin.updateEpisode(season.id, ep.videoId, newPos).subscribe(() => {
      this.seasons.update(ss => ss.map(s =>
        s.id === season.id
          ? { ...s, episodes: s.episodes.map(e => e.videoId === ep.videoId ? { ...e, position: newPos } : e) }
          : s
      ));
    });
  }

  removeEpisode(season: AdminSeason, ep: EpisodeItem) {
    this.admin.removeEpisode(season.id, ep.videoId).subscribe(() => {
      this.seasons.update(ss => ss.map(s =>
        s.id === season.id
          ? { ...s, episodes: s.episodes.filter(e => e.videoId !== ep.videoId) }
          : s
      ));
    });
  }
}
