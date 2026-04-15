import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, signal, computed, NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  EntryDetail, VideoMarker, VideoMarkerType,
  PlaybackNavigation, NavigationItem, PlayerState,
  AdminSeason, AdminCollection,
  formatDuration,
} from '../../shared/models';
import { EntryService } from '../../core/services/entry.service';
import { VideoService } from '../../core/services/video.service';
import { GraphqlService } from '../../core/services/graphql.service';
import { TmdbService } from '../../core/services/tmdb.service';
import { ShakaPlayerService, ShakaHandle } from '../../core/services/shaka-player.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">

      <!-- NAV -->
      <nav>
        <button class="back-btn" (click)="goBack()">← CASETTE</button>
      </nav>

      <!-- THEATRE — full width, no sidebar -->
      <div class="theatre">

        <!-- VIDEO CONTAINER (Shaka UI binds here) -->
        <div class="video-container" #shakaContainer>
          <video #videoEl playsinline></video>

          <!-- Marker segments on seek bar -->
          <div class="marker-track" #markerTrack></div>

          <!-- SKIP MARKER BUTTON -->
          @if (activeMarker(); as marker) {
            <button class="skip-credits-btn" (click)="skipMarker()">
              {{ marker.type === VideoMarkerType.Credits ? 'SKIP CREDITS →' : 'SKIP →' }}
            </button>
          }

          <!-- AUTO-NEXT TOAST -->
          @if (autoNextCountdown() > 0 && nextItem()) {
            <div class="auto-next-toast">
              <span>Up next: {{ nextItem()!.label }}</span>
              <div class="auto-next-progress">
                <div class="auto-next-fill" [style.width.%]="(1 - autoNextCountdown() / 5) * 100"></div>
              </div>
              <div class="auto-next-actions">
                <button (click)="playNext()">Play Now</button>
                <button (click)="cancelAutoNext()">Cancel</button>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- INFO BAR — compact row below video -->
      <div class="info-bar">
        @if (navigation()?.previous; as prev) {
          <button class="nav-btn" (click)="playItem(prev)">← Previous</button>
        }

        <div class="info-centre">
          @if (entry()) {
            <span class="info-title">{{ entry()!.title }}</span>
            @if (navigation()) {
              <span class="info-label">{{ navigation()!.currentLabel }}</span>
            }
          }
        </div>

        <!-- Episode selector (series only) -->
        @if (isSeries()) {
          <div class="episode-selector">
            <button class="ep-toggle" (click)="toggleEpisodePanel()">
              EPISODES ▾
            </button>
            @if (episodePanelOpen()) {
              <div class="ep-panel">
                <div class="ep-seasons">
                  @for (s of seasonList(); track s.position) {
                    <button class="ep-season-btn"
                      [class.active]="s.position === selectedSeason()"
                      (click)="selectedSeason.set(s.position)">
                      S{{ s.position }}
                    </button>
                  }
                </div>
                <div class="ep-episodes">
                  @for (ep of episodesForSeason(); track ep.videoId) {
                    <button class="ep-item"
                      [class.active]="ep.videoId === activeVideoId()"
                      (click)="pickEpisode(ep.videoId)">
                      <span class="ep-num">E{{ ep.position }}</span>
                      @if (ep.videoId === activeVideoId()) {
                        <span class="ep-playing">NOW PLAYING</span>
                      }
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }

        @if (navigation()?.next; as nxt) {
          <button class="nav-btn" (click)="playItem(nxt)">Next →</button>
        }
      </div>
    </div>
  `,
  styleUrl: './player.component.scss',
})
export class PlayerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('shakaContainer') containerRef!: ElementRef<HTMLElement>;
  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('markerTrack') markerTrackRef!: ElementRef<HTMLElement>;

  readonly VideoMarkerType = VideoMarkerType;

  // ── Signals ──────────────────────────────────────────────
  entry          = signal<EntryDetail | null>(null);
  activeVideoId  = signal<string>('');
  activeMarkers  = signal<VideoMarker[]>([]);
  navigation     = signal<PlaybackNavigation | null>(null);
  autoNextCountdown = signal(0);  episodePanelOpen = signal(false);
  selectedSeason   = signal(1);
  // Need a signal version of currentTime for template reactive binding
  currentTimeSignal = signal(0);

  private shakaHandle: ShakaHandle | null = null;
  private currentTime      = 0;
  private duration         = 0;
  private creditsTriggered  = false;
  private autoPlayDismissed = false;
  private autoNextTimer?: ReturnType<typeof setInterval>;
  private progressInterval?: ReturnType<typeof setInterval>;
  private orientationHandler?: () => void;
  private seasons: AdminSeason[] = [];
  private collections: AdminCollection[] = [];
  private playerState: PlayerState = {};
  private entryId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private entryService: EntryService,
    private videoService: VideoService,
    private graphql: GraphqlService,
    public tmdb: TmdbService,
    private shakaService: ShakaPlayerService,
    private ngZone: NgZone,
  ) {}

  // ── Computed ─────────────────────────────────────────────

  activeMarker = computed(() => {
    const markers = this.activeMarkers();
    const t = this.currentTimeSignal();
    return markers.find(m => t >= m.startInSeconds && t < m.endInSeconds) ?? null;
  });

  nextItem = computed<NavigationItem | null>(() => this.navigation()?.next ?? null);

  isSeries = computed(() => !!this.entry()?.isSeries);

  seasonList = computed(() => {
    return this.seasons
      .filter(s => s.entryId === this.entryId)
      .sort((a, b) => a.position - b.position)
      .map(s => ({ position: s.position, episodeCount: s.episodes.length }));
  });

  episodesForSeason = computed(() => {
    const season = this.seasons.find(
      s => s.entryId === this.entryId && s.position === this.selectedSeason(),
    );
    if (!season) return [];
    return [...season.episodes].sort((a, b) => a.position - b.position);
  });

  entryYear = computed(() => {
    const rd = this.entry()?.releaseDate;
    return rd ? new Date(rd).getFullYear().toString() : '';
  });

  entryRuntime = computed(() => formatDuration(this.entry()?.durationInSeconds ?? 0));

  // ── Lifecycle ────────────────────────────────────────────

  ngOnInit() {
    // Read router state (videoId / collectionId) — no query params
    const state = history.state as PlayerState | undefined;
    if (state) {
      this.playerState = state;
    }

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id && id !== this.entryId) {
        this.entryId = id;
        this.loadEntry(id);
      }
    });
  }

  async ngAfterViewInit() {
    if (!this.containerRef?.nativeElement || !this.videoRef?.nativeElement) return;

    this.shakaHandle = await this.shakaService.init(
      this.containerRef.nativeElement,
      this.videoRef.nativeElement,
    );

    // Listen for time updates from the actual <video> element
    const video = this.shakaHandle.video;
    video.addEventListener('timeupdate', () => {
      this.ngZone.run(() => {
        this.currentTime = video.currentTime;
        this.duration = video.duration || 0;
        this.currentTimeSignal.set(video.currentTime);
        this.checkCreditsAutoPlay();
      });
    });

    video.addEventListener('ended', () => {
      this.ngZone.run(() => this.onVideoEnded());
    });

    // Mobile: auto-fullscreen on landscape, exit on portrait
    this.setupOrientationFullscreen();
  }

  ngOnDestroy() {
    this.saveProgressNow();
    this.cleanup();
    if (this.orientationHandler) {
      screen.orientation?.removeEventListener('change', this.orientationHandler);
    }
  }

  // ── Data Loading ─────────────────────────────────────────

  private loadEntry(entryId: string) {
    this.clearPlayback();

    // Load entry detail + seasons + collections in parallel
    forkJoin({
      entry: this.entryService.getDetail(entryId),
      seasons: this.graphql.getSeasons(),
      collections: this.graphql.getCollections(),
    }).subscribe({
      next: ({ entry, seasons, collections }) => {
        this.entry.set(entry);
        this.seasons = seasons;
        this.collections = collections;

        // Determine which video to stream
        const videoId = this.playerState.videoId ?? entry.videoId;
        this.activeVideoId.set(videoId);

        // Resolve markers
        this.resolveMarkers(entry, videoId, seasons);

        // Resolve navigation
        this.resolveNavigation(entry, entryId, videoId, seasons, collections);

        // Load and play the video
        this.loadAndPlayVideo(videoId);
      },
      error: (err) => {
        console.error('forkJoin failed:', err);
        this.router.navigate(['/library']);
      },
    });
  }

  private resolveMarkers(entry: EntryDetail, videoId: string, seasons: AdminSeason[]) {
    if (videoId === entry.videoId) {
      // Default video — use entry's markers
      this.activeMarkers.set(entry.videoMarkers);
    } else {
      // Non-default video (series episode) — find markers from seasons data
      for (const season of seasons.filter(s => s.entryId === this.entryId)) {
        for (const ep of season.episodes) {
          if (ep.videoId === videoId) {
            this.activeMarkers.set(ep.videoMarkers ?? []);
            return;
          }
        }
      }
      this.activeMarkers.set([]);
    }
  }

  private resolveNavigation(
    entry: EntryDetail,
    entryId: string,
    videoId: string,
    seasons: AdminSeason[],
    collections: AdminCollection[],
  ) {
    if (entry.isSeries) {
      this.resolveSeriesNavigation(entryId, videoId, seasons);
    } else if (entry.inCollection) {
      this.resolveCollectionNavigation(entryId, collections);
    } else {
      this.navigation.set(null);
    }
  }

  private resolveSeriesNavigation(entryId: string, videoId: string, seasons: AdminSeason[]) {
    const entrySeasons = seasons
      .filter(s => s.entryId === entryId)
      .sort((a, b) => a.position - b.position);

    const flat: { seasonPos: number; episodePos: number; videoId: string; label: string }[] = [];
    for (const season of entrySeasons) {
      const sortedEps = [...season.episodes].sort((a, b) => a.position - b.position);
      for (const ep of sortedEps) {
        flat.push({
          seasonPos: season.position,
          episodePos: ep.position,
          videoId: ep.videoId,
          label: `S${season.position} E${ep.position}`,
        });
      }
    }

    const currentIdx = flat.findIndex(f => f.videoId === videoId);
    if (currentIdx === -1 && flat.length === 0) {
      this.navigation.set(null);
      return;
    }

    const title = this.entry()?.title ?? '';
    const idx = currentIdx === -1 ? 0 : currentIdx;

    const prev = idx > 0 ? flat[idx - 1] : null;
    const next = idx < flat.length - 1 ? flat[idx + 1] : null;

    this.navigation.set({
      currentLabel: flat[idx]?.label ?? title,
      previous: prev ? { entryId, videoId: prev.videoId, title, label: prev.label } : null,
      next: next ? { entryId, videoId: next.videoId, title, label: next.label } : null,
    });

    // Set selected season for episode selector
    if (flat[idx]) {
      this.selectedSeason.set(flat[idx].seasonPos);
    }
  }

  private resolveCollectionNavigation(entryId: string, collections: AdminCollection[]) {
    let collection = this.playerState.collectionId
      ? collections.find(c => c.id === this.playerState.collectionId)
      : undefined;

    if (!collection) {
      collection = collections.find(c => c.entries.some(e => e.entryId === entryId));
    }

    if (!collection) {
      this.navigation.set(null);
      return;
    }

    const sorted = [...collection.entries].sort((a, b) => a.position - b.position);
    const currentIdx = sorted.findIndex(e => e.entryId === entryId);
    if (currentIdx === -1) {
      this.navigation.set(null);
      return;
    }

    const prev = currentIdx > 0 ? sorted[currentIdx - 1] : null;
    const next = currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : null;

    this.navigation.set({
      currentLabel: sorted[currentIdx].title,
      previous: prev
        ? { entryId: prev.entryId, videoId: '', title: prev.title, label: prev.title }
        : null,
      next: next
        ? { entryId: next.entryId, videoId: '', title: next.title, label: next.title }
        : null,
    });
  }

  private loadAndPlayVideo(videoId: string) {
    this.videoService.getStreamUrl(videoId).subscribe(url => {
        if (!this.shakaHandle) return;
        this.shakaHandle.player.load(url, undefined, 'video/mp4').then(() => {
            const video = this.shakaHandle!.video;
            const pos = this.playerState.positionInSeconds;

            const resume = () => {
                if (pos && pos > 0) {
                    const pct = pos / video.duration;
                    if (pct < 0.95) {
                        video.currentTime = pos;
                    }
                    this.playerState.positionInSeconds = undefined;
                }
                this.renderMarkerOverlay();
                this.startProgressTracking(videoId);
                video.play().catch(() => {});
            };

            if (video.readyState >= 1) {
                resume();
            } else {
                video.addEventListener('loadedmetadata', resume, { once: true });
            }
        });
    });
}

  // ── Marker overlay on Shaka seek bar ─────────────────────

  private renderMarkerOverlay() {
    const track = this.markerTrackRef?.nativeElement;
    if (!track) return;

    track.innerHTML = '';

    const d = this.duration || this.shakaHandle?.video.duration || 0;
    if (!d) return;

    for (const m of this.activeMarkers()) {
      const seg = document.createElement('div');
      seg.className = `marker-segment ${m.type === VideoMarkerType.Skip ? 'skip' : 'credits'}`;
      seg.style.left = `${(m.startInSeconds / d) * 100}%`;
      seg.style.width = `${((m.endInSeconds - m.startInSeconds) / d) * 100}%`;
      track.appendChild(seg);
    }
  }

  // ── Playback controls ────────────────────────────────────

  skipMarker() {
    const marker = this.activeMarker();
    if (!marker || !this.shakaHandle) return;

    const video = this.shakaHandle.video;
    const dur = video.duration || 0;

    // If the marker end is at or past the video duration, treat it as "video ended"
    if (dur > 0 && marker.endInSeconds >= dur - 1) {
      this.onVideoEnded();
      return;
    }

    video.currentTime = marker.endInSeconds;
  }

  // ── Navigation ──────────────────────────────────────────

  playItem(item: NavigationItem) {
    this.saveProgressNow();
    this.resetAutoNext();

    if (item.entryId !== this.entryId) {
      // Different entry (collection navigation) — full route change
      this.router.navigate(['/player', item.entryId], {
        state: {
          videoId: item.videoId || undefined,
          collectionId: this.playerState.collectionId,
        } as PlayerState,
      });
    } else {
      // Same entry (series episode switch) — swap video in-place
      this.switchVideo(item.videoId);
    }
  }

  private switchVideo(newVideoId: string) {
    this.clearPlayback();
    this.activeVideoId.set(newVideoId);

    // Re-resolve markers from cached seasons data
    const entry = this.entry();
    if (entry) {
      this.resolveMarkers(entry, newVideoId, this.seasons);
      this.resolveSeriesNavigation(this.entryId, newVideoId, this.seasons);
    }

    // Load the new video stream
    this.videoService.getStreamUrl(newVideoId).subscribe(url => {
      if (!this.shakaHandle) return;
      this.shakaHandle.player.load(url, undefined, 'video/mp4').then(() => {
        // No resume for episode switches — start from beginning
        this.renderMarkerOverlay();
        this.startProgressTracking(newVideoId);

        // Autoplay
        this.shakaHandle!.video.play().catch(() => {});
      });
    });
  }

  playNext() {
    const next = this.nextItem();
    if (next) this.playItem(next);
  }

  goBack() {
    this.saveProgressNow();
    this.router.navigate(['/library'], { replaceUrl: true, state: {} });
  }

  // ── Episode selector ────────────────────────────────────

  toggleEpisodePanel() {
    this.episodePanelOpen.update(v => !v);
  }

  pickEpisode(videoId: string) {
    if (videoId === this.activeVideoId()) return;
    this.episodePanelOpen.set(false);
    this.switchVideo(videoId);
  }

  // ── Credits auto-play logic ──────────────────────────────

  private checkCreditsAutoPlay() {
    if (this.autoPlayDismissed) return;
    if (this.autoNextCountdown() > 0) return;
    if (this.creditsTriggered) return;

    const markers = this.activeMarkers();
    const t = this.currentTime;

    const inCredits = markers.find(
      m => m.type === VideoMarkerType.Credits && t >= m.startInSeconds && t < m.endInSeconds,
    );

    if (inCredits && this.nextItem()) {
      // Immediately show auto-next countdown when credits start
      this.creditsTriggered = true;
      this.startAutoNextCountdown();
    }
  }

  private startAutoNextCountdown() {
    this.autoNextCountdown.set(5);
    this.autoNextTimer = setInterval(() => {
      const remaining = this.autoNextCountdown() - 1;
      if (remaining <= 0) {
        this.clearAutoNextTimer();
        this.playNext();
      } else {
        this.autoNextCountdown.set(remaining);
      }
    }, 1000);
  }

  cancelAutoNext() {
    this.autoPlayDismissed = true;
    this.resetAutoNext();
  }

  private resetAutoNext() {
    this.clearAutoNextTimer();
    this.autoNextCountdown.set(0);
  }

  private clearAutoNextTimer() {
    if (this.autoNextTimer) {
      clearInterval(this.autoNextTimer);
      this.autoNextTimer = undefined;
    }
  }

  private onVideoEnded() {
    const next = this.nextItem();
    if (next) {
      if (!this.autoPlayDismissed && this.autoNextCountdown() <= 0) {
        this.startAutoNextCountdown();
      } else if (this.autoPlayDismissed) {
        // User dismissed auto-next but video ended — still advance
        this.playItem(next);
      }
    } else {
      // No next item — go back to library
      this.saveProgressNow();
      this.router.navigate(['/library'], { replaceUrl: true, state: {} });
    }
  }

  // ── Mobile orientation fullscreen ───────────────────────

  private setupOrientationFullscreen() {
    if (!screen.orientation || !document.fullscreenEnabled) return;
    // Only apply on mobile-width devices
    if (window.innerWidth > 768) return;

    this.orientationHandler = () => {
      const type = screen.orientation.type;
      const video = this.shakaHandle?.video;
      if (!video) return;

      if (type.startsWith('landscape')) {
        const container = this.containerRef?.nativeElement;
        container?.requestFullscreen?.().catch(() => {});
      } else if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };

    screen.orientation.addEventListener('change', this.orientationHandler);
  }

  // ── Progress tracking ───────────────────────────────────

  private startProgressTracking(videoId: string) {
    clearInterval(this.progressInterval);
    this.progressInterval = setInterval(() => {
      const v = this.shakaHandle?.video;
      if (v && !v.paused && v.duration) {
        this.videoService.saveProgress(videoId, v.currentTime).subscribe();
      }
    }, 15_000);
  }

  private saveProgressNow() {
    const vid = this.activeVideoId();
    const v = this.shakaHandle?.video;
    if (vid && v?.duration) {
      this.videoService.saveProgress(vid, v.currentTime).subscribe();
    }
  }

  // ── Cleanup ──────────────────────────────────────────────

  private clearPlayback() {
    clearInterval(this.progressInterval);
    this.clearAutoNextTimer();
    this.creditsTriggered = false;
    this.autoPlayDismissed = false;
    this.autoNextCountdown.set(0);
  }

  private async cleanup() {
    this.clearPlayback();
    await this.shakaService.destroy();
    this.shakaHandle = null;
  }
}
