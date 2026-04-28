import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoaderComponent } from '../../components/shared/loader.component';
import { DeliveryPartner, Order, OrderStatus } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';
import { AuthService } from '../../services/auth.service';
import { DeliveryPartnerService } from '../../services/delivery-partner.service';
import { NotificationService } from '../../services/notification.service';
import { OrderService } from '../../services/order.service';
import { getAllowedNextStatuses } from '../../shared/order-flow';

@Component({
  selector: 'app-my-deliveries-page',
  standalone: true,
  imports: [CommonModule, LoaderComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">My deliveries</span>
        <h1>Advance accepted orders through delivery milestones.</h1>
      </div>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <section class="stack-list" *ngIf="!loading() && orders().length; else empty">
      <article *ngFor="let order of orders()" class="surface-card order-card">
        <div>
          <strong>Order #{{ order.orderId }}</strong>
          <p>{{ order.deliveryAddress }} - {{ order.orderStatus }}</p>
        </div>
        <div class="actions">
          <button *ngFor="let status of nextStatuses(order.orderStatus)" type="button" class="ghost-btn" (click)="update(order.orderId, status)">{{ status }}</button>
        </div>
      </article>
    </section>

    <ng-template #empty>
      <section class="empty-state" *ngIf="!loading()">No assigned deliveries yet.</section>
    </ng-template>
  `,
  styles: [`
    .order-card { padding: 20px; display: flex; justify-content: space-between; gap: 16px; align-items: center; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyDeliveriesPageComponent {
  private readonly authService = inject(AuthService);
  private readonly deliveryPartnerService = inject(DeliveryPartnerService);
  private readonly orderService = inject(OrderService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly profile = signal<DeliveryPartner | null>(null);
  readonly orders = signal<Order[]>([]);
  readonly error = signal('');

  constructor() {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      this.error.set('Unable to resolve delivery partner session.');
      this.loading.set(false);
      return;
    }

    this.deliveryPartnerService.getMyDeliveryProfile(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          const agentId = profile.agentId;
          if (!agentId) {
            this.loading.set(false);
            return;
          }

          this.orderService.getDeliveryPartnerOrders(agentId)
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
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  nextStatuses(status: OrderStatus): OrderStatus[] {
    return getAllowedNextStatuses('DELIVERY_PARTNER', status);
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
