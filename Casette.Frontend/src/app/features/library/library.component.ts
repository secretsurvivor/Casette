import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { MediaCardComponent } from '../../shared/components/media-card.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card.component';
import { SkeletonHeroComponent } from '../../shared/components/skeleton-hero.component';
import { LibraryEntry, ProgressEntry, PlayerState, formatDuration } from '../../shared/models';
import { GraphqlService } from '../../core/services/graphql.service';
import { TmdbService } from '../../core/services/tmdb.service';
import { AuthService } from '../../core/services/auth.service';
import { NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, RouterModule, MediaCardComponent, SkeletonCardComponent, SkeletonHeroComponent],
  template: `
    <div class="library">

      <nav>
        <div class="nav-logo">CASETTE</div>
        <div class="nav-spacer"></div>
        <div class="nav-right">
          @if (isAdmin()) {
            <a routerLink="/admin" class="nav-admin" title="Admin">⚙</a>
          }
          <div class="nav-avatar" title="Sign out" (click)="signOut()">⏻</div>
        </div>
      </nav>

      @if (loading()) {
        <app-skeleton-hero />
      } @else if (heroItem()) {
        <div class="hero">
          <div class="hero-backdrop" [style.backgroundImage]="'url(' + backdropUrl() + ')'"></div>
          <div class="hero-gradient"></div>
          <div class="hero-content">
            <div class="hero-label">{{ heroProgress() > 0 ? 'Continue Watching' : 'Recently Added' }}</div>
            <div class="hero-title">{{ heroItem()!.title }}</div>
            <div class="hero-meta">
              {{ heroYear() }}
              @if (heroRuntime()) {<span> · {{ heroRuntime() }}</span>}
              @if (heroProgress() > 0) {<span> · {{ heroProgress() }}% watched</span>}
            </div>
            <div class="hero-actions">
              <button class="btn-play" (click)="playItem(heroItem()!)">
                {{ heroProgress() > 0 ? '▶ RESUME' : '▶ PLAY' }}
              </button>
              <button class="btn-info">MORE INFO</button>
            </div>
          </div>
        </div>
      }

      <div class="library-content">
        @if (loading()) {
          <div class="section">
            <div class="skeleton-section-title"></div>
            <div class="grid">
              @for (_ of skeletonItems; track $index) { <app-skeleton-card /> }
            </div>
          </div>
          <div class="section">
            <div class="skeleton-section-title"></div>
            <div class="grid">
              @for (_ of skeletonItems; track $index) { <app-skeleton-card /> }
            </div>
          </div>
        } @else {
          @if (continueWatching().length > 0) {
            <div class="section">
              <div class="section-header">
                <div class="section-title">CONTINUE WATCHING</div>
                <div class="section-count">{{ continueWatching().length }} titles</div>
              </div>
              <div class="grid">
                @for (item of continueWatching(); track item.id) {
                  <app-media-card [item]="item" [progressPercent]="getProgressPercent(item.id)" (clicked)="playContinueWatching($event)" />
                }
              </div>
            </div>
          }
          <div class="section">
            <div class="section-header">
              <div class="section-title">YOUR LIBRARY</div>
              <div class="section-count">{{ entries().length }} titles</div>
              <input class="library-search" placeholder="Search by tag..."
                (input)="onSearch($any($event.target).value)" />
            </div>
            @if (entries().length > 0) {
              <div class="grid">
                @for (item of entries(); track item.id) {
                  <app-media-card [item]="item" [progressPercent]="getProgressPercent(item.id)" (clicked)="playItem($event)" />
                }
              </div>
            } @else {
              <div class="empty-state">Nothing found</div>
            }
          </div>
        }
      </div>

    </div>
  `,
  styleUrl: './library.component.scss'
})
export class LibraryComponent implements OnInit, OnDestroy {
  entries        = signal<LibraryEntry[]>([]);
  progressData   = signal<ProgressEntry[]>([]);
  loading        = signal(true);
  skeletonItems  = Array(8);

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;
  private routerSub?: Subscription;

  constructor(
    private graphql: GraphqlService,
    private tmdb: TmdbService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    // Initial load — all entries + progress
    this.loadData();

    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      filter((e: any) => e.url == '/library')
    ).subscribe(() => this.loadData());

    // Debounced search → re-fetch entries from GraphQL with tag search
    this.searchSub = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
    ).subscribe(q => {
      this.graphql.getEntries(q || undefined).subscribe({
        next: entries => { this.entries.set(entries); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    });
  }

  private loadData() {
    this.loading.set(true);
    
    this.graphql.getEntries().subscribe({
        next: entries => { this.entries.set(entries); this.loading.set(false); },
        error: () => this.loading.set(false),
    });

    this.graphql.getProgress().subscribe({
        next: progress => this.progressData.set(progress),
    });
  }

  ngOnDestroy() {
    this.searchSub?.unsubscribe();
    this.routerSub?.unsubscribe();
  }

  onSearch(value: string) {
    this.searchSubject.next(value.trim());
  }

  // Continue watching: entries that have progress between 2%–95%
  continueWatching = computed(() => {
    const progress = this.progressData();
    const entries = this.entries();
    if (!progress.length || !entries.length) return [];

    return progress
      .filter(p => {
        const pct = p.positionInSeconds / p.durationInSeconds;
        return pct > 0.02 && pct < 0.95;
      })
      .map(p => entries.find(e => e.id === p.entryId))
      .filter((e): e is LibraryEntry => !!e);
  });

  heroItem    = computed<LibraryEntry | null>(() => this.continueWatching()[0] ?? this.entries()[0] ?? null);
  heroYear    = computed(() => {
    const rd = this.heroItem()?.releaseDate;
    return rd ? new Date(rd).getFullYear().toString() : '';
  });
  heroRuntime  = computed(() => formatDuration(this.heroItem()?.durationInSeconds ?? 0));
  heroProgress = computed(() => {
    const hero = this.heroItem();
    if (!hero) return 0;
    const prog = this.progressData().find(p => p.entryId === hero.id);
    if (!prog) return 0;
    return Math.round((prog.positionInSeconds / prog.durationInSeconds) * 100);
  });
  backdropUrl  = computed(() => this.tmdb.backdropUrl(this.heroItem()?.backdropPath ?? null));

  /** Navigate to player — default video (no state override). */
  playItem(item: LibraryEntry) {
    this.router.navigate(['/player', item.id], { state: {} });
  }

  /** Navigate to player for a continue-watching item — pass the specific videoId via router state. */
  playContinueWatching(item: LibraryEntry) {
    const prog = this.progressData().find(p => p.entryId === item.id);
    if (prog) {
      this.router.navigate(['/player', item.id], {
        state: {
          videoId: prog.videoId,
          positionInSeconds: prog.positionInSeconds,
        } as PlayerState,
      });
    } else {
      this.playItem(item);
    }
  }

  signOut() { this.auth.logout(); }
  isAdmin() { return this.auth.isAdmin(); }

  getProgressPercent(entryId: string): number {
    const prog = this.progressData().find(p => p.entryId === entryId);
    if (!prog || !prog.durationInSeconds) return 0;
    return Math.round((prog.positionInSeconds / prog.durationInSeconds) * 100);
  }
}
