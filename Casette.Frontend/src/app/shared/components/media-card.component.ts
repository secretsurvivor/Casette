import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LibraryEntry } from '../models';
import { TmdbService } from '../../core/services/tmdb.service';

@Component({
  selector: 'app-media-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card" (click)="clicked.emit(item)">

      <div class="card-poster">
        <img
          [src]="posterUrl"
          [alt]="item.title"
          loading="lazy"
          (error)="onImgError($event)"
        />

        @if (progressPercent > 0 && progressPercent < 100) {
          <div class="card-badge">In Progress</div>
          <div class="card-progress">
            <div class="card-progress-fill" [style.width.%]="progressPercent"></div>
          </div>
        }

        <div class="card-overlay">
          <button class="play-btn">▶</button>
        </div>
      </div>

      <div class="card-title">{{ item.title }}</div>
      <div class="card-sub">{{ year }} · {{ item.type === 'FILM' ? 'Film' : 'TV' }}</div>
    </div>
  `,
  styleUrl: './media-card.component.scss'
})
export class MediaCardComponent {
  @Input() item!: LibraryEntry;
  @Input() progressPercent = 0;
  @Output() clicked = new EventEmitter<LibraryEntry>();

  constructor(private tmdb: TmdbService) {}

  get year(): string {
    if (!this.item.releaseDate) return '';
    return new Date(this.item.releaseDate).getFullYear().toString();
  }

  get posterUrl(): string {
    return this.tmdb.posterUrl(this.item.posterPath);
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = '/assets/poster-placeholder.png';
  }
}
