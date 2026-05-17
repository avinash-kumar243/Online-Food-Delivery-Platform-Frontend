import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { LoaderComponent } from '../../components/shared/loader.component';
import { Order, Payment } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';
import { OrderService } from '../../services/order.service';
import { PaymentService } from '../../services/payment.service';
import { RealtimeService } from '../../services/realtime.service';
import { ORDER_FLOW, ORDER_LABELS } from '../../shared/order-flow';

@Component({
  selector: 'app-customer-order-detail-page',
  standalone: true,
  imports: [CommonModule, LoaderComponent],
  template: `
    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <ng-container *ngIf="!loading() && !error() && order() as order">
      <section class="surface-card section-card">
        <span class="dashboard-kicker">Order details</span>
        <h1>Order #{{ order.orderId }}</h1>
        <p class="dashboard-subtitle">Track order progress, payment state, and delivery details from live services.</p>

        <div class="timeline">
          <div *ngFor="let step of flow" class="timeline-step" [class.active]="isStepActive(order.orderStatus, step)" [class.complete]="isStepComplete(order.orderStatus, step)">
            {{ ORDER_LABELS[step] }}
          </div>
        </div>
      </section>

      <section class="split-layout dashboard-section">
        <article class="surface-card section-card">
          <h2>Restaurant</h2>
          <div class="contact-card" *ngIf="order.restaurant; else restaurantFallback">
            <strong>{{ order.restaurant.name }}</strong>
            <p *ngIf="order.restaurant.phone">Phone: {{ order.restaurant.phone }}</p>
            <p *ngIf="order.restaurant.address">{{ order.restaurant.address }}<ng-container *ngIf="order.restaurant.city">, {{ order.restaurant.city }}</ng-container></p>
          </div>
          <ng-template #restaurantFallback>
            <p class="muted-copy">Restaurant details will appear here when available.</p>
          </ng-template>
        </article>

        <article class="surface-card section-card">
          <h2>Items</h2>
          <div class="stack-list">
            <div *ngFor="let item of order.items" class="meta-row">
              <span>{{ item.name }} x {{ item.quantity }}</span>
              <strong>Rs {{ (item.lineTotal || (item.price * item.quantity)).toFixed(2) }}</strong>
            </div>
          </div>
        </article>

        <article class="surface-card section-card">
          <h2>Summary</h2>
          <div class="meta-list">
            <div class="meta-row"><span>Status</span><strong>{{ order.orderStatus }}</strong></div>
            <div class="meta-row"><span>Payment</span><strong>{{ payment()?.status || 'Pending' }}</strong></div>
            <div class="meta-row"><span>Payment mode</span><strong>{{ order.modeOfPayment }}</strong></div>
            <div class="meta-row"><span>Delivery address</span><strong>{{ order.deliveryAddress }}</strong></div>
            <div class="meta-row"><span>Total</span><strong>Rs {{ order.finalAmount.toFixed(2) }}</strong></div>
            <div class="meta-row" *ngIf="order.deliveryPartner"><span>Delivery partner</span><strong>{{ order.deliveryPartner.fullName }}</strong></div>
            <div class="meta-row" *ngIf="order.deliveryPartner?.phone"><span>Partner phone</span><strong>{{ order.deliveryPartner.phone }}</strong></div>
          </div>
        </article>
      </section>
    </ng-container>
  `,
  styles: [`
    .section-card { padding: 24px; }
    h1 { margin: 8px 0 10px; font-size: clamp(2rem, 3vw, 3rem); }
    .timeline { display: grid; gap: 10px; margin-top: 22px; }
    .timeline-step {
      padding: 12px 14px; border-radius: 14px; background: #f5f6f8; color: var(--qb-text-muted);
    }
    .timeline-step.active { background: #fff0e8; color: #c2410c; }
    .timeline-step.complete { background: #eef9f2; color: var(--qb-success); }
    .contact-card {
      display: grid;
      gap: 8px;
    }
    .contact-card p,
    .muted-copy {
      color: var(--qb-text-muted);
      line-height: 1.6;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerOrderDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);
  private readonly paymentService = inject(PaymentService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly orderId = Number(this.route.snapshot.paramMap.get('orderId'));

  readonly loading = signal(true);
  readonly error = signal('');
  readonly order = signal<Order | null>(null);
  readonly payment = signal<Payment | null>(null);
  readonly flow: Order['orderStatus'][] = ORDER_FLOW.filter((step) => step !== 'CANCELLED') as Order['orderStatus'][];
  readonly ORDER_LABELS = ORDER_LABELS;

  constructor() {
    this.loadOrder();
    this.paymentService.getPaymentByOrder(this.orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (payment) => this.payment.set(payment), error: () => undefined });
    this.realtimeService.orderEvents$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event.orderId === this.orderId) {
          this.loadOrder();
        }
      });
  }

  isStepActive(current: Order['orderStatus'], step: Order['orderStatus']): boolean {
    return current === step;
  }

  isStepComplete(current: Order['orderStatus'], step: Order['orderStatus']): boolean {
    return this.flow.indexOf(current) > this.flow.indexOf(step);
  }

  private loadOrder(): void {
    this.loading.set(true);
    this.orderService.getOrderById(this.orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.order.set(order);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }
}
