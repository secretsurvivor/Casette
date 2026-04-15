import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrap">
      <div class="login-bg"></div>

      <div class="login-card">
        <div class="login-logo">CASETTE</div>
        <div class="login-tagline">Your private cinema</div>

        <div class="field">
          <label>Access Key</label>
          <input
            type="password"
            [(ngModel)]="accessKey"
            placeholder="Enter your access key"
            (keydown.enter)="submit()"
            [class.error]="hasError()"
            autocomplete="current-password"
          />
          @if (hasError()) {
            <span class="field-error">Invalid access key. Check with your host.</span>
          }
        </div>

        <label class="remember">
          <input type="checkbox" [(ngModel)]="remember" />
          <span class="remember-box"></span>
          <span class="remember-label">Remember me on this device</span>
        </label>

        <button class="btn-login" (click)="submit()" [disabled]="loading()">
          {{ loading() ? 'SIGNING IN...' : 'SIGN IN' }}
        </button>

        <p class="login-footer">Access by invitation only</p>
      </div>
    </div>
  `,
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  accessKey = '';
  remember  = true;
  loading   = signal(false);
  hasError  = signal(false);

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    if (!this.accessKey.trim() || this.loading()) return;

    this.hasError.set(false);
    this.loading.set(true);

    this.auth.login(this.accessKey, this.remember).subscribe({
      next: () => this.router.navigate(['/library']),
      error: () => {
        this.hasError.set(true);
        this.loading.set(false);
      }
    });
  }
}
