import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoaderComponent } from '../../components/shared/loader.component';
import { AuthService } from '../../services/auth.service';
import { RestaurantService } from '../../services/restaurant.service';
import { StatsService } from '../../services/stats.service';
import { DashboardStats, Restaurant } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';

@Component({
  selector: 'app-restaurant-owner-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LoaderComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Restaurant owner</span>
        <h1>Run your restaurant from a single control center.</h1>
        <p class="dashboard-subtitle">Track approval status, menu progress, and live order performance with real service data.</p>
      </div>
      <a routerLink="/restaurant-owner/register-restaurant" class="primary-btn">Register restaurant</a>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <ng-container *ngIf="!loading() && !error()">
      <section class="surface-card hero-card" *ngIf="restaurant() as restaurant; else noRestaurant">
        <div>
          <span class="dashboard-kicker">{{ restaurant.status || (restaurant.isApproved ? 'APPROVED' : 'PENDING_APPROVAL') }}</span>
          <h2>{{ restaurant.name }}</h2>
          <p class="dashboard-subtitle">{{ restaurant.address }} • {{ restaurant.city }}</p>
        </div>
        <div class="meta-list">
          <div class="meta-row"><span>Open status</span><strong>{{ restaurant.isOpen ? 'Open' : 'Closed' }}</strong></div>
          <div class="meta-row"><span>Approval</span><strong>{{ restaurant.isApproved ? 'Approved' : 'Pending / Rejected' }}</strong></div>
        </div>
      </section>

      <ng-template #noRestaurant>
        <section class="empty-state">You have not registered a restaurant yet. Use the registration form to get started.</section>
      </ng-template>

      <section class="stats-grid dashboard-section" *ngIf="stats() as stats">
        <article class="surface-card stat-card"><div class="value">{{ stats.totalOrders || 0 }}</div><p class="helper">Total orders</p></article>
        <article class="surface-card stat-card"><div class="value">{{ stats.todayOrders || 0 }}</div><p class="helper">Today orders</p></article>
        <article class="surface-card stat-card"><div class="value">Rs {{ (stats.totalRevenue || 0).toFixed(2) }}</div><p class="helper">Revenue</p></article>
        <article class="surface-card stat-card"><div class="value">{{ stats.pendingOrders || 0 }}</div><p class="helper">Pending orders</p></article>
      </section>
    </ng-container>
  `,
  styles: [`.hero-card,.stat-card{padding:24px} h1{font-size:clamp(2rem,3vw,3rem)}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RestaurantOwnerDashboardPageComponent {
  private readonly authService = inject(AuthService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly statsService = inject(StatsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly restaurant = signal<Restaurant | null>(null);
  readonly stats = signal<DashboardStats | null>(null);

  constructor() {
    const ownerId = this.authService.getCurrentUser()?.id;
    if (!ownerId) {
      this.error.set('Unable to resolve restaurant owner session.');
      this.loading.set(false);
      return;
    }

    this.restaurantService.getMyRestaurant(ownerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurant) => {
          this.restaurant.set(restaurant);
          if (!restaurant) {
            this.loading.set(false);
            return;
          }

          this.statsService.getRestaurantOwnerStats(restaurant.restaurantId)
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
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }
}
