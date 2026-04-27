import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardStats } from '../../models/app.models';
import { AuthService } from '../../services/auth.service';
import { StatsService } from '../../services/stats.service';

@Component({
  selector: 'app-partner-earnings-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="section-header"><div><span class="dashboard-kicker">Earnings</span><h1>See your delivery performance and estimated payouts.</h1></div></section>
    <section class="stats-grid" *ngIf="stats() as stats">
      <article class="surface-card stat-card"><div class="value">{{ stats.totalDeliveries || 0 }}</div><p class="helper">Total deliveries</p></article>
      <article class="surface-card stat-card"><div class="value">{{ stats.todayDeliveries || 0 }}</div><p class="helper">Today deliveries</p></article>
      <article class="surface-card stat-card"><div class="value">Rs {{ (stats.totalEarnings || 0).toFixed(2) }}</div><p class="helper">Estimated earnings</p></article>
      <article class="surface-card stat-card"><div class="value">Rs {{ (stats.todayEarnings || 0).toFixed(2) }}</div><p class="helper">Today earnings</p></article>
    </section>
  `,
  styles: [`.stat-card{padding:24px}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartnerEarningsPageComponent {
  private readonly authService = inject(AuthService);
  private readonly statsService = inject(StatsService);
  private readonly destroyRef = inject(DestroyRef);
  readonly stats = signal<DashboardStats | null>(null);

  constructor() {
    const partnerId = this.authService.getCurrentUser()?.id;
    if (!partnerId) return;
    this.statsService.getDeliveryPartnerStats(partnerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (stats) => this.stats.set(stats) });
  }
}
