import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { finalize } from 'rxjs';
import { CurrentUser } from '../../models/auth.models';
import { ApiState, DeliverySummary, ProfileSummary } from '../../models/dashboard.models';
import { DashboardApiService } from '../../services/dashboard-api.service';

@Component({
  selector: 'app-delivery-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <section class="hero-grid">
      <article class="panel hero-card delivery-hero">
        <p class="eyebrow">Delivery partner</p>
        <h1>Own your route, earnings, and availability</h1>
        <p class="muted">{{ profile.data?.fullName || currentUser.email || 'Ready when you are.' }}</p>
        <div class="quick-actions">
          <button type="button" class="primary-btn" (click)="toggleOnline()" [disabled]="availabilitySaving || !currentUser.id">
            {{ availabilitySaving ? 'Updating...' : online ? 'Go offline' : 'Go online' }}
          </button>
          <span class="status-pill" [class.online]="online">{{ online ? 'Online' : 'Offline' }}</span>
        </div>
      </article>
      <article class="panel metric-card"><span>Accepted</span><strong>{{ accepted.data.length }}</strong><small>Active deliveries</small></article>
      <article class="panel metric-card"><span>Earnings</span><strong>{{ earnings | currency:'INR':'symbol':'1.0-0' }}</strong><small>Completed delivery value</small></article>
    </section>

    <section class="content-grid">
      <article class="panel wide">
        <div class="section-head compact">
          <div><p class="eyebrow">Marketplace</p><h2>Available deliveries</h2></div>
          <button type="button" class="small-btn" (click)="loadAvailable()" [disabled]="available.loading">Refresh</button>
        </div>
        <p class="error" *ngIf="available.error">{{ available.error }}</p>
        <div class="skeleton-list" *ngIf="available.loading"><span></span><span></span><span></span></div>
        <div class="empty" *ngIf="!available.loading && available.data.length === 0">No delivery requests available.</div>
        <div class="card-list" *ngIf="available.data.length">
          <div class="mini-card" *ngFor="let delivery of available.data">
            <strong>{{ delivery.pickup }}</strong>
            <span>To {{ delivery.dropoff }}</span>
            <small>{{ delivery.payout | currency:'INR':'symbol':'1.0-0' }} • {{ delivery.distanceKm || 0 }} km</small>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="section-head compact"><div><p class="eyebrow">Accepted</p><h2>Current deliveries</h2></div></div>
        <p class="error" *ngIf="accepted.error">{{ accepted.error }}</p>
        <div class="empty" *ngIf="!accepted.loading && accepted.data.length === 0">Accepted deliveries will appear here.</div>
        <div class="timeline" *ngIf="accepted.data.length">
          <div *ngFor="let delivery of accepted.data"><strong>{{ delivery.pickup }}</strong><span>{{ delivery.status }} • {{ delivery.dropoff }}</span></div>
        </div>
      </article>

      <article class="panel">
        <div class="section-head compact"><div><p class="eyebrow">History</p><h2>Delivery history</h2></div></div>
        <p class="error" *ngIf="history.error">{{ history.error }}</p>
        <div class="empty" *ngIf="!history.loading && history.data.length === 0">Completed deliveries will be listed here.</div>
        <div class="timeline" *ngIf="history.data.length">
          <div *ngFor="let delivery of history.data"><strong>{{ delivery.dropoff }}</strong><span>{{ delivery.payout | currency:'INR':'symbol':'1.0-0' }} • {{ delivery.status }}</span></div>
        </div>
      </article>
    </section>
  `
})
export class DeliveryDashboardComponent implements OnInit {
  @Input({ required: true }) currentUser!: CurrentUser;

  private readonly api = inject(DashboardApiService);

  online = false;
  availabilitySaving = false;
  profile: ApiState<ProfileSummary | null> = { data: null, loading: false, error: '' };
  available: ApiState<DeliverySummary[]> = { data: [], loading: false, error: '' };
  accepted: ApiState<DeliverySummary[]> = { data: [], loading: false, error: '' };
  history: ApiState<DeliverySummary[]> = { data: [], loading: false, error: '' };

  get earnings(): number {
    return this.history.data.reduce((sum, delivery) => sum + (delivery.payout || 0), 0);
  }

  ngOnInit(): void {
    this.loadProfile();
    this.loadAvailable();
    this.loadAccepted();
    this.loadHistory();
  }

  toggleOnline(): void {
    if (!this.currentUser.id || this.availabilitySaving) return;
    this.availabilitySaving = true;
    const nextStatus = !this.online;
    this.api.updateDeliveryAvailability(this.currentUser.id, nextStatus)
      .pipe(finalize(() => this.availabilitySaving = false))
      .subscribe({
        next: (response) => this.online = response.online,
        error: () => this.online = !nextStatus
      });
  }

  loadAvailable(): void {
    if (this.available.loading) return;
    this.available = { data: [], loading: true, error: '' };
    this.api.getAvailableDeliveries()
      .pipe(finalize(() => this.available = { ...this.available, loading: false }))
      .subscribe({
        next: (deliveries) => this.available = { data: deliveries, loading: false, error: '' },
        error: (error) => this.available = { data: [], loading: false, error: this.message(error, 'Delivery marketplace is not available yet.') }
      });
  }

  private loadProfile(): void {
    if (!this.currentUser.id) return;
    this.profile = { data: null, loading: true, error: '' };
    this.api.getDeliveryPartnerProfile(this.currentUser.id)
      .pipe(finalize(() => this.profile = { ...this.profile, loading: false }))
      .subscribe({
        next: (profile) => this.profile = { data: profile, loading: false, error: '' },
        error: (error) => this.profile = { data: null, loading: false, error: this.message(error, 'Profile is unavailable.') }
      });
  }

  private loadAccepted(): void {
    if (!this.currentUser.id) return;
    this.accepted = { data: [], loading: true, error: '' };
    this.api.getAcceptedDeliveries(this.currentUser.id)
      .pipe(finalize(() => this.accepted = { ...this.accepted, loading: false }))
      .subscribe({
        next: (deliveries) => this.accepted = { data: deliveries, loading: false, error: '' },
        error: (error) => this.accepted = { data: [], loading: false, error: this.message(error, 'Accepted deliveries are not available yet.') }
      });
  }

  private loadHistory(): void {
    if (!this.currentUser.id) return;
    this.history = { data: [], loading: true, error: '' };
    this.api.getDeliveryHistory(this.currentUser.id)
      .pipe(finalize(() => this.history = { ...this.history, loading: false }))
      .subscribe({
        next: (deliveries) => this.history = { data: deliveries, loading: false, error: '' },
        error: (error) => this.history = { data: [], loading: false, error: this.message(error, 'Delivery history is not available yet.') }
      });
  }

  private message(error: any, fallback: string): string {
    return error?.error?.message || error?.error?.error || error?.message || fallback;
  }
}
