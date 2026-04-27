import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { CurrentUser } from '../../models/auth.models';
import { AnalyticsSummary, ApiState, OrderSummary, ProfileSummary, Restaurant } from '../../models/dashboard.models';
import { DashboardApiService } from '../../services/dashboard-api.service';

@Component({
  selector: 'app-resto-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  template: `
    <section class="hero-grid">
      <article class="panel hero-card restaurant-hero">
        <p class="eyebrow">Restaurant owner</p>
        <h1>Command center for your kitchens</h1>
        <p class="muted">Register restaurants, watch incoming demand, and keep operations moving.</p>
        <div class="quick-actions">
          <button type="button" class="primary-btn" (click)="showRegistration = !showRegistration">
            {{ showRegistration ? 'Hide form' : 'Register restaurant' }}
          </button>
          <button type="button" class="ghost-btn">Menu shortcuts</button>
        </div>
      </article>
      <article class="panel metric-card" *ngFor="let item of analytics"><span>{{ item.label }}</span><strong>{{ item.value }}</strong><small>{{ item.detail }}</small></article>
    </section>

    <section class="content-grid">
      <article class="panel wide" *ngIf="showRegistration">
        <div class="section-head compact">
          <div><p class="eyebrow">Onboarding</p><h2>Restaurant registration</h2></div>
        </div>
        <form class="restaurant-form" [formGroup]="restaurantForm" (ngSubmit)="registerRestaurant()">
          <input formControlName="name" placeholder="Restaurant name">
          <input formControlName="cuisine" placeholder="Cuisine">
          <input formControlName="phone" placeholder="Phone">
          <input formControlName="city" placeholder="City">
          <input formControlName="address" placeholder="Address" class="span-2">
          <textarea formControlName="description" placeholder="Short description" class="span-2"></textarea>
          <input type="number" formControlName="minOrderAmount" placeholder="Minimum order amount">
          <input type="number" formControlName="estimatedDeliveryMin" placeholder="Delivery minutes">
          <input type="number" formControlName="deliveryRadius" placeholder="Delivery radius km">
          <button type="submit" class="primary-btn span-2" [disabled]="restaurantForm.invalid || submittingRestaurant">
            {{ submittingRestaurant ? 'Registering...' : 'Register restaurant' }}
          </button>
        </form>
        <p class="error" *ngIf="formError">{{ formError }}</p>
        <p class="success" *ngIf="formSuccess">{{ formSuccess }}</p>
      </article>

      <article class="panel wide">
        <div class="section-head compact">
          <div><p class="eyebrow">Profile</p><h2>Restaurant profile overview</h2></div>
          <button type="button" class="small-btn" (click)="loadRestaurants()" [disabled]="restaurants.loading">Refresh</button>
        </div>
        <p class="error" *ngIf="restaurants.error">{{ restaurants.error }}</p>
        <div class="skeleton-list" *ngIf="restaurants.loading"><span></span><span></span><span></span></div>
        <div class="empty" *ngIf="!restaurants.loading && restaurants.data.length === 0">No restaurant profile yet. Use the registration form to create one.</div>
        <div class="card-list restaurant-list" *ngIf="restaurants.data.length">
          <div class="mini-card" *ngFor="let restaurant of restaurants.data">
            <strong>{{ restaurant.name }}</strong>
            <span>{{ restaurant.cuisine }} • {{ restaurant.city }}</span>
            <small>{{ restaurant.isApproved ? 'Approved' : 'Pending approval' }} • {{ restaurant.isOpen ? 'Open' : 'Closed' }}</small>
            <button type="button" class="small-btn" (click)="toggleOpen(restaurant)" [disabled]="togglingRestaurantId === restaurant.restaurantId">
              {{ togglingRestaurantId === restaurant.restaurantId ? 'Updating...' : 'Toggle open' }}
            </button>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="section-head compact"><div><p class="eyebrow">Orders</p><h2>Incoming orders</h2></div></div>
        <p class="error" *ngIf="orders.error">{{ orders.error }}</p>
        <div class="skeleton-list" *ngIf="orders.loading"><span></span><span></span></div>
        <div class="empty" *ngIf="!orders.loading && orders.data.length === 0">Incoming orders will appear here.</div>
        <div class="timeline" *ngIf="orders.data.length">
          <div *ngFor="let order of orders.data"><strong>{{ order.title }}</strong><span>{{ order.amount | currency:'INR':'symbol':'1.0-0' }} • {{ order.status }}</span></div>
        </div>
      </article>

      <article class="panel">
        <div class="section-head compact"><div><p class="eyebrow">Menu</p><h2>Management shortcuts</h2></div></div>
        <div class="shortcut-stack">
          <button type="button" class="ghost-btn">Add menu item</button>
          <button type="button" class="ghost-btn">Update availability</button>
          <button type="button" class="ghost-btn">Review pricing</button>
        </div>
      </article>
    </section>
  `
})
export class RestoDashboardComponent implements OnInit {
  @Input({ required: true }) currentUser!: CurrentUser;

  private readonly api = inject(DashboardApiService);
  private readonly fb = inject(FormBuilder);

  showRegistration = false;
  submittingRestaurant = false;
  togglingRestaurantId: number | null = null;
  formError = '';
  formSuccess = '';
  profile: ApiState<ProfileSummary | null> = { data: null, loading: false, error: '' };
  restaurants: ApiState<Restaurant[]> = { data: [], loading: false, error: '' };
  orders: ApiState<OrderSummary[]> = { data: [], loading: false, error: '' };

  restaurantForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    cuisine: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    city: ['', Validators.required],
    address: ['', Validators.required],
    description: [''],
    minOrderAmount: [0, [Validators.required, Validators.min(0)]],
    estimatedDeliveryMin: [30, [Validators.required, Validators.min(1)]],
    deliveryRadius: [5, [Validators.required, Validators.min(1)]]
  });

  get analytics(): AnalyticsSummary[] {
    const open = this.restaurants.data.filter((restaurant) => restaurant.isOpen).length;
    return [
      { label: 'Restaurants', value: String(this.restaurants.data.length), detail: 'Registered profiles' },
      { label: 'Open now', value: String(open), detail: 'Ready for orders' },
      { label: 'Incoming', value: String(this.orders.data.length), detail: 'Orders in queue' }
    ];
  }

  ngOnInit(): void {
    this.loadProfile();
    this.loadRestaurants();
  }

  registerRestaurant(): void {
    if (this.restaurantForm.invalid || this.submittingRestaurant) {
      this.restaurantForm.markAllAsTouched();
      return;
    }

    this.formError = '';
    this.formSuccess = '';
    this.submittingRestaurant = true;
    const value = this.restaurantForm.getRawValue();
    const payload: Restaurant = {
      ...value,
      ownerId: this.currentUser.id,
      avgRating: 0,
      isOpen: false,
      isApproved: false,
      latitude: null,
      longitude: null
    };

    this.api.registerRestaurant(payload)
      .pipe(finalize(() => this.submittingRestaurant = false))
      .subscribe({
        next: (restaurant) => {
          this.formSuccess = `${restaurant.name} submitted for approval.`;
          this.restaurantForm.reset({ name: '', cuisine: '', phone: '', city: '', address: '', description: '', minOrderAmount: 0, estimatedDeliveryMin: 30, deliveryRadius: 5 });
          this.loadRestaurants();
        },
        error: (error) => this.formError = this.message(error, 'Restaurant registration failed.')
      });
  }

  loadRestaurants(): void {
    if (!this.currentUser.id) {
      this.restaurants = { data: [], loading: false, error: 'Owner id was not provided by auth. Restaurant registration still works, but owner-specific lookup needs backend id in auth state.' };
      return;
    }

    this.restaurants = { ...this.restaurants, loading: true, error: '' };
    this.api.getRestaurantsByOwner(this.currentUser.id)
      .pipe(finalize(() => this.restaurants = { ...this.restaurants, loading: false }))
      .subscribe({
        next: (restaurants) => {
          this.restaurants = { data: restaurants, loading: false, error: '' };
          this.loadOrders(restaurants[0]?.restaurantId);
        },
        error: (error) => this.restaurants = { data: [], loading: false, error: this.message(error, 'Unable to load restaurant profiles.') }
      });
  }

  toggleOpen(restaurant: Restaurant): void {
    if (!restaurant.restaurantId || this.togglingRestaurantId) return;
    this.togglingRestaurantId = restaurant.restaurantId;
    this.api.toggleRestaurantOpen(restaurant.restaurantId)
      .pipe(finalize(() => this.togglingRestaurantId = null))
      .subscribe({
        next: () => this.loadRestaurants(),
        error: (error) => this.restaurants = { ...this.restaurants, error: this.message(error, 'Unable to update restaurant status.') }
      });
  }

  private loadProfile(): void {
    if (!this.currentUser.id) return;
    this.profile = { data: null, loading: true, error: '' };
    this.api.getRestaurantOwnerProfile(this.currentUser.id)
      .pipe(finalize(() => this.profile = { ...this.profile, loading: false }))
      .subscribe({
        next: (profile) => this.profile = { data: profile, loading: false, error: '' },
        error: (error) => this.profile = { data: null, loading: false, error: this.message(error, 'Owner profile is unavailable.') }
      });
  }

  private loadOrders(restaurantId?: number): void {
    if (!restaurantId) return;
    this.orders = { data: [], loading: true, error: '' };
    this.api.getRestaurantOrders(restaurantId)
      .pipe(finalize(() => this.orders = { ...this.orders, loading: false }))
      .subscribe({
        next: (orders) => this.orders = { data: orders, loading: false, error: '' },
        error: (error) => this.orders = { data: [], loading: false, error: this.message(error, 'Orders service is not available yet.') }
      });
  }

  private message(error: any, fallback: string): string {
    return error?.error?.message || error?.error?.error || error?.message || fallback;
  }
}
