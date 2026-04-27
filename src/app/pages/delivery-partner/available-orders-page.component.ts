import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';

@Component({
  selector: 'app-available-orders-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="section-header"><div><span class="dashboard-kicker">Available orders</span><h1>Accept ready deliveries as they appear.</h1></div></section>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>
    <section class="stack-list" *ngIf="orders().length; else empty">
      <article *ngFor="let order of orders()" class="surface-card order-card">
        <div><strong>Order #{{ order.orderId }}</strong><p>{{ order.deliveryAddress }} • {{ order.orderStatus }}</p></div>
        <button type="button" class="primary-btn" (click)="accept(order)">Accept order</button>
      </article>
    </section>
    <ng-template #empty><section class="empty-state">No available ready-for-pickup orders right now.</section></ng-template>
  `,
  styles: [`.order-card{padding:20px;display:flex;justify-content:space-between;gap:16px;align-items:center}.order-card p{margin-top:6px;color:var(--qb-text-muted)}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvailableOrdersPageComponent {
  private readonly authService = inject(AuthService);
  private readonly orderService = inject(OrderService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  readonly orders = signal<Order[]>([]);
  readonly error = signal('');

  constructor() {
    this.load();
  }

  load(): void {
    this.orderService.getAvailableDeliveryOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (orders) => this.orders.set(orders), error: (error) => this.error.set(getErrorMessage(error)) });
  }

  accept(order: Order): void {
    const partnerId = this.authService.getCurrentUser()?.id;
    if (!partnerId) return;
    this.orderService.acceptDeliveryOrder(order.orderId, partnerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.orders.update((items) => items.filter((item) => item.orderId !== order.orderId));
          this.notificationService.success(`Order #${order.orderId} assigned to you.`);
        },
        error: (error) => this.notificationService.error(getErrorMessage(error))
      });
  }
}
