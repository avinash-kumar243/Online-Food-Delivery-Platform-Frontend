import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoaderComponent } from '../../components/shared/loader.component';
import { Order } from '../../models/app.models';
import { AdminService } from '../../services/admin.service';
import { getErrorMessage } from '../../services/api.utils';
import { RealtimeService } from '../../services/realtime.service';

@Component({
  selector: 'app-admin-orders-page',
  standalone: true,
  imports: [CommonModule, LoaderComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Admin orders</span>
        <h1>Monitor every platform order and lifecycle transition.</h1>
        <p class="dashboard-subtitle">This view is backed by the order service admin API and reflects live backend status only.</p>
      </div>
      <button type="button" class="secondary-btn" (click)="load()">Refresh</button>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <section class="stack-list dashboard-section" *ngIf="!loading() && !error() && orders().length; else empty">
      <article *ngFor="let order of orders()" class="surface-card order-card">
        <div>
          <div class="order-heading">
            <strong>Order #{{ order.orderId }}</strong>
            <span class="status-chip" [ngClass]="statusClass(order.orderStatus)">{{ order.orderStatus }}</span>
          </div>
          <div class="meta-list compact-meta">
            <div class="meta-row"><span>Customer</span><strong>#{{ order.customerId }}</strong></div>
            <div class="meta-row"><span>Restaurant</span><strong>#{{ order.restaurantId }}</strong></div>
            <div class="meta-row"><span>Delivery agent</span><strong>{{ order.deliveryAgentId ? '#' + order.deliveryAgentId : 'Unassigned' }}</strong></div>
            <div class="meta-row"><span>Payment</span><strong>{{ order.modeOfPayment }} / {{ order.paymentStatus || 'PENDING' }}</strong></div>
            <div class="meta-row"><span>Items</span><strong>{{ order.items.length }}</strong></div>
            <div class="meta-row"><span>Ordered at</span><strong>{{ order.orderDate }}</strong></div>
          </div>
        </div>
        <div class="order-side">
          <strong>Rs {{ order.finalAmount.toFixed(2) }}</strong>
          <p>{{ order.deliveryAddress }}</p>
        </div>
      </article>
    </section>

    <ng-template #empty>
      <section class="empty-state" *ngIf="!loading() && !error()">No orders are available yet.</section>
    </ng-template>
  `,
  styles: [`
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    .order-card { padding: 22px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px; }
    .order-heading { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
    .compact-meta { margin-top: 18px; gap: 10px; }
    .order-side { text-align: right; display: grid; gap: 8px; align-content: start; }
    .order-side p { color: var(--qb-text-muted); max-width: 260px; }
    @media (max-width: 860px) {
      .order-card { grid-template-columns: 1fr; }
      .order-heading { flex-direction: column; align-items: stretch; }
      .order-side { text-align: left; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminOrdersPageComponent {
  private readonly adminService = inject(AdminService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly orders = signal<Order[]>([]);

  constructor() {
    this.load();
    this.realtimeService.orderEvents$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.adminService.getAllOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          this.orders.set(orders);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  statusClass(status: string): string {
    if (status === 'DELIVERED') return 'status-green';
    if (status === 'CANCELLED') return 'status-red';
    if (status === 'PLACED' || status === 'CONFIRMED' || status === 'PREPARING' || status === 'READY_FOR_PICKUP' || status === 'PICKED_UP' || status === 'OUT_FOR_DELIVERY') {
      return 'status-amber';
    }
    return 'status-slate';
  }
}
