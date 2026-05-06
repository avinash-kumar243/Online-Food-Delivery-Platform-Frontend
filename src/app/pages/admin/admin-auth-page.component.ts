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
    .auth-page {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background:
        radial-gradient(circle at top left, rgba(15, 122, 95, 0.16), transparent 24rem),
        radial-gradient(circle at top right, rgba(245, 158, 11, 0.12), transparent 22rem),
        linear-gradient(180deg, #f3faf7 0%, #f7fafc 44%, #eef4f8 100%);
    }
    .auth-card {
      width: min(460px, 100%);
      padding: 28px;
      display: grid;
      gap: 16px;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.78);
      border: 1px solid rgba(148, 163, 184, 0.18);
      box-shadow: var(--qb-shadow);
      backdrop-filter: blur(22px);
    }
    h1 {
      font-size: 2.1rem;
      line-height: 1.04;
    }
    label {
      display: grid;
      gap: 8px;
    }
    label span {
      font-weight: 600;
    }
    .error-text {
      padding: 14px 16px;
      border-radius: 12px;
      background: rgba(194, 65, 61, 0.1);
      border: 1px solid rgba(194, 65, 61, 0.16);
      color: var(--qb-danger);
      font-weight: 600;
    }
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
