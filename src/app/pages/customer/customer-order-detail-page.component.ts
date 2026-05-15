import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoaderComponent } from '../../components/shared/loader.component';
import { Order, Payment } from '../../models/app.models';
import { OrderService } from '../../services/order.service';
import { PaymentService } from '../../services/payment.service';
import { getErrorMessage } from '../../services/api.utils';
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
          <h2>Items</h2>
          <div class="stack-list">
            <div *ngFor="let item of order.items" class="meta-row">
              <span>{{ item.name }} × {{ item.quantity }}</span>
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
            <div class="meta-row" *ngIf="order.deliveryAgentId"><span>Delivery partner</span><strong>#{{ order.deliveryAgentId }}</strong></div>
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerOrderDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);
  private readonly paymentService = inject(PaymentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly order = signal<Order | null>(null);
  readonly payment = signal<Payment | null>(null);
  readonly flow: Order['orderStatus'][] = ORDER_FLOW.filter((step) => step !== 'CANCELLED') as Order['orderStatus'][];
  readonly ORDER_LABELS = ORDER_LABELS;

  constructor() {
    const orderId = Number(this.route.snapshot.paramMap.get('orderId'));
    this.orderService.getOrderById(orderId)
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

    this.paymentService.getPaymentByOrder(orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (payment) => this.payment.set(payment), error: () => undefined });
  }

  isStepActive(current: Order['orderStatus'], step: Order['orderStatus']): boolean {
    return current === step;
  }

  isStepComplete(current: Order['orderStatus'], step: Order['orderStatus']): boolean {
    return this.flow.indexOf(current) > this.flow.indexOf(step);
  }
}
