import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoaderComponent } from '../../components/shared/loader.component';
import { Payment } from '../../models/app.models';
import { AdminService } from '../../services/admin.service';
import { getErrorMessage } from '../../services/api.utils';

@Component({
  selector: 'app-admin-payments-page',
  standalone: true,
  imports: [CommonModule, LoaderComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Admin payments</span>
        <h1>Review transaction and payment settlement state.</h1>
        <p class="dashboard-subtitle">Amounts, payment mode, status, and transaction identifiers are read from the payment service admin API.</p>
      </div>
      <button type="button" class="secondary-btn" (click)="load()">Refresh</button>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <section class="stack-list dashboard-section" *ngIf="!loading() && !error() && payments().length; else empty">
      <article *ngFor="let payment of payments()" class="surface-card payment-card">
        <div>
          <div class="payment-heading">
            <strong>Payment #{{ payment.paymentId }}</strong>
            <span class="status-chip" [ngClass]="statusClass(payment.status)">{{ payment.status }}</span>
          </div>
          <div class="meta-list compact-meta">
            <div class="meta-row"><span>Order</span><strong>#{{ payment.orderId }}</strong></div>
            <div class="meta-row"><span>Customer</span><strong>#{{ payment.customerId }}</strong></div>
            <div class="meta-row"><span>Mode</span><strong>{{ payment.mode }}</strong></div>
            <div class="meta-row"><span>Transaction ID</span><strong>{{ payment.transactionId || 'Not available' }}</strong></div>
            <div class="meta-row"><span>Paid at</span><strong>{{ payment.paidAt || 'Pending' }}</strong></div>
            <div class="meta-row"><span>Refunded at</span><strong>{{ payment.refundedAt || 'Not refunded' }}</strong></div>
          </div>
        </div>
        <div class="payment-side">
          <strong>Rs {{ payment.amount.toFixed(2) }}</strong>
          <p>{{ payment.currency || 'INR' }}</p>
        </div>
      </article>
    </section>

    <ng-template #empty>
      <section class="empty-state" *ngIf="!loading() && !error()">No payments are available yet.</section>
    </ng-template>
  `,
  styles: [`
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    .payment-card { padding: 22px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px; }
    .payment-heading { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
    .compact-meta { margin-top: 18px; gap: 10px; }
    .payment-side { text-align: right; display: grid; gap: 8px; align-content: start; }
    .payment-side p { color: var(--qb-text-muted); }
    @media (max-width: 860px) {
      .payment-card { grid-template-columns: 1fr; }
      .payment-heading { flex-direction: column; align-items: stretch; }
      .payment-side { text-align: left; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPaymentsPageComponent {
  private readonly adminService = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly payments = signal<Payment[]>([]);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.adminService.getAllPayments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payments) => {
          this.payments.set(payments);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  statusClass(status: string): string {
    if (status === 'PAID') return 'status-green';
    if (status === 'FAILED') return 'status-red';
    if (status === 'PENDING' || status === 'REFUND_PENDING') return 'status-amber';
    return 'status-slate';
  }
}
