import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoaderComponent } from '../../components/shared/loader.component';
import { DashboardStats, MenuItem, Restaurant } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';
import { AuthService } from '../../services/auth.service';
import { MenuService } from '../../services/menu.service';
import { RestaurantService } from '../../services/restaurant.service';
import { StatsService } from '../../services/stats.service';

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
      <a
        [routerLink]="restaurant()?.isApproved ? '/restaurant-owner/menu' : '/restaurant-owner/register-restaurant'"
        class="primary-btn">
        {{ restaurant()?.isApproved ? 'Manage menu' : restaurant() ? 'Update restaurant' : 'Register restaurant' }}
      </a>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <ng-container *ngIf="!loading() && !error()">
      <section class="surface-card hero-card" *ngIf="restaurant() as restaurant; else noRestaurant">
        <div>
          <span class="dashboard-kicker">{{ restaurant.status || (restaurant.isApproved ? 'APPROVED' : 'PENDING_APPROVAL') }}</span>
          <h2>{{ restaurant.name }}</h2>
          <p class="dashboard-subtitle">{{ restaurant.address }} - {{ restaurant.city }}</p>
          <p class="dashboard-subtitle" *ngIf="restaurant.rejectionReason">Admin feedback: {{ restaurant.rejectionReason }}</p>
        </div>
        <div class="meta-list">
          <div class="meta-row"><span>Open status</span><strong>{{ restaurant.isOpen ? 'Open' : 'Closed' }}</strong></div>
          <div class="meta-row"><span>Approval</span><strong>{{ restaurant.approvalStatus || (restaurant.isApproved ? 'APPROVED' : 'PENDING') }}</strong></div>
          <div class="meta-row"><span>Submitted</span><strong>{{ restaurant.submittedAt || 'Not available' }}</strong></div>
          <div class="meta-row"><span>Menu access</span><strong>{{ restaurant.isApproved ? 'Enabled' : 'Disabled until approval' }}</strong></div>
        </div>
      </section>

      <section *ngIf="restaurant()?.isApproved" class="surface-card hero-card dashboard-section approved-actions">
        <div>
          <span class="dashboard-kicker">Approved</span>
          <h2>Your restaurant is live for menu setup.</h2>
          <p class="dashboard-subtitle">You can now add menu items and start preparing the catalog for customers.</p>
        </div>
        <a routerLink="/restaurant-owner/menu" class="primary-btn">Open menu manager</a>
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

      <section *ngIf="restaurant()?.isApproved" class="dashboard-section">
        <div class="section-header compact-header">
          <div>
            <span class="dashboard-kicker">Menu snapshot</span>
            <h2>Items currently in your menu</h2>
          </div>
          <a routerLink="/restaurant-owner/menu" class="secondary-btn">Open full menu</a>
        </div>

        <section *ngIf="menuItems().length; else noMenuItems" class="stats-grid">
          <article *ngFor="let item of menuItems()" class="surface-card stat-card menu-card">
            <div class="value">{{ item.name }}</div>
            <p class="helper">{{ item.categoryName || 'Menu item' }}</p>
            <p class="helper">Rs {{ item.price }}</p>
          </article>
        </section>

        <ng-template #noMenuItems>
          <section class="empty-state">No menu items added yet. Add your first item to make it visible here and to customers.</section>
        </ng-template>
      </section>
    </ng-container>
  `,
  styles: [`
    .hero-card, .stat-card { padding: 24px; }
    .approved-actions { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    .compact-header h2 { margin: 0; }
    .menu-card .value { font-size: 1.1rem; }
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    @media (max-width: 860px) { .approved-actions { flex-direction: column; align-items: flex-start; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RestaurantOwnerDashboardPageComponent {
  private readonly authService = inject(AuthService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly menuService = inject(MenuService);
  private readonly statsService = inject(StatsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly restaurant = signal<Restaurant | null>(null);
  readonly stats = signal<DashboardStats | null>(null);
  readonly menuItems = signal<MenuItem[]>([]);

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

          this.menuService.getMyMenuItems(restaurant.restaurantId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (items) => this.menuItems.set(items.slice(0, 6)),
              error: () => this.menuItems.set([])
            });

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
