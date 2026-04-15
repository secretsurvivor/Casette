import { Component, OnInit, OnDestroy, AfterViewInit, signal, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoMarker, VideoMarkerType, formatDuration } from '../../../shared/models';
import { VideoService } from '../../../core/services/video.service';
import { AdminService } from '../../../core/services/admin.service';
import { GraphqlService } from '../../../core/services/graphql.service';
import { ShakaPlayerService, ShakaHandle } from '../../../core/services/shaka-player.service';

@Component({
  selector: 'app-marker-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h2>Video Markers</h2>
      <button class="btn btn-ghost" (click)="router.navigate(['/admin/videos'])">← Back to Videos</button>
    </div>

    @if (loading()) {
      <div class="loading">Loading video...</div>
    } @else {
      <div class="editor-layout">
        <!-- Video Player -->
        <div class="player-section">
          <div class="video-info">
            <span class="video-name">{{ videoFilename() }}</span>
            <span class="video-dur">{{ fmtDuration(videoDuration()) }}</span>
          </div>

          <div class="video-container" #shakaContainer>
            <video #videoPlayer playsinline></video>
          </div>

          <!-- Marker visualization on timeline -->
          <div class="marker-timeline">
            @for (marker of markers(); track marker.id) {
              <div class="marker-block"
                [class.skip]="marker.type === 0"
                [class.credits]="marker.type === 1"
                [style.left.%]="(marker.startInSeconds / duration()) * 100"
                [style.width.%]="((marker.endInSeconds - marker.startInSeconds) / duration()) * 100"
                (click)="seekTo(marker.startInSeconds)"
                [title]="(marker.type === 0 ? 'Skip' : 'Credits') + ': ' + formatTime(marker.startInSeconds) + ' → ' + formatTime(marker.endInSeconds)">
              </div>
            }
          </div>
        </div>

        <!-- Add Marker Form -->
        <div class="add-section">
          <div class="section-label">Add Marker</div>

          <div class="add-form">
            <div class="time-fields">
              <div class="field">
                <label>Start</label>
                <div class="time-input-row">
                  <input type="number" [(ngModel)]="newStart" step="0.1" min="0" />
                  <button class="set-btn" (click)="newStart = currentTime()" title="Use current time">⏱</button>
                </div>
              </div>
              <div class="field">
                <label>End</label>
                <div class="time-input-row">
                  <input type="number" [(ngModel)]="newEnd" step="0.1" min="0" />
                  <button class="set-btn" (click)="newEnd = currentTime()" title="Use current time">⏱</button>
                </div>
              </div>
            </div>

            <div class="field">
              <label>Type</label>
              <select [(ngModel)]="newType">
                <option [ngValue]="0">Skip</option>
                <option [ngValue]="1">Credits</option>
              </select>
            </div>

            <button class="btn btn-primary" (click)="addMarker()" [disabled]="addingMarker()">
              {{ addingMarker() ? 'Adding...' : 'Add Marker' }}
            </button>

            @if (addError()) {
              <div class="error">{{ addError() }}</div>
            }
          </div>
        </div>

        <!-- Existing Markers -->
        <div class="markers-section">
          <div class="section-label">Existing Markers ({{ markers().length }})</div>

          @if (markers().length === 0) {
            <div class="empty">No markers on this video yet.</div>
          } @else {
            <div class="marker-list">
              @for (marker of markers(); track marker.id) {
                <div class="marker-item" [class.editing]="editingId() === marker.id">
                  @if (editingId() === marker.id) {
                    <div class="marker-edit-form">
                      <div class="time-fields">
                        <div class="field">
                          <label>Start</label>
                          <div class="time-input-row">
                            <input type="number" [(ngModel)]="editStart" step="0.1" min="0" />
                            <button class="set-btn" (click)="editStart = currentTime()">⏱</button>
                          </div>
                        </div>
                        <div class="field">
                          <label>End</label>
                          <div class="time-input-row">
                            <input type="number" [(ngModel)]="editEnd" step="0.1" min="0" />
                            <button class="set-btn" (click)="editEnd = currentTime()">⏱</button>
                          </div>
                        </div>
                      </div>
                      <div class="field">
                        <label>Type</label>
                        <select [(ngModel)]="editType">
                          <option [ngValue]="0">Skip</option>
                          <option [ngValue]="1">Credits</option>
                        </select>
                      </div>
                      <div class="edit-actions">
                        <button class="btn btn-sm btn-primary" (click)="saveEdit(marker.id)">Save</button>
                        <button class="btn btn-sm btn-ghost" (click)="cancelEdit()">Cancel</button>
                      </div>
                    </div>
                  } @else {
                    <div class="marker-info" (click)="seekTo(marker.startInSeconds)">
                      <span class="marker-type-badge" [class.skip]="marker.type === 0" [class.credits]="marker.type === 1">
                        {{ marker.type === 0 ? 'Skip' : 'Credits' }}
                      </span>
                      <span class="marker-times">
                        {{ formatTime(marker.startInSeconds) }} → {{ formatTime(marker.endInSeconds) }}
                      </span>
                      <span class="marker-dur">({{ (marker.endInSeconds - marker.startInSeconds) | number:'1.1-1' }}s)</span>
                    </div>
                    <div class="marker-actions">
                      <button class="icon-btn" (click)="startEdit(marker)" title="Edit">✎</button>
                      <button class="icon-btn danger" (click)="deleteMarker(marker.id)" title="Delete">✕</button>
                    </div>
                  }
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
      padding: 24px 0;
      font-size: 14px;
    }

    .editor-layout {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Player */
    .player-section {
      background: #0f0f13;
      border: 1px solid #1a1a22;
      border-radius: 10px;
      padding: 20px;
    }

    .video-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .video-name {
      font-size: 14px;
      color: #ccc;
    }

    .video-dur {
      font-size: 13px;
      color: #666;
    }

    .video-container {
      background: #000;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    video {
      width: 100%;
      max-height: 400px;
      display: block;
    }

    /* Shaka UI overrides for admin editor */
    :host ::ng-deep .shaka-bottom-controls {
      background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%) !important;
    }
    :host ::ng-deep .shaka-played-bar { background: #e8c97a !important; }
    :host ::ng-deep .shaka-buffered-bar { background: rgba(255,255,255,0.25) !important; }
    :host ::ng-deep .shaka-current-time { color: #f0eee8 !important; }

    .marker-timeline {
      position: relative;
      height: 12px;
      background: #1a1a22;
      border-radius: 6px;
      overflow: hidden;
    }

    .marker-block {
      position: absolute;
      top: 0;
      height: 100%;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.12s ease;
      border-radius: 2px;
    }

    .marker-block:hover {
      opacity: 1;
    }

    .marker-block.skip {
      background: #f59e0b;
    }

    .marker-block.credits {
      background: #8b5cf6;
    }

    /* Add & Edit sections */
    .add-section, .markers-section {
      background: #0f0f13;
      border: 1px solid #1a1a22;
      border-radius: 10px;
      padding: 20px;
    }

    .section-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #e8c97a;
      margin-bottom: 16px;
    }

    .add-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .time-fields {
      display: flex;
      gap: 16px;
    }

    .time-fields .field {
      flex: 1;
    }

    .field label {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666;
      margin-bottom: 4px;
    }

    .field input[type="number"],
    .field select {
      width: 100%;
      padding: 8px 12px;
      background: #16161c;
      border: 1px solid #2a2a32;
      border-radius: 6px;
      color: #f0eee8;
      font-size: 14px;
      outline: none;
    }

    .field input:focus, .field select:focus {
      border-color: #e8c97a;
    }

    .field select {
      max-width: 200px;
    }

    .time-input-row {
      display: flex;
      gap: 6px;
    }

    .time-input-row input {
      flex: 1;
    }

    .set-btn {
      background: #1a1a22;
      border: 1px solid #2a2a32;
      color: #e8c97a;
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }

    .set-btn:hover {
      background: #2a2a32;
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

    .btn-sm {
      padding: 6px 14px;
      font-size: 12px;
    }

    .btn-primary {
      background: #e8c97a;
      color: #0a0a0c;
      align-self: flex-start;
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
      text-decoration: none;
    }

    .btn-ghost:hover {
      color: #f0eee8;
      border-color: #444;
    }

    .error {
      color: #ef4444;
      font-size: 13px;
    }

    /* Marker list */
    .marker-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .marker-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-radius: 6px;
      transition: background 0.12s ease;
    }

    .marker-item:hover {
      background: #16161c;
    }

    .marker-item.editing {
      background: #16161c;
      flex-direction: column;
      align-items: stretch;
    }

    .marker-info {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      flex: 1;
    }

    .marker-type-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 500;
    }

    .marker-type-badge.skip {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
    }

    .marker-type-badge.credits {
      background: rgba(139, 92, 246, 0.15);
      color: #8b5cf6;
    }

    .marker-times {
      font-size: 14px;
      color: #ccc;
      font-variant-numeric: tabular-nums;
    }

    .marker-dur {
      font-size: 12px;
      color: #666;
    }

    .marker-actions {
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

    .icon-btn:hover {
      background: #1a1a22;
      color: #f0eee8;
    }

    .icon-btn.danger:hover {
      color: #ef4444;
    }

    .marker-edit-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .edit-actions {
      display: flex;
      gap: 8px;
    }
  `]
})
export class MarkerEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('shakaContainer') containerRef!: ElementRef<HTMLElement>;
  @ViewChild('videoPlayer') videoRef!: ElementRef<HTMLVideoElement>;

  loading = signal(true);
  streamUrl = signal('');
  videoFilename = signal('');
  videoDuration = signal(0);
  markers = signal<VideoMarker[]>([]);

  currentTime = signal(0);
  duration = signal(0);

  private shakaHandle: ShakaHandle | null = null;

  // Add marker form
  newStart = 0;
  newEnd = 0;
  newType = 0;
  addingMarker = signal(false);
  addError = signal('');

  // Edit marker form
  editingId = signal<string | null>(null);
  editStart = 0;
  editEnd = 0;
  editType = 0;

  fmtDuration = formatDuration;
  private videoId = '';
  private rafId = 0;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private videoService: VideoService,
    private admin: AdminService,
    private graphql: GraphqlService,
    private shakaService: ShakaPlayerService,
    private ngZone: NgZone,
  ) {}

  ngOnInit() {
    this.videoId = this.route.snapshot.paramMap.get('videoId')!;
    this.loadData();
  }

  ngOnDestroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.shakaService.destroy();
  }

  async ngAfterViewInit() {
    // Container is inside @if (!loading()), so it may not exist yet.
    // If not available, initShaka will be called from loadData after loading finishes.
    if (this.containerRef?.nativeElement && this.videoRef?.nativeElement) {
      await this.initShaka();
    }
  }

  private async initShaka() {
    if (this.shakaHandle) return; // already initialized
    if (!this.containerRef?.nativeElement || !this.videoRef?.nativeElement) return;

    this.shakaHandle = await this.shakaService.init(
      this.containerRef.nativeElement,
      this.videoRef.nativeElement,
      { disableCast: true },
    );

    const video = this.shakaHandle.video;
    video.addEventListener('timeupdate', () => {
      this.ngZone.run(() => {
        this.currentTime.set(video.currentTime);
        this.duration.set(video.duration || 0);
      });
    });
    video.addEventListener('loadedmetadata', () => {
      this.ngZone.run(() => {
        this.duration.set(video.duration || 0);
      });
    });
  }

  private loadData() {
    this.loading.set(true);

    // Load stream URL
    this.videoService.getStreamUrl(this.videoId).subscribe(url => {
      this.streamUrl.set(url);
      this.loading.set(false);

      // Wait for Angular to render the @else block (loading is now false),
      // then initialise Shaka and load the stream.
      setTimeout(async () => {
        await this.initShaka();
        if (this.shakaHandle) {
          this.shakaHandle.player.load(url, undefined, 'video/mp4');
        }
      });
    });

    // Load video info
    this.graphql.getVideos().subscribe(videos => {
      const vid = videos.find(v => v.id === this.videoId);
      if (vid) {
        this.videoFilename.set(vid.filename);
        this.videoDuration.set(vid.durationInSeconds);
      }
    });

    // Load markers
    this.loadMarkers();
  }

  private loadMarkers() {
    this.admin.getMarkers(this.videoId).subscribe(markers => {
      this.markers.set(markers);
    });
  }

  onTimeUpdate() {
    // handled by Shaka event listener in ngAfterViewInit
  }

  seekTo(time: number) {
    const vid = this.shakaHandle?.video ?? this.videoRef?.nativeElement;
    if (vid) {
      vid.currentTime = time;
      this.currentTime.set(time);
    }
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  addMarker() {
    if (this.newEnd <= this.newStart) {
      this.addError.set('End time must be after start time');
      return;
    }
    this.addingMarker.set(true);
    this.addError.set('');

    this.admin.createMarker({
      videoId: this.videoId,
      startInSeconds: this.newStart,
      endInSeconds: this.newEnd,
      type: this.newType,
    }).subscribe({
      next: (id) => {
        const cleanId = id.replace(/"/g, '');
        this.markers.update(m => [...m, {
          id: cleanId,
          startInSeconds: this.newStart,
          endInSeconds: this.newEnd,
          type: this.newType,
        }]);
        this.newStart = 0;
        this.newEnd = 0;
        this.addingMarker.set(false);
      },
      error: (err) => {
        this.addError.set(err?.error?.message || 'Failed to add marker');
        this.addingMarker.set(false);
      },
    });
  }

  startEdit(marker: VideoMarker) {
    this.editingId.set(marker.id);
    this.editStart = marker.startInSeconds;
    this.editEnd = marker.endInSeconds;
    this.editType = marker.type;
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  saveEdit(markerId: string) {
    this.admin.updateMarker(markerId, {
      startInSeconds: this.editStart,
      endInSeconds: this.editEnd,
      type: this.editType,
    }).subscribe({
      next: () => {
        this.markers.update(m => m.map(mk =>
          mk.id === markerId
            ? { ...mk, startInSeconds: this.editStart, endInSeconds: this.editEnd, type: this.editType }
            : mk
        ));
        this.editingId.set(null);
      },
    });
  }

  deleteMarker(markerId: string) {
    if (!confirm('Delete this marker?')) return;
    this.admin.deleteMarker(markerId).subscribe({
      next: () => {
        this.markers.update(m => m.filter(mk => mk.id !== markerId));
      },
    });
  }
}
