import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmptyStateComponent } from '../../components/shared/empty-state.component';
import { LoaderComponent } from '../../components/shared/loader.component';
import { SuspensionBannerComponent } from '../../components/shared/suspension-banner.component';
import { MenuItem, Restaurant } from '../../models/app.models';
import { AccountStatusService } from '../../services/account-status.service';
import { getErrorMessage } from '../../services/api.utils';
import { AuthService } from '../../services/auth.service';
import { MenuService } from '../../services/menu.service';
import { NotificationService } from '../../services/notification.service';
import { ProfileService } from '../../services/profile.service';
import { RestaurantService } from '../../services/restaurant.service';

@Component({
  selector: 'app-owner-menu-page',
  standalone: true,
  imports: [CommonModule, RouterLink, EmptyStateComponent, LoaderComponent, SuspensionBannerComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Menu management</span>
        <h1>Keep your catalog accurate and order-ready.</h1>
        <p class="dashboard-subtitle">CRUD actions below use the real menu service endpoints.</p>
      </div>
      <a routerLink="/restaurant-owner/menu/add" class="primary-btn" [class.disabled-link]="ownerSuspended() || !restaurant()?.isApproved">Add menu item</a>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>
    <app-suspension-banner
      *ngIf="ownerSuspended()"
      class="dashboard-section"
      [message]="accountStatusService.getSuspensionBannerMessage()">
    </app-suspension-banner>
    <section *ngIf="restaurant() && !restaurant()?.isApproved" class="empty-state">Your restaurant must be approved before menu management is enabled.</section>

    <section class="stack-list dashboard-section" *ngIf="!loading() && !error() && restaurant()?.isApproved && menuItems().length; else empty">
      <article *ngFor="let item of menuItems()" class="surface-card item-card">
        <div>
          <strong>{{ item.name }}</strong>
          <p>{{ item.categoryName || 'Menu item' }} - Rs {{ item.price }}</p>
        </div>
        <div class="actions">
          <button type="button" class="ghost-btn" [disabled]="ownerSuspended()" (click)="toggle(item)">{{ item.isAvailable ? 'Mark unavailable' : 'Mark available' }}</button>
          <a class="secondary-btn" [routerLink]="['/restaurant-owner/menu/edit', item.itemId]" [class.disabled-link]="ownerSuspended()">Edit</a>
          <button type="button" class="secondary-btn" [disabled]="ownerSuspended()" (click)="remove(item)">Delete</button>
        </div>
      </article>
    </section>

    <ng-template #empty>
      <app-empty-state *ngIf="!loading() && restaurant()?.isApproved" title="No menu items yet" description="Add your first item to begin receiving orders."></app-empty-state>
    </ng-template>
  `,
  styles: [`
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    .item-card { padding: 20px; display: flex; justify-content: space-between; gap: 16px; align-items: center; }
    .item-card p { margin-top: 6px; color: var(--qb-text-muted); }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; }
    .disabled-link { pointer-events: none; opacity: 0.6; }
    @media (max-width: 820px) {
      .item-card {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OwnerMenuPageComponent {
  private readonly authService = inject(AuthService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly menuService = inject(MenuService);
  private readonly profileService = inject(ProfileService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly accountStatusService = inject(AccountStatusService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly restaurant = signal<Restaurant | null>(null);
  readonly menuItems = signal<MenuItem[]>([]);
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

    this.restaurantService.getMyRestaurant(ownerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurant) => {
          this.restaurant.set(restaurant);
          if (!restaurant?.isApproved) {
            this.loading.set(false);
            return;
          }
          this.loadMenu(restaurant.restaurantId);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  private loadMenu(restaurantId: number): void {
    this.menuService.getMyMenuItems(restaurantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.menuItems.set(items);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  toggle(item: MenuItem): void {
    if (this.ownerSuspended()) {
      this.accountStatusService.notifySuspended();
      return;
    }
    this.menuService.toggleAvailability(item.itemId, !item.isAvailable)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.menuItems.update((items) => items.map((current) => current.itemId === item.itemId ? { ...current, isAvailable: !current.isAvailable } : current));
          this.notificationService.success('Menu item availability updated.');
        },
        error: (error) => this.notificationService.error(getErrorMessage(error))
      });
  }

  remove(item: MenuItem): void {
    if (this.ownerSuspended()) {
      this.accountStatusService.notifySuspended();
      return;
    }
    this.menuService.deleteMenuItem(item.itemId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.menuItems.update((items) => items.filter((current) => current.itemId !== item.itemId));
          this.notificationService.success(`${item.name} deleted.`);
        },
        error: (error) => this.notificationService.error(getErrorMessage(error))
      });
  }
}
