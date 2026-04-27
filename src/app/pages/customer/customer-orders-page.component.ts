import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmptyStateComponent } from '../../components/shared/empty-state.component';
import { LoaderComponent } from '../../components/shared/loader.component';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';

@Component({
  selector: 'app-customer-orders-page',
  standalone: true,
  imports: [CommonModule, RouterLink, EmptyStateComponent, LoaderComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Orders</span>
        <h1>Track your current and past orders.</h1>
        <p class="dashboard-subtitle">Refreshes straight from the order service so lifecycle changes are visible without fake data.</p>
      </div>
      <button type="button" class="secondary-btn" (click)="loadOrders()">Refresh</button>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <section class="stack-list dashboard-section" *ngIf="!loading() && !error() && orders().length; else noOrders">
      <a *ngFor="let order of orders()" class="surface-card order-card" [routerLink]="['/customer/orders', order.orderId]">
        <div>
          <strong>Order #{{ order.orderId }}</strong>
          <p>{{ order.items.length }} items • {{ order.deliveryAddress }}</p>
        </div>
        <div class="order-meta">
          <span class="badge-chip">{{ order.orderStatus }}</span>
          <strong>Rs {{ order.finalAmount.toFixed(2) }}</strong>
        </div>
      </a>
    </section>

    <ng-template #noOrders>
      <app-empty-state *ngIf="!loading() && !error()" title="No orders yet" description="Place an order to start live tracking and order history."></app-empty-state>
    </ng-template>
  `,
  styles: [`
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    .order-card {
      display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 20px;
    }
    .order-card p { margin-top: 6px; color: var(--qb-text-muted); }
    .order-meta { display: grid; gap: 10px; justify-items: end; }
    @media (max-width: 780px) {
      .order-card { flex-direction: column; align-items: stretch; }
      .order-meta { justify-items: start; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerOrdersPageComponent {
  private readonly authService = inject(AuthService);
  private readonly orderService = inject(OrderService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly orders = signal<Order[]>([]);

  constructor() {
    this.loadOrders();
  }

  loadOrders(): void {
    const customerId = this.authService.getCurrentUser()?.id;
    if (!customerId) {
      this.error.set('Unable to resolve your customer session.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.orderService.getCustomerOrders(customerId)
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
}
