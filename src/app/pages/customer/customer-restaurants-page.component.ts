import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmptyStateComponent } from '../../components/shared/empty-state.component';
import { LoaderComponent } from '../../components/shared/loader.component';
import { Restaurant } from '../../models/app.models';
import { getCustomerRestaurantImage } from '../../shared/restaurant-visuals';
import { getErrorMessage } from '../../services/api.utils';
import { RestaurantService } from '../../services/restaurant.service';

@Component({
  selector: 'app-customer-restaurants-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, EmptyStateComponent, LoaderComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Restaurants</span>
        <h1>Find your next meal fast.</h1>
        <p class="dashboard-subtitle">Browse approved places with cleaner visuals, quick filters, and the same restaurant identity you saw on the dashboard.</p>
      </div>
    </section>

    <section class="surface-card filters-card">
      <input [(ngModel)]="searchTerm" (ngModelChange)="applyFilters()" placeholder="Search by restaurant, cuisine, or city" />
      <input [(ngModel)]="cuisineFilter" (ngModelChange)="applyFilters()" placeholder="Filter cuisine" />
      <select [(ngModel)]="availabilityFilter" (ngModelChange)="applyFilters()">
        <option value="">All availability</option>
        <option value="open">Open now</option>
        <option value="closed">Closed</option>
      </select>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <div class="cards-grid dashboard-section" *ngIf="!loading() && !error() && filteredRestaurants().length; else noRestaurants">
      <a *ngFor="let restaurant of filteredRestaurants()" class="surface-card restaurant-card" [routerLink]="['/customer/restaurants', restaurant.restaurantId]">
        <ng-container *ngIf="getRestaurantImage(restaurant) as restaurantImage; else restaurantFallback">
          <div class="restaurant-image-wrap">
            <img class="restaurant-image" [src]="restaurantImage" [alt]="restaurant.name" loading="lazy" />
            <div class="restaurant-image-overlay">
              <span class="image-badge">{{ restaurant.cuisine }}</span>
            </div>
          </div>
        </ng-container>
        <ng-template #restaurantFallback>
          <div class="restaurant-hero">{{ restaurant.name.slice(0, 1) }}</div>
        </ng-template>
        <div class="restaurant-content">
          <div class="restaurant-row">
            <strong>{{ restaurant.name }}</strong>
            <span class="status-chip" [class.status-green]="restaurant.isOpen" [class.status-slate]="!restaurant.isOpen">{{ restaurant.isOpen ? 'Open' : 'Closed' }}</span>
          </div>
          <p>{{ restaurant.cuisine }} | {{ restaurant.city }}</p>
          <p>{{ restaurant.address }}</p>
          <div class="meta-row"><span>Rating</span><strong>{{ restaurant.avgRating || 0 }}</strong></div>
          <div class="meta-row"><span>Min order</span><strong>Rs {{ restaurant.minOrderAmount }}</strong></div>
        </div>
      </a>
    </div>

    <ng-template #noRestaurants>
      <app-empty-state
        *ngIf="!loading() && !error()"
        title="No restaurants match the current filters"
        description="Try broadening the search or removing a filter.">
      </app-empty-state>
    </ng-template>
  `,
  styles: [`
    .filters-card {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 14px;
      padding: 18px;
      background:
        radial-gradient(circle at top right, rgba(245, 158, 11, 0.12), transparent 18rem),
        linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(245, 248, 252, 0.98));
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 20px;
    }
    .restaurant-card {
      overflow: hidden;
      padding: 0;
      border-radius: 24px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(247, 250, 252, 0.98));
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .restaurant-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12);
    }
    .restaurant-image-wrap {
      position: relative;
      height: 220px;
      overflow: hidden;
      background: #e2e8f0;
    }
    .restaurant-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .restaurant-image-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;
      padding: 16px;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.14), rgba(15, 23, 42, 0.02) 32%, rgba(15, 23, 42, 0.36));
    }
    .image-badge {
      display: inline-flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.86);
      color: #10213e;
      font-size: 0.82rem;
      font-weight: 700;
    }
    .restaurant-hero {
      width: 58px;
      height: 58px;
      border-radius: 18px;
      display: grid;
      place-items: center;
      margin-bottom: 16px;
      color: var(--qb-primary);
      font-size: 1.45rem;
      font-weight: 700;
      background: linear-gradient(135deg, rgba(15, 122, 95, 0.12), rgba(15, 122, 95, 0.04));
    }
    .restaurant-content {
      padding: 18px 20px 20px;
    }
    .restaurant-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
    }
    .restaurant-row strong {
      font-size: 1.2rem;
      line-height: 1.2;
    }
    .restaurant-card p {
      margin-top: 8px;
      color: var(--qb-text-muted);
      line-height: 1.5;
    }
    @media (min-width: 721px) and (max-width: 1100px) {
      .cards-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 960px) {
      .filters-card,
      .cards-grid {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 640px) {
      .restaurant-row {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerRestaurantsPageComponent {
  private readonly restaurantService = inject(RestaurantService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly restaurants = signal<Restaurant[]>([]);
  readonly filteredRestaurants = signal<Restaurant[]>([]);

  searchTerm = '';
  cuisineFilter = '';
  availabilityFilter = '';

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.searchTerm = params.get('q')?.trim() ?? '';
        this.applyFilters();
      });

    this.restaurantService.getApprovedRestaurants()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurants) => {
          this.restaurants.set(restaurants);
          this.applyFilters(restaurants);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  applyFilters(source = this.restaurants()): void {
    const query = this.searchTerm.trim().toLowerCase();
    const cuisine = this.cuisineFilter.trim().toLowerCase();
    const availability = this.availabilityFilter;

    this.filteredRestaurants.set(
      source.filter((restaurant) => {
        const matchesText = !query || [restaurant.name, restaurant.cuisine, restaurant.city].some((value) => value.toLowerCase().includes(query));
        const matchesCuisine = !cuisine || restaurant.cuisine.toLowerCase().includes(cuisine);
        const matchesAvailability = !availability || (availability === 'open' ? restaurant.isOpen : !restaurant.isOpen);
        return matchesText && matchesCuisine && matchesAvailability;
      })
    );
  }

  getRestaurantImage(restaurant: Restaurant): string | null {
    return getCustomerRestaurantImage(restaurant);
  }
}
