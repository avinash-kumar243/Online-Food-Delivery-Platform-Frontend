import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoaderComponent } from '../../components/shared/loader.component';
import { SuspensionBannerComponent } from '../../components/shared/suspension-banner.component';
import { DashboardStats, MenuItem, Restaurant } from '../../models/app.models';
import { AccountStatusService } from '../../services/account-status.service';
import { getErrorMessage } from '../../services/api.utils';
import { AuthService } from '../../services/auth.service';
import { MenuService } from '../../services/menu.service';
import { NotificationService } from '../../services/notification.service';
import { ProfileService } from '../../services/profile.service';
import { RealtimeService } from '../../services/realtime.service';
import { RestaurantService } from '../../services/restaurant.service';
import { StatsService } from '../../services/stats.service';

@Component({
  selector: 'app-restaurant-owner-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LoaderComponent, SuspensionBannerComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Restaurant owner</span>
        <h1>Run your restaurant from a single control center.</h1>
        <p class="dashboard-subtitle">Track approval status, menu progress, and live order performance with real service data.</p>
      </div>
      <a
        [routerLink]="restaurant()?.isApproved ? '/restaurant-owner/menu' : '/restaurant-owner/register-restaurant'"
        class="primary-btn"
        [class.disabled-link]="ownerSuspended()">
        {{ restaurant()?.isApproved ? 'Manage menu' : restaurant() ? 'Update restaurant' : 'Register restaurant' }}
      </a>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <ng-container *ngIf="!loading() && !error()">
      <app-suspension-banner
        *ngIf="ownerSuspended()"
        class="dashboard-section"
        [message]="accountStatusService.getSuspensionBannerMessage()">
      </app-suspension-banner>

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
          <button
            *ngIf="restaurant.isApproved"
            type="button"
            class="primary-btn status-toggle-btn"
            [disabled]="ownerSuspended() || updatingStatus()"
            (click)="toggleRestaurantStatus()">
            {{ updatingStatus() ? 'Updating...' : restaurant.isOpen ? 'Close restaurant' : 'Open restaurant' }}
          </button>
        </div>
      </section>

      <section *ngIf="restaurant()?.isApproved" class="surface-card hero-card dashboard-section approved-actions">
        <div>
          <span class="dashboard-kicker">Approved</span>
          <h2>Your restaurant is live for menu setup.</h2>
          <p class="dashboard-subtitle">You can now add menu items and start preparing the catalog for customers.</p>
        </div>
        <a routerLink="/restaurant-owner/menu" class="primary-btn" [class.disabled-link]="ownerSuspended()">Open menu manager</a>
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
          <div class="compact-header-copy">
            <span class="dashboard-kicker">Menu snapshot</span>
            <div class="compact-header-row">
              <h2>Items currently in your menu</h2>
              <a routerLink="/restaurant-owner/menu" class="secondary-btn compact-header-action">Open full menu</a>
            </div>
          </div>
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
    .compact-header {
      display: block;
      margin-top: 14px;
    }
    .compact-header-copy {
      display: grid;
      gap: 12px;
      padding-top: 12px;
    }
    .compact-header .dashboard-kicker {
      margin: 0;
    }
    .compact-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      flex-wrap: wrap;
    }
    .compact-header h2 {
      margin: 0;
      white-space: nowrap;
    }
    .compact-header-action {
      flex-shrink: 0;
      white-space: nowrap;
    }
    .menu-card .value { font-size: 1.1rem; }
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    .hero-card {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
      gap: 18px;
    }
    h2 {
      margin-bottom: 8px;
      font-size: clamp(1.7rem, 2.1vw, 2.4rem);
      line-height: 1.08;
    }
    .status-toggle-btn {
      width: 100%;
      margin-top: 8px;
    }
    .disabled-link {
      pointer-events: none;
      opacity: 0.6;
    }
    @media (max-width: 860px) {
      .approved-actions,
      .hero-card {
        grid-template-columns: 1fr;
        flex-direction: column;
        align-items: flex-start;
      }
      .compact-header,
      .compact-header-copy {
        display: grid;
      }
      .compact-header-row {
        flex-direction: column;
        align-items: flex-start;
      }
      .compact-header-action {
        width: auto;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RestaurantOwnerDashboardPageComponent {
  private readonly authService = inject(AuthService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly menuService = inject(MenuService);
  private readonly statsService = inject(StatsService);
  private readonly profileService = inject(ProfileService);
  private readonly notificationService = inject(NotificationService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly accountStatusService = inject(AccountStatusService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly restaurant = signal<Restaurant | null>(null);
  readonly stats = signal<DashboardStats | null>(null);
  readonly menuItems = signal<MenuItem[]>([]);
  readonly updatingStatus = signal(false);
  readonly ownerSuspended = signal(false);

  constructor() {
    const ownerId = this.authService.getCurrentUser()?.id;
    if (!ownerId) {
      this.error.set('Unable to resolve restaurant owner session.');
      this.loading.set(false);
      return;
    }

    this.profileService.getRestaurantOwnerProfile(ownerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => this.ownerSuspended.set(this.accountStatusService.isSuspended(profile)),
        error: () => undefined
      });

    this.loadDashboard(ownerId);

    this.realtimeService.orderEvents$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadDashboard(ownerId));
  }

  private loadDashboard(ownerId: number): void {
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

  toggleRestaurantStatus(): void {
    const restaurant = this.restaurant();
    if (!restaurant || !restaurant.isApproved || this.updatingStatus()) {
      return;
    }
    if (this.ownerSuspended()) {
      this.accountStatusService.notifySuspended();
      return;
    }

    this.updatingStatus.set(true);
    this.restaurantService.updateRestaurantStatus(restaurant.restaurantId, !restaurant.isOpen)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedRestaurant) => {
          this.restaurant.set(updatedRestaurant);
          this.notificationService.success(`Restaurant is now ${updatedRestaurant.isOpen ? 'open' : 'closed'}.`);
          this.updatingStatus.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.updatingStatus.set(false);
        }
      });
  }
}
