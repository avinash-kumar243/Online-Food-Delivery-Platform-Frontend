import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmptyStateComponent } from '../../components/shared/empty-state.component';
import { LoaderComponent } from '../../components/shared/loader.component';
import { Restaurant } from '../../models/app.models';
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
        <p class="dashboard-subtitle">Search approved restaurants by cuisine, city, and availability from the live restaurant service.</p>
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
        <div class="restaurant-hero">{{ restaurant.name.slice(0, 1) }}</div>
        <div class="restaurant-row">
          <strong>{{ restaurant.name }}</strong>
          <span class="status-chip" [class.status-green]="restaurant.isOpen" [class.status-slate]="!restaurant.isOpen">{{ restaurant.isOpen ? 'Open' : 'Closed' }}</span>
        </div>
        <p>{{ restaurant.cuisine }} | {{ restaurant.city }}</p>
        <p>{{ restaurant.address }}</p>
        <div class="meta-row"><span>Rating</span><strong>{{ restaurant.avgRating || 0 }}</strong></div>
        <div class="meta-row"><span>Min order</span><strong>Rs {{ restaurant.minOrderAmount }}</strong></div>
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
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
    }
    .restaurant-card {
      padding: 20px;
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
    .restaurant-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
    }
    .restaurant-card p {
      margin-top: 8px;
      color: var(--qb-text-muted);
      line-height: 1.5;
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
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly restaurants = signal<Restaurant[]>([]);
  readonly filteredRestaurants = signal<Restaurant[]>([]);

  searchTerm = '';
  cuisineFilter = '';
  availabilityFilter = '';

  constructor() {
    this.restaurantService.getApprovedRestaurants()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurants) => {
          this.restaurants.set(restaurants);
          this.filteredRestaurants.set(restaurants);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  applyFilters(): void {
    const query = this.searchTerm.trim().toLowerCase();
    const cuisine = this.cuisineFilter.trim().toLowerCase();
    const availability = this.availabilityFilter;

    this.filteredRestaurants.set(
      this.restaurants().filter((restaurant) => {
        const matchesText = !query || [restaurant.name, restaurant.cuisine, restaurant.city].some((value) => value.toLowerCase().includes(query));
        const matchesCuisine = !cuisine || restaurant.cuisine.toLowerCase().includes(cuisine);
        const matchesAvailability = !availability || (availability === 'open' ? restaurant.isOpen : !restaurant.isOpen);
        return matchesText && matchesCuisine && matchesAvailability;
      })
    );
  }
}
