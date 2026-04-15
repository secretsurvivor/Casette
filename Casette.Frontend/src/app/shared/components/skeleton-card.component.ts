import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-card">
      <div class="skeleton-poster"></div>
      <div class="skeleton-line long"></div>
      <div class="skeleton-line short"></div>
    </div>
  `,
  styles: [`
    .skeleton-card { cursor: default; }

    .skeleton-poster {
      aspect-ratio: 2/3;
      border-radius: 3px;
      margin-bottom: 10px;
      background: #1a1a22;
      position: relative;
      overflow: hidden;

      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(255,255,255,0.04) 50%,
          transparent 100%
        );
        animation: shimmer 1.6s infinite;
        transform: translateX(-100%);
      }
    }

    .skeleton-line {
      height: 10px;
      border-radius: 2px;
      background: #1a1a22;
      margin-bottom: 6px;
      position: relative;
      overflow: hidden;

      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(255,255,255,0.04) 50%,
          transparent 100%
        );
        animation: shimmer 1.6s infinite;
        transform: translateX(-100%);
      }

      &.long  { width: 85%; }
      &.short { width: 50%; }
    }

    @keyframes shimmer {
      to { transform: translateX(100%); }
    }
  `]
})
export class SkeletonCardComponent {}
