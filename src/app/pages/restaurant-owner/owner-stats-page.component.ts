import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardStats } from '../../models/app.models';
import { AuthService } from '../../services/auth.service';
import { RestaurantService } from '../../services/restaurant.service';
import { StatsService } from '../../services/stats.service';

@Component({
  selector: 'app-owner-stats-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="section-header"><div><span class="dashboard-kicker">Stats</span><h1>Restaurant performance snapshot.</h1></div></section>
    <section class="stats-grid" *ngIf="stats() as stats">
      <article class="surface-card stat-card"><div class="value">{{ stats.totalOrders || 0 }}</div><p class="helper">Total orders</p></article>
      <article class="surface-card stat-card"><div class="value">{{ stats.todayOrders || 0 }}</div><p class="helper">Today orders</p></article>
      <article class="surface-card stat-card"><div class="value">Rs {{ (stats.totalRevenue || 0).toFixed(2) }}</div><p class="helper">Revenue</p></article>
      <article class="surface-card stat-card"><div class="value">{{ stats.completedOrders || 0 }}</div><p class="helper">Completed</p></article>
    </section>
  `,
  styles: [`.stat-card{padding:24px}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OwnerStatsPageComponent {
  private readonly authService = inject(AuthService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly statsService = inject(StatsService);
  private readonly destroyRef = inject(DestroyRef);
  readonly stats = signal<DashboardStats | null>(null);

  constructor() {
    const ownerId = this.authService.getCurrentUser()?.id;
    if (!ownerId) return;
    this.restaurantService.getMyRestaurant(ownerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurant) => {
          if (!restaurant) return;
          this.statsService.getRestaurantOwnerStats(restaurant.restaurantId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ next: (stats) => this.stats.set(stats) });
        }
      });
  }
}
