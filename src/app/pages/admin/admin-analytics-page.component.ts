import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { LoaderComponent } from '../../components/shared/loader.component';
import { DashboardStats, Order, Payment } from '../../models/app.models';
import { AdminService } from '../../services/admin.service';
import { getErrorMessage } from '../../services/api.utils';

interface BreakdownItem {
  label: string;
  value: number;
}

@Component({
  selector: 'app-admin-analytics-page',
  standalone: true,
  imports: [CommonModule, LoaderComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Admin analytics</span>
        <h1>Operational trends across orders, revenue, and payment flow.</h1>
        <p class="dashboard-subtitle">This page derives simple analytics from the same live admin APIs used elsewhere in the dashboard.</p>
      </div>
      <button type="button" class="secondary-btn" (click)="load()">Refresh</button>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <ng-container *ngIf="!loading() && !error()">
      <section class="stats-grid dashboard-section" *ngIf="stats() as stats">
        <article class="surface-card stat-card"><div class="value">{{ stats.totalOrders || 0 }}</div><p class="helper">Total orders</p></article>
        <article class="surface-card stat-card"><div class="value">Rs {{ (stats.totalRevenue || 0).toFixed(2) }}</div><p class="helper">Collected revenue</p></article>
        <article class="surface-card stat-card"><div class="value">{{ stats.pendingOrders || 0 }}</div><p class="helper">Orders in progress</p></article>
        <article class="surface-card stat-card"><div class="value">{{ stats.completedOrders || 0 }}</div><p class="helper">Delivered orders</p></article>
      </section>

      <section class="split-layout dashboard-section">
        <article class="surface-card panel-card">
          <div class="panel-header">
            <strong>Order status breakdown</strong>
            <span>{{ orders().length }} orders</span>
          </div>
          <div class="stack-list">
            <div *ngFor="let item of orderBreakdown()" class="meta-row">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </article>

        <article class="surface-card panel-card">
          <div class="panel-header">
            <strong>Payment mode breakdown</strong>
            <span>{{ payments().length }} payments</span>
          </div>
          <div class="stack-list">
            <div *ngFor="let item of paymentModeBreakdown()" class="meta-row">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </article>
      </section>
    </ng-container>
  `,
  styles: [`
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    .panel-card { padding: 22px; }
    .panel-header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 18px; color: var(--qb-text-muted); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminAnalyticsPageComponent {
  private readonly adminService = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly stats = signal<DashboardStats | null>(null);
  readonly orders = signal<Order[]>([]);
  readonly payments = signal<Payment[]>([]);
  readonly orderBreakdown = signal<BreakdownItem[]>([]);
  readonly paymentModeBreakdown = signal<BreakdownItem[]>([]);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      stats: this.adminService.getDashboardStats(),
      orders: this.adminService.getAllOrders(),
      payments: this.adminService.getAllPayments()
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ stats, orders, payments }) => {
          this.stats.set(stats);
          this.orders.set(orders);
          this.payments.set(payments);
          this.orderBreakdown.set(this.buildBreakdown(orders.map((order) => order.orderStatus)));
          this.paymentModeBreakdown.set(this.buildBreakdown(payments.map((payment) => payment.mode)));
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  private buildBreakdown(values: string[]): BreakdownItem[] {
    const counts = new Map<string, number>();
    values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value);
  }
}
