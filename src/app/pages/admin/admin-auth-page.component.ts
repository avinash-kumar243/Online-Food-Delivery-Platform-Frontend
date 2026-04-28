import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-auth-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="auth-page">
      <div class="surface-card auth-card">
        <span class="dashboard-kicker">Admin access</span>
        <h1>Sign in to the QuickBite control center.</h1>
        <p class="dashboard-subtitle">Use the admin credentials configured in the auth-service bootstrap properties.</p>

        <label><span>Email</span><input [(ngModel)]="email" type="email" /></label>
        <label><span>Password</span><input [(ngModel)]="password" type="password" /></label>

        <p *ngIf="error()" class="error-text">{{ error() }}</p>
        <button type="button" class="primary-btn" [disabled]="submitting()" (click)="login()">
          {{ submitting() ? 'Signing in...' : 'Admin login' }}
        </button>
        <a routerLink="/welcome" class="ghost-btn">Back</a>
      </div>
    </section>
  `,
  styles: [`
    .auth-page{min-height:100vh;display:grid;place-items:center;padding:24px}
    .auth-card{width:min(460px,100%);padding:28px;display:grid;gap:16px}
    h1{font-size:2rem}
    label span{display:block;margin-bottom:8px;font-weight:600}
    input{width:100%;min-height:48px;border:1px solid var(--qb-border);border-radius:14px;padding:0 14px}
    .error-text{color:#dc2626}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminAuthPageComponent {
  private readonly authService = inject(AuthService);

  readonly submitting = signal(false);
  readonly error = signal('');

  email = '';
  password = '';

  login(): void {
    this.error.set('');
    if (!this.email.trim() || !this.password.trim()) {
      this.error.set('Email and password are required.');
      return;
    }

    this.submitting.set(true);
    this.authService.login({ email: this.email.trim(), password: this.password }, '/admin/login')
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => this.authService.redirectToDashboard(),
        error: (error: any) => this.error.set(error?.error?.message || error?.message || 'Admin login failed.')
      });
  }
}
