import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmptyStateComponent } from '../../components/shared/empty-state.component';
import { LoaderComponent } from '../../components/shared/loader.component';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { MenuService } from '../../services/menu.service';
import { NotificationService } from '../../services/notification.service';
import { RestaurantService } from '../../services/restaurant.service';
import { MenuItem, Restaurant, RestaurantMenu } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';

@Component({
  selector: 'app-restaurant-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoaderComponent, EmptyStateComponent],
  template: `
    <a routerLink="/customer/restaurants" class="ghost-btn">Back to restaurants</a>

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
          <div class="meta-row"><span>Address</span><strong>{{ restaurant.address }}</strong></div>
          <div class="meta-row"><span>Status</span><strong>{{ restaurant.isOpen ? 'Open' : 'Closed' }}</strong></div>
          <div class="meta-row"><span>Rating</span><strong>{{ restaurant.avgRating || 0 }}</strong></div>
        </div>
      </section>

      <section class="surface-card filters-card dashboard-section">
        <input [(ngModel)]="query" (ngModelChange)="applyFilter()" placeholder="Search menu items" />
      </section>

      <section class="dashboard-section" *ngIf="filteredItems().length; else noItems">
        <div class="cards-grid">
          <article *ngFor="let item of filteredItems()" class="surface-card menu-card">
            <div class="menu-card-top">
              <div>
                <strong>{{ item.name }}</strong>
                <p>{{ item.categoryName || 'Menu item' }}</p>
              </div>
              <span class="badge-chip">{{ item.isVeg ? 'Veg' : 'Non-veg' }}</span>
            </div>
            <p class="description">{{ item.description || 'Prepared fresh for every order.' }}</p>
            <div class="meta-row"><span>Price</span><strong>Rs {{ item.price }}</strong></div>
            <div class="meta-row"><span>Availability</span><strong>{{ item.isAvailable ? 'Available' : 'Unavailable' }}</strong></div>
            <button type="button" class="primary-btn" [disabled]="!item.isAvailable || addingItemId() === item.itemId" (click)="addToCart(item)">
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
    h1 { font-size: clamp(2rem, 3vw, 3rem); margin: 8px 0 10px; }
    .hero-card, .filters-card, .menu-card { padding: 22px; }
    .filters-card input { min-height: 48px; width: 100%; border-radius: 14px; border: 1px solid var(--qb-border); padding: 0 14px; }
    .cards-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
    .menu-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
    .menu-card p { color: var(--qb-text-muted); }
    .description { margin: 14px 0; line-height: 1.6; }
    @media (max-width: 860px) { .cards-grid { grid-template-columns: 1fr; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RestaurantDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly restaurantService = inject(RestaurantService);
  private readonly menuService = inject(MenuService);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly restaurant = signal<Restaurant | null>(null);
  readonly menu = signal<RestaurantMenu | null>(null);
  readonly filteredItems = signal<MenuItem[]>([]);
  readonly addingItemId = signal<number | null>(null);

  query = '';

  constructor() {
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
    const customerId = this.authService.getCurrentUser()?.id;
    const restaurantId = this.restaurant()?.restaurantId;
    if (!customerId || !restaurantId) {
      return;
    }

    this.addingItemId.set(item.itemId);
    this.cartService.addToCart({
      customerId,
      restaurantId,
      menuItemId: item.itemId,
      name: item.name,
      price: item.price,
      quantity: 1
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(`${item.name} added to cart.`);
          this.addingItemId.set(null);
        },
        error: (error) => {
          this.notificationService.error(getErrorMessage(error));
          this.addingItemId.set(null);
        }
      });
  }
}
