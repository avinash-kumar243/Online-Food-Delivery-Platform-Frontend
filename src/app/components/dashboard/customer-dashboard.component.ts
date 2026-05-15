import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CurrentUser } from '../../models/auth.models';
import { ApiState, OrderSummary, ProfileSummary, Restaurant } from '../../models/dashboard.models';
import { DashboardApiService } from '../../services/dashboard-api.service';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe],
  template: `
    <section class="hero-grid">
      <article class="panel hero-card">
        <p class="eyebrow">Customer dashboard</p>
        <h1>Welcome back{{ profile.data.fullName ? ', ' + profile.data.fullName : '' }}</h1>
        <p class="muted">{{ profile.data.email || currentUser.email || 'Explore restaurants and track your food in one place.' }}</p>
        <div class="quick-actions">
          <button type="button" class="primary-btn" (click)="browseRestaurants()" [disabled]="restaurants.loading">Browse restaurants</button>
          <button type="button" class="ghost-btn">Open cart</button>
        </div>
      </article>

      <article class="panel metric-card">
        <span>Active orders</span>
        <strong>{{ activeOrders.length }}</strong>
        <small>Live kitchen and delivery updates</small>
      </article>
      <article class="panel metric-card">
        <span>Saved addresses</span>
        <strong>0</strong>
        <small>Add addresses during checkout</small>
      </article>
    </section>

    <section class="content-grid">
      <article class="panel wide">
        <div class="section-head">
          <div>
            <p class="eyebrow">Browse</p>
            <h2>Restaurants near you</h2>
          </div>
          <form class="search-row" (ngSubmit)="browseRestaurants()">
            <input name="query" [(ngModel)]="restaurantQuery" placeholder="Search by restaurant name">
            <button type="submit" class="small-btn" [disabled]="restaurants.loading">{{ restaurants.loading ? 'Searching...' : 'Search' }}</button>
          </form>
        </div>
        <p class="error" *ngIf="restaurants.error">{{ restaurants.error }}</p>
        <div class="skeleton-list" *ngIf="restaurants.loading"><span></span><span></span><span></span></div>
        <div class="empty" *ngIf="!restaurants.loading && !restaurants.error && restaurants.data.length === 0">No restaurants found yet. Try searching after restaurants are registered.</div>
        <div class="card-list" *ngIf="!restaurants.loading && restaurants.data.length">
          <div class="mini-card" *ngFor="let restaurant of restaurants.data">
            <strong>{{ restaurant.name }}</strong>
            <span>{{ restaurant.cuisine }} • {{ restaurant.city }}</span>
            <small>{{ restaurant.isOpen ? 'Open now' : 'Closed' }} • {{ restaurant.avgRating || 'New' }} rating</small>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="section-head compact">
          <div>
            <p class="eyebrow">Orders</p>
            <h2>Active orders</h2>
          </div>
        </div>
        <p class="error" *ngIf="orders.error">{{ orders.error }}</p>
        <div class="skeleton-list" *ngIf="orders.loading"><span></span><span></span></div>
        <div class="empty" *ngIf="!orders.loading && activeOrders.length === 0">No active orders right now.</div>
        <div class="timeline" *ngIf="activeOrders.length">
          <div *ngFor="let order of activeOrders"><strong>{{ order.title }}</strong><span>{{ order.status }}</span></div>
        </div>
      </article>

      <article class="panel">
        <div class="section-head compact">
          <div>
            <p class="eyebrow">Recent</p>
            <h2>Recent orders</h2>
          </div>
        </div>
        <div class="empty" *ngIf="!orders.loading && recentOrders.length === 0">Your recent orders will appear here.</div>
        <div class="timeline" *ngIf="recentOrders.length">
          <div *ngFor="let order of recentOrders">
            <strong>{{ order.title }}</strong>
            <span>{{ order.amount | currency:'INR':'symbol':'1.0-0' }} • {{ order.status }}</span>
          </div>
        </div>
      </article>
    </section>
  `
})
export class CustomerDashboardComponent implements OnInit {
  @Input({ required: true }) currentUser!: CurrentUser;

  private readonly api = inject(DashboardApiService);

  restaurantQuery = '';
  profile: ApiState<ProfileSummary> = { data: this.emptyProfile(), loading: false, error: '' };
  restaurants: ApiState<Restaurant[]> = { data: [], loading: false, error: '' };
  orders: ApiState<OrderSummary[]> = { data: [], loading: false, error: '' };

  get activeOrders(): OrderSummary[] {
    return this.orders.data.filter((order) => !['DELIVERED', 'CANCELLED'].includes(order.status.toUpperCase()));
  }

  get recentOrders(): OrderSummary[] {
    return this.orders.data.filter((order) => ['DELIVERED', 'CANCELLED'].includes(order.status.toUpperCase()));
  }

  ngOnInit(): void {
    this.loadProfile();
    this.browseRestaurants();
    this.loadOrders();
  }

  browseRestaurants(): void {
    if (this.restaurants.loading) return;
    this.restaurants = { ...this.restaurants, loading: true, error: '' };
    this.api.browseRestaurants(this.restaurantQuery)
      .pipe(finalize(() => this.restaurants = { ...this.restaurants, loading: false }))
      .subscribe({
        next: (restaurants) => this.restaurants = { data: restaurants, loading: false, error: '' },
        error: (error) => this.restaurants = { data: [], loading: false, error: this.message(error, 'Unable to load restaurants.') }
      });
  }

  private loadProfile(): void {
    if (!this.currentUser.id) {
      this.profile = { data: this.emptyProfile(), loading: false, error: '' };
      return;
    }

    this.profile = { ...this.profile, loading: true, error: '' };
    this.api.getCustomerProfile(this.currentUser.id)
      .pipe(finalize(() => this.profile = { ...this.profile, loading: false }))
      .subscribe({
        next: (profile) => this.profile = { data: profile, loading: false, error: '' },
        error: (error) => this.profile = { data: this.emptyProfile(), loading: false, error: this.message(error, 'Profile is unavailable.') }
      });
  }

  private loadOrders(): void {
    if (!this.currentUser.id) return;
    this.orders = { ...this.orders, loading: true, error: '' };
    this.api.getCustomerOrders(this.currentUser.id)
      .pipe(finalize(() => this.orders = { ...this.orders, loading: false }))
      .subscribe({
        next: (orders) => this.orders = { data: orders, loading: false, error: '' },
        error: (error) => this.orders = { data: [], loading: false, error: this.message(error, 'Orders service is not available yet.') }
      });
  }

  private emptyProfile(): ProfileSummary {
    return { id: this.currentUser?.id ?? null, fullName: '', email: this.currentUser?.email ?? '', phone: '' };
  }

  private message(error: any, fallback: string): string {
    return error?.error?.message || error?.error?.error || error?.message || fallback;
  }
}
