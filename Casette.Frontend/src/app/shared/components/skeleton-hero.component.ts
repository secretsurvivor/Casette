import { Component } from '@angular/core';

@Component({
  selector: 'app-skeleton-hero',
  standalone: true,
  template: `
    <div class="skeleton-hero">
      <div class="skeleton-label"></div>
      <div class="skeleton-title"></div>
      <div class="skeleton-title short"></div>
      <div class="skeleton-meta"></div>
      <div class="skeleton-actions">
        <div class="skeleton-btn"></div>
        <div class="skeleton-btn"></div>
      </div>
    </div>
  `,
  styles: [`
    .skeleton-hero {
      height: 280px;
      padding: 0 20px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding-bottom: 28px;
      background: #111116;

      @media (min-width: 640px)  { height: 360px; padding: 0 40px 48px; }
      @media (min-width: 1024px) { height: 440px; }
    }

    .skeleton-label {
      width: 120px; height: 10px;
      border-radius: 2px; background: #1a1a22;
      margin-bottom: 16px;
    }

    .skeleton-title {
      width: 70%; height: 52px;
      border-radius: 2px; background: #1a1a22;
      margin-bottom: 8px;

      &.short { width: 45%; height: 52px; margin-bottom: 16px; }

      @media (min-width: 640px) { height: 64px; &.short { height: 64px; } }
    }

    .skeleton-meta {
      width: 300px; height: 10px;
      border-radius: 2px; background: #1a1a22;
      margin-bottom: 24px;
    }

    .skeleton-actions { display: flex; gap: 12px; }

    .skeleton-btn {
      width: 120px; height: 40px;
      border-radius: 2px; background: #1a1a22;
    }

    // shimmer on all children
    .skeleton-label, .skeleton-title, .skeleton-meta, .skeleton-btn {
      position: relative; overflow: hidden;

      &::after {
        content: '';
        position: absolute; inset: 0;
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%);
        animation: shimmer 1.6s infinite;
        transform: translateX(-100%);
      }
    }

    @keyframes shimmer { to { transform: translateX(100%); } }
  `]
})
export class SkeletonHeroComponent {}
