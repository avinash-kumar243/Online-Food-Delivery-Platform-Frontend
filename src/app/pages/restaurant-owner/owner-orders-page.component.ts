import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { OrderService } from '../../services/order.service';
import { RestaurantService } from '../../services/restaurant.service';
import { Order, OrderStatus } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';
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
        <div>
          <strong>Order #{{ order.orderId }}</strong>
          <p>{{ order.items.length }} items • {{ order.deliveryAddress }}</p>
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
  styles: [`.order-card{padding:20px;display:flex;justify-content:space-between;gap:16px;align-items:center}.actions{display:flex;gap:10px;flex-wrap:wrap}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OwnerOrdersPageComponent {
  private readonly authService = inject(AuthService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly orderService = inject(OrderService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly orders = signal<Order[]>([]);

  constructor() {
    const ownerId = this.authService.getCurrentUser()?.id;
    if (!ownerId) return;
    this.restaurantService.getMyRestaurant(ownerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurant) => {
          if (!restaurant) return;
          this.orderService.getRestaurantOrders(restaurant.restaurantId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ next: (orders) => this.orders.set(orders) });
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
}
