import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmptyStateComponent } from '../../components/shared/empty-state.component';
import { LoaderComponent } from '../../components/shared/loader.component';
import { SuspensionBannerComponent } from '../../components/shared/suspension-banner.component';
import { AccountStatusService } from '../../services/account-status.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { CustomerAccessService } from '../../services/customer-access.service';
import { MenuService } from '../../services/menu.service';
import { NotificationService } from '../../services/notification.service';
import { ProfileService } from '../../services/profile.service';
import { RestaurantService } from '../../services/restaurant.service';
import { MenuItem, Restaurant, RestaurantMenu } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';

@Component({
  selector: 'app-restaurant-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoaderComponent, EmptyStateComponent, SuspensionBannerComponent],
  template: `
    <a routerLink="/customer/restaurants" class="ghost-btn back-btn">Back to restaurants</a>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <ng-container *ngIf="!loading() && !error() && restaurant() as restaurant">
      <section class="surface-card hero-card">
        <div>
          <span class="dashboard-kicker">{{ restaurant.cuisine }}</span>
          <h1>{{ restaurant.name }}</h1>
          <p class="dashboard-subtitle">{{ restaurant.description || 'Fresh meals, fast delivery, and live availability.' }}</p>
        </div>
        <div class="meta-list">
          <section *ngIf="!restaurant.isOpen" class="status-banner" aria-label="Restaurant closed notice">
            <div class="status-banner-dot"></div>
            <div>
              <strong>Restaurant closed</strong>
              <p>Menu browsing is available, but ordering will resume once the restaurant reopens.</p>
            </div>
          </section>
          <div class="meta-row"><span>Address</span><strong>{{ restaurant.address }}</strong></div>
          <div class="meta-row"><span>Status</span><strong>{{ restaurant.isOpen ? 'Open' : 'Closed' }}</strong></div>
          <div class="meta-row"><span>Rating</span><strong>{{ restaurant.avgRating || 0 }}</strong></div>
        </div>
      </section>

      <section class="surface-card filters-card dashboard-section">
        <app-suspension-banner
          *ngIf="customerSuspended()"
          class="dashboard-section"
          [message]="accountStatusService.getSuspensionBannerMessage()">
        </app-suspension-banner>
        <input [(ngModel)]="query" (ngModelChange)="applyFilter()" placeholder="Search menu items" />
      </section>

      <section class="dashboard-section" *ngIf="filteredItems().length; else noItems">
        <div class="cards-grid">
          <article *ngFor="let item of filteredItems()" class="surface-card menu-card">
            <ng-container *ngIf="getItemImageUrl(item) as imageUrl; else imageFallback">
              <img
                *ngIf="imageUrl"
                class="menu-card-image"
                [src]="imageUrl"
                [alt]="item.name"
                loading="lazy"
                referrerpolicy="no-referrer"
                (error)="markImageBroken(item.itemId)" />
            </ng-container>
            <ng-template #imageFallback>
              <div class="menu-card-image menu-card-image-fallback" aria-hidden="true">
                <span>{{ item.isVeg ? 'Veg' : 'Food' }}</span>
              </div>
            </ng-template>
            <div class="menu-card-top">
              <div>
                <strong>{{ item.name }}</strong>
                <p>{{ item.categoryName || 'Menu item' }}</p>
              </div>
              <span class="badge-chip">{{ item.isVeg ? 'Veg' : 'Non-veg' }}</span>
            </div>
            <p class="description">{{ item.description || 'Prepared fresh for every order.' }}</p>
            <div class="meta-row price-row">
              <span>Price</span>
              <strong class="price-stack">
                <span class="current-price">Rs {{ getDisplayPrice(item) }}</span>
                <span *ngIf="hasDiscount(item)" class="original-price">Rs {{ item.price }}</span>
              </strong>
            </div>
            <div class="meta-row"><span>Availability</span><strong>{{ item.isAvailable ? 'Available' : 'Unavailable' }}</strong></div>
            <button
              type="button"
              class="primary-btn"
              [class.closed-btn]="!restaurant.isOpen"
              [disabled]="customerSuspended() || !restaurant.isOpen || !item.isAvailable || addingItemId() === item.itemId"
              (click)="addToCart(item)">
              {{ addingItemId() === item.itemId ? 'Adding...' : 'Add to cart' }}
            </button>
          </article>
        </div>
      </section>

      <ng-template #noItems>
        <app-empty-state title="No menu items found" description="Try a different search or come back when this restaurant updates its menu."></app-empty-state>
      </ng-template>
    </ng-container>
  `,
  styles: [`
    .back-btn {
      width: fit-content;
      margin-bottom: 18px;
    }
    h1 {
      font-size: clamp(2rem, 3vw, 3rem);
      margin: 8px 0 10px;
    }
    .hero-card,
    .filters-card,
    .menu-card {
      padding: 22px;
    }
    .meta-list {
      display: grid;
      gap: 14px;
      align-content: start;
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }
    .menu-card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
    }
    .menu-card-image {
      width: 100%;
      height: 220px;
      object-fit: cover;
      border-radius: 18px;
      display: block;
      margin-bottom: 18px;
      background: linear-gradient(135deg, rgba(20, 138, 104, 0.12), rgba(255, 255, 255, 0.9));
    }
    .menu-card-image-fallback {
      display: grid;
      place-items: center;
      color: var(--qb-text-muted);
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .menu-card p {
      color: var(--qb-text-muted);
    }
    .price-row {
      align-items: flex-start;
    }
    .price-stack {
      display: grid;
      justify-items: end;
      gap: 2px;
    }
    .current-price {
      color: var(--qb-text);
      font-size: 1.05rem;
    }
    .original-price {
      color: var(--qb-text-muted);
      font-size: 0.92rem;
      font-weight: 600;
      text-decoration: line-through;
      text-decoration-thickness: 2px;
      opacity: 0.9;
    }
    .status-banner {
      display: grid;
      grid-template-columns: 12px 1fr;
      gap: 12px;
      align-items: start;
      padding: 16px 18px;
      border: 1px solid rgba(180, 83, 9, 0.18);
      border-radius: 18px;
      color: #9a3412;
      background: linear-gradient(135deg, rgba(255, 247, 237, 0.98), rgba(255, 237, 213, 0.9));
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
    }
    .status-banner-dot {
      width: 12px;
      height: 12px;
      margin-top: 5px;
      border-radius: 999px;
      background: #f97316;
      box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.14);
    }
    .status-banner strong {
      display: block;
      margin-bottom: 4px;
      font-size: 1rem;
      color: #9a3412;
    }
    .status-banner p {
      margin: 0;
      color: #b45309;
      line-height: 1.5;
    }
    .closed-btn {
      opacity: 0.72;
    }
    .description {
      margin: 14px 0;
      line-height: 1.6;
      min-height: 52px;
    }
    @media (max-width: 860px) {
      .cards-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RestaurantDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly restaurantService = inject(RestaurantService);
  private readonly menuService = inject(MenuService);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly customerAccessService = inject(CustomerAccessService);
  private readonly profileService = inject(ProfileService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly accountStatusService = inject(AccountStatusService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly restaurant = signal<Restaurant | null>(null);
  readonly menu = signal<RestaurantMenu | null>(null);
  readonly filteredItems = signal<MenuItem[]>([]);
  readonly addingItemId = signal<number | null>(null);
  readonly brokenImages = signal<Record<number, boolean>>({});
  readonly customerSuspended = signal(false);

  query = '';

  constructor() {
    const customerId = this.authService.getCurrentUser()?.id;
    if (this.authService.getUserRole() === 'CUSTOMER' && customerId) {
      this.profileService.getCustomerProfile(customerId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (profile) => this.customerSuspended.set(this.accountStatusService.isSuspended(profile)),
          error: () => undefined
        });
    }

    const restaurantId = Number(this.route.snapshot.paramMap.get('restaurantId'));
    this.restaurantService.getRestaurantById(restaurantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurant) => this.restaurant.set(restaurant),
        error: (error) => this.error.set(getErrorMessage(error))
      });

    this.menuService.getMenuByRestaurant(restaurantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (menu) => {
          this.menu.set(menu);
          this.filteredItems.set(menu.categories.flatMap((category) => category.items.map((item) => ({ ...item, categoryName: category.name }))));
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  applyFilter(): void {
    const items = this.menu()?.categories.flatMap((category) => category.items.map((item) => ({ ...item, categoryName: category.name }))) ?? [];
    const query = this.query.trim().toLowerCase();
    this.filteredItems.set(items.filter((item) => !query || [item.name, item.description || '', item.categoryName || ''].some((value) => value.toLowerCase().includes(query))));
  }

  addToCart(item: MenuItem): void {
    if (this.customerSuspended()) {
      this.accountStatusService.notifySuspended();
      return;
    }
    const currentRole = this.authService.getUserRole();
    const customerId = this.authService.getCurrentUser()?.id;
    const restaurantId = this.restaurant()?.restaurantId;
    const isOpen = this.restaurant()?.isOpen;
    if (currentRole !== 'CUSTOMER' || !customerId || !restaurantId) {
      this.customerAccessService.requestAuth(this.router.url, 'Please login or sign up to continue.');
      return;
    }
    if (!isOpen) {
      this.notificationService.error('This restaurant is currently closed. Ordering is disabled until it reopens.');
      return;
    }

    this.addingItemId.set(item.itemId);
    this.cartService.addToCartWithRestaurantSwitch({
      customerId,
      restaurantId,
      menuItemId: item.itemId,
      name: item.name,
      price: this.getDisplayPrice(item),
      quantity: 1
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ switchedRestaurant }) => {
          this.notificationService.success(
            switchedRestaurant
              ? 'Previous cart cleared. Added item from the new restaurant.'
              : `${item.name} added to cart.`
          );
          this.addingItemId.set(null);
        },
        error: (error) => {
          this.notificationService.error(getErrorMessage(error));
          this.addingItemId.set(null);
        }
      });
  }

  getItemImageUrl(item: MenuItem): string {
    if (this.brokenImages()[item.itemId]) {
      return '';
    }

    return item.imageUrl?.trim() || '';
  }

  markImageBroken(itemId: number): void {
    this.brokenImages.update((state) => ({ ...state, [itemId]: true }));
  }

  hasDiscount(item: MenuItem): boolean {
    return item.discountedPrice != null && item.discountedPrice > 0 && item.discountedPrice < item.price;
  }

  getDisplayPrice(item: MenuItem): number {
    return this.hasDiscount(item) ? item.discountedPrice! : item.price;
  }
}
