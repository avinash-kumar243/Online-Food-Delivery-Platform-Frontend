import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Order, OrderStatus } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { OrderService } from '../../services/order.service';
import { RealtimeService } from '../../services/realtime.service';
import { RestaurantService } from '../../services/restaurant.service';
import { getAllowedNextStatuses } from '../../shared/order-flow';

@Component({
  selector: 'app-owner-orders-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Restaurant orders</span>
        <h1>Move incoming orders through kitchen status updates.</h1>
      </div>
    </section>

    <section class="stack-list" *ngIf="orders().length; else noOrders">
      <article *ngFor="let order of orders()" class="surface-card order-card">
        <div class="order-copy">
          <strong>Order #{{ order.orderId }}</strong>
          <p>{{ order.items.length }} items | {{ order.deliveryAddress }}</p>
          <div class="assignment-meta" *ngIf="order.deliveryPartner">
            <span>Assigned to {{ order.deliveryPartner.fullName }}</span>
            <span *ngIf="order.deliveryPartner.phone">{{ order.deliveryPartner.phone }}</span>
          </div>
        </div>
        <div class="actions">
          <span class="badge-chip">{{ order.orderStatus }}</span>
          <button *ngFor="let status of nextStatuses(order.orderStatus)" type="button" class="ghost-btn" (click)="update(order.orderId, status)">
            {{ status }}
          </button>
        </div>
      </article>
    </section>

    <ng-template #noOrders><section class="empty-state">No restaurant orders found.</section></ng-template>
  `,
  styles: [`
    .order-card{padding:20px;display:flex;justify-content:space-between;gap:16px;align-items:center}
    .order-copy{display:grid;gap:8px}
    .assignment-meta{display:flex;flex-wrap:wrap;gap:10px;color:var(--qb-text-muted);font-size:0.9rem}
    .actions{display:flex;gap:10px;flex-wrap:wrap}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OwnerOrdersPageComponent {
  private readonly authService = inject(AuthService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly orderService = inject(OrderService);
  private readonly notificationService = inject(NotificationService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly orders = signal<Order[]>([]);
  readonly restaurantId = signal<number | null>(null);

  constructor() {
    const ownerId = this.authService.getCurrentUser()?.id;
    if (!ownerId) return;
    this.restaurantService.getMyRestaurant(ownerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurant) => {
          if (!restaurant) return;
          this.restaurantId.set(restaurant.restaurantId);
          this.loadOrders(restaurant.restaurantId);
        }
      });

    this.realtimeService.orderEvents$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const restaurantId = this.restaurantId();
        if (restaurantId) {
          this.loadOrders(restaurantId);
        }
      });
  }

  nextStatuses(status: OrderStatus): OrderStatus[] {
    return getAllowedNextStatuses('RESTAURANT_OWNER', status);
  }

  update(orderId: number, status: OrderStatus): void {
    this.orderService.updateOrderStatus(orderId, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.orders.update((items) => items.map((current) => current.orderId === orderId ? order : current));
          this.notificationService.success(`Order #${orderId} updated to ${status}.`);
        },
        error: (error) => this.notificationService.error(getErrorMessage(error))
      });
  }

  private loadOrders(restaurantId: number): void {
    this.orderService.getRestaurantOrders(restaurantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (orders) => this.orders.set(orders) });
  }
}
