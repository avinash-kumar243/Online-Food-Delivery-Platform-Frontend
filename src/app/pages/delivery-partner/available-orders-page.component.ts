import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoaderComponent } from '../../components/shared/loader.component';
import { DeliveryPartner, Order } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';
import { AuthService } from '../../services/auth.service';
import { DeliveryPartnerService } from '../../services/delivery-partner.service';
import { NotificationService } from '../../services/notification.service';
import { OrderService } from '../../services/order.service';
import { RealtimeService } from '../../services/realtime.service';

@Component({
  selector: 'app-available-orders-page',
  standalone: true,
  imports: [CommonModule, LoaderComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Available orders</span>
        <h1>Accept ready deliveries as they appear.</h1>
      </div>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>
    <section *ngIf="!loading() && profile() && (!profile()?.isVerified || !profile()?.isOnline)" class="empty-state">
      You must be verified and online before ready-for-pickup orders become available.
    </section>

    <section class="stack-list" *ngIf="!loading() && orders().length; else empty">
      <article *ngFor="let order of orders()" class="surface-card order-card">
        <div>
          <strong>Order #{{ order.orderId }}</strong>
          <p>{{ order.deliveryAddress }} - {{ order.orderStatus }}</p>
        </div>
        <button type="button" class="primary-btn" (click)="accept(order)">Accept order</button>
      </article>
    </section>

    <ng-template #empty>
      <section class="empty-state" *ngIf="!loading() && (!profile() || (profile()?.isVerified && profile()?.isOnline))">No available ready-for-pickup orders right now.</section>
    </ng-template>
  `,
  styles: [`
    .order-card { padding: 20px; display: flex; justify-content: space-between; gap: 16px; align-items: center; }
    .order-card p { margin-top: 6px; color: var(--qb-text-muted); }
    @media (max-width: 760px) {
      .order-card {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvailableOrdersPageComponent {
  private readonly authService = inject(AuthService);
  private readonly deliveryPartnerService = inject(DeliveryPartnerService);
  private readonly orderService = inject(OrderService);
  private readonly notificationService = inject(NotificationService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly profile = signal<DeliveryPartner | null>(null);
  readonly orders = signal<Order[]>([]);
  readonly error = signal('');

  constructor() {
    this.load();
    this.realtimeService.orderEvents$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reloadAvailableOrders());
  }

  load(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      this.error.set('Unable to resolve delivery partner session.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.deliveryPartnerService.getMyDeliveryProfile(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.error.set('');
          if (!profile.isVerified || !profile.isOnline) {
            this.orders.set([]);
            this.loading.set(false);
            return;
          }

          this.orderService.getAvailableDeliveryOrders()
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

  accept(order: Order): void {
    const agentId = this.profile()?.agentId;
    if (!agentId) {
      this.notificationService.error('Unable to resolve delivery agent profile.');
      return;
    }

    this.deliveryPartnerService.acceptOrder(agentId, order.orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.orders.update((items) => items.filter((item) => item.orderId !== order.orderId));
          this.notificationService.success(`Order #${order.orderId} assigned to you.`);
        },
        error: (error) => {
          this.orderService.getAvailableDeliveryOrders()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (orders) => this.orders.set(orders),
              error: () => {}
            });
          this.notificationService.error(getErrorMessage(error));
        }
      });
  }

  private reloadAvailableOrders(): void {
    const profile = this.profile();
    if (!profile?.isVerified || !profile?.isOnline) {
      return;
    }

    this.orderService.getAvailableDeliveryOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => this.orders.set(orders),
        error: () => {}
      });
  }
}
