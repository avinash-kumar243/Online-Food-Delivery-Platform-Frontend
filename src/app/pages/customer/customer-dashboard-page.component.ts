import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoaderComponent } from '../../components/shared/loader.component';
import { EmptyStateComponent } from '../../components/shared/empty-state.component';
import { AuthService } from '../../services/auth.service';
import { RestaurantService } from '../../services/restaurant.service';
import { StatsService } from '../../services/stats.service';
import { getErrorMessage } from '../../services/api.utils';
import { CustomerStats, Restaurant } from '../../models/app.models';

@Component({
  selector: 'app-customer-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LoaderComponent, EmptyStateComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Customer overview</span>
        <h1>Discover, order, and track from one place.</h1>
        <p class="dashboard-subtitle">Your restaurant recommendations, order history, and spending summary update from live backend data.</p>
      </div>
      <a routerLink="/customer/restaurants" class="primary-btn">Browse restaurants</a>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <ng-container *ngIf="!loading() && !error()">
      <section class="stats-grid dashboard-section" *ngIf="stats() as stats">
        <article class="surface-card stat-card">
          <div class="stat-card-top"><span class="icon-badge red">O</span><span class="label">Total orders</span></div>
          <div class="value">{{ stats.totalOrders || 0 }}</div>
          <p class="helper">Orders placed across your account.</p>
        </article>
        <article class="surface-card stat-card">
          <div class="stat-card-top"><span class="icon-badge green">R</span><span class="label">Amount spent</span></div>
          <div class="value">Rs {{ (stats.totalAmountSpent || 0).toFixed(2) }}</div>
          <p class="helper">Paid order value recorded by payment service.</p>
        </article>
        <article class="surface-card stat-card">
          <div class="stat-card-top"><span class="icon-badge orange">C</span><span class="label">Cancelled</span></div>
          <div class="value">{{ stats.cancelledOrders || 0 }}</div>
          <p class="helper">Orders that did not complete.</p>
        </article>
        <article class="surface-card stat-card">
          <div class="stat-card-top"><span class="icon-badge slate">F</span><span class="label">Favorites</span></div>
          <div class="value">{{ stats.favoriteRestaurants.length }}</div>
          <p class="helper">Frequently ordered restaurants.</p>
        </article>
      </section>

      <section class="split-layout dashboard-section">
        <article class="surface-card section-card">
          <div class="section-header compact">
            <div>
              <h2>Favorite restaurants</h2>
              <p class="section-helper">Picked from your actual order history.</p>
            </div>
          </div>

          <div class="stack-list" *ngIf="stats()?.favoriteRestaurants?.length; else noFavorites">
            <a *ngFor="let restaurant of stats()?.favoriteRestaurants" class="list-card" [routerLink]="['/customer/restaurants', restaurant.restaurantId]">
              <div>
                <strong>{{ restaurant.name }}</strong>
                <p>{{ restaurant.cuisine }} • {{ restaurant.city }}</p>
              </div>
              <span class="badge-chip">★ {{ restaurant.avgRating || 0 }}</span>
            </a>
          </div>

          <ng-template #noFavorites>
            <app-empty-state title="No favorites yet" description="Your repeat orders will surface here once you start ordering."></app-empty-state>
          </ng-template>
        </article>

        <article class="surface-card section-card">
          <div class="section-header compact">
            <div>
              <h2>Recent orders</h2>
              <p class="section-helper">Live order feed from the order service.</p>
            </div>
            <a routerLink="/customer/orders" class="ghost-btn">View all</a>
          </div>

          <div class="stack-list" *ngIf="stats()?.recentOrders?.length; else noOrders">
            <a *ngFor="let order of stats()?.recentOrders" class="list-card" [routerLink]="['/customer/orders', order.orderId]">
              <div>
                <strong>Order #{{ order.orderId }}</strong>
                <p>{{ order.items.length }} items • {{ order.orderStatus }}</p>
              </div>
              <span class="badge-chip">Rs {{ order.finalAmount.toFixed(2) }}</span>
            </a>
          </div>

          <ng-template #noOrders>
            <app-empty-state title="No recent orders" description="Place your first order and live tracking will appear here."></app-empty-state>
          </ng-template>
        </article>
      </section>

      <section class="dashboard-section">
        <div class="section-header">
          <div>
            <h2>Trending nearby</h2>
            <p class="section-helper">Approved restaurants currently available for ordering.</p>
          </div>
          <a routerLink="/customer/restaurants" class="secondary-btn">See full list</a>
        </div>

        <div class="cards-grid" *ngIf="restaurants().length; else noRestaurants">
          <a *ngFor="let restaurant of restaurants()" class="surface-card tile-card" [routerLink]="['/customer/restaurants', restaurant.restaurantId]">
            <div class="tile-hero">{{ restaurant.name.slice(0, 1) }}</div>
            <strong>{{ restaurant.name }}</strong>
            <p>{{ restaurant.cuisine }} • {{ restaurant.city }}</p>
            <div class="meta-row"><span>Status</span><strong>{{ restaurant.isOpen ? 'Open' : 'Closed' }}</strong></div>
          </a>
        </div>

        <ng-template #noRestaurants>
          <app-empty-state title="No approved restaurants found" description="Once restaurants are approved and available, they will appear here."></app-empty-state>
        </ng-template>
      </section>
    </ng-container>
  `,
  styles: [`
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    .section-card { padding: 24px; }
    .compact { margin-bottom: 18px; }
    .list-card, .tile-card {
      display: block;
      padding: 18px;
      border-radius: var(--qb-radius-md);
      border: 1px solid var(--qb-border);
      background: linear-gradient(180deg, #fff, #fffaf9);
    }
    .list-card p, .tile-card p { color: var(--qb-text-muted); margin-top: 6px; }
    .tile-hero {
      width: 58px; height: 58px; border-radius: 18px; display: grid; place-items: center;
      margin-bottom: 14px; font-size: 1.5rem; font-weight: 700; color: var(--qb-primary);
      background: linear-gradient(135deg, #ffe7e1, #fff5f0);
    }
    .cards-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
    @media (max-width: 960px) { .cards-grid { grid-template-columns: 1fr; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerDashboardPageComponent {
  private readonly statsService = inject(StatsService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly stats = signal<CustomerStats | null>(null);
  readonly restaurants = signal<Restaurant[]>([]);

  constructor() {
    const customerId = this.authService.getCurrentUser()?.id;
    if (!customerId) {
      this.loading.set(false);
      this.error.set('Unable to resolve your customer session.');
      return;
    }

    this.statsService.getCustomerStats(customerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => this.stats.set(stats),
        error: (error) => this.error.set(getErrorMessage(error))
      });

    this.restaurantService.getApprovedRestaurants()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurants) => {
          this.restaurants.set(restaurants.slice(0, 3));
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }
}
