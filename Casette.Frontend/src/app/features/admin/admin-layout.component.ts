import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-shell">
      <aside class="sidebar">
        <div class="sidebar-brand">CASETTE</div>
        <div class="sidebar-label">Admin</div>
        <nav class="sidebar-nav">
          <a routerLink="/admin/entries" routerLinkActive="active">
            <span class="nav-icon">◉</span> Entries
          </a>
          <a routerLink="/admin/videos" routerLinkActive="active">
            <span class="nav-icon">▶</span> Videos
          </a>
          <a routerLink="/admin/collections" routerLinkActive="active">
            <span class="nav-icon">◫</span> Collections
          </a>
          <a routerLink="/admin/seasons" routerLinkActive="active">
            <span class="nav-icon">≡</span> Seasons
          </a>
        </nav>
        <div class="sidebar-footer">
          <a routerLink="/library" class="back-link">← Back to Library</a>
        </div>
      </aside>
      <main class="admin-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .admin-shell {
      display: flex;
      min-height: 100vh;
    }

    .sidebar {
      width: 240px;
      background: #0f0f13;
      border-right: 1px solid #1a1a22;
      display: flex;
      flex-direction: column;
      padding: 24px 0;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 10;
    }

    .sidebar-brand {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 28px;
      letter-spacing: 4px;
      color: #e8c97a;
      padding: 0 24px;
      margin-bottom: 4px;
    }

    .sidebar-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: #666;
      padding: 0 24px;
      margin-bottom: 32px;
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sidebar-nav a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 24px;
      color: #888;
      font-size: 14px;
      font-weight: 400;
      transition: all 0.15s ease;
      border-left: 3px solid transparent;
    }

    .sidebar-nav a:hover {
      color: #f0eee8;
      background: #1a1a22;
    }

    .sidebar-nav a.active {
      color: #e8c97a;
      background: rgba(232, 201, 122, 0.05);
      border-left-color: #e8c97a;
    }

    .nav-icon {
      font-size: 16px;
      width: 20px;
      text-align: center;
    }

    .sidebar-footer {
      margin-top: auto;
      padding: 0 24px;
    }

    .back-link {
      color: #666;
      font-size: 13px;
      transition: color 0.15s ease;
    }

    .back-link:hover {
      color: #e8c97a;
    }

    .admin-content {
      flex: 1;
      margin-left: 240px;
      padding: 32px 40px;
      min-height: 100vh;
    }
  `]
})
export class AdminLayoutComponent {}
