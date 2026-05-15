import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoaderComponent } from '../../components/shared/loader.component';
import { AuthService } from '../../services/auth.service';
import { StatsService } from '../../services/stats.service';
import { CustomerStats } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';

@Component({
  selector: 'app-customer-stats-page',
  standalone: true,
  imports: [CommonModule, LoaderComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Customer stats</span>
        <h1>See how your ordering patterns are evolving.</h1>
        <p class="dashboard-subtitle">Derived from your real orders and payment records.</p>
      </div>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <section class="stats-grid dashboard-section" *ngIf="!loading() && !error() && stats() as stats">
      <article class="surface-card stat-card"><div class="value">{{ stats.totalOrders || 0 }}</div><p class="helper">Total orders</p></article>
      <article class="surface-card stat-card"><div class="value">Rs {{ (stats.totalAmountSpent || 0).toFixed(2) }}</div><p class="helper">Total spent</p></article>
      <article class="surface-card stat-card"><div class="value">{{ stats.completedOrders || 0 }}</div><p class="helper">Completed orders</p></article>
      <article class="surface-card stat-card"><div class="value">{{ stats.cancelledOrders || 0 }}</div><p class="helper">Cancelled orders</p></article>
    </section>
  `,
  styles: [`
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    .stat-card { padding: 24px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerStatsPageComponent {
  private readonly authService = inject(AuthService);
  private readonly statsService = inject(StatsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly stats = signal<CustomerStats | null>(null);

  constructor() {
    const customerId = this.authService.getCurrentUser()?.id;
    if (!customerId) {
      this.error.set('Unable to resolve your customer session.');
      this.loading.set(false);
      return;
    }

    this.statsService.getCustomerStats(customerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => {
          this.stats.set(stats);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }
}
