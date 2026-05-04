import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ReviewComponent } from '../../components/review/review.component';
import { EmptyStateComponent } from '../../components/shared/empty-state.component';
import { LoaderComponent } from '../../components/shared/loader.component';
import { Order, Review, ReviewType } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';
import { AuthService } from '../../services/auth.service';
import { OrderReviewService } from '../../services/order-review.service';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-customer-orders-page',
  standalone: true,
  imports: [CommonModule, RouterLink, EmptyStateComponent, LoaderComponent, ReviewComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Orders</span>
        <h1>Track your current and past orders.</h1>
        <p class="dashboard-subtitle">Delivered orders can be reviewed once for food and once for delivery.</p>
      </div>
      <button type="button" class="secondary-btn" (click)="loadOrders()">Refresh</button>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <section class="stack-list dashboard-section" *ngIf="!loading() && !error() && orders().length; else noOrders">
      <article *ngFor="let order of orders()" class="surface-card order-card">
        <div class="order-body">
          <div>
            <strong>Order #{{ order.orderId }}</strong>
            <p>{{ order.items.length }} items | {{ order.deliveryAddress }}</p>
          </div>
          <div class="order-meta">
            <span class="badge-chip">{{ order.orderStatus }}</span>
            <strong>Rs {{ order.finalAmount.toFixed(2) }}</strong>
          </div>
        </div>

        <div class="order-actions">
          <a class="secondary-btn compact-link" [routerLink]="['/customer/orders', order.orderId]">View details</a>

          <ng-container *ngIf="order.orderStatus === 'DELIVERED'">
            <button
              *ngIf="!hasReview(order.orderId, 'FOOD')"
              type="button"
              class="primary-btn compact-btn"
              (click)="openReview(order, 'FOOD')">
              Review food
            </button>
            <span *ngIf="hasReview(order.orderId, 'FOOD')" class="status-pill">Food reviewed</span>

            <button
              *ngIf="order.deliveryAgentId && !hasReview(order.orderId, 'DELIVERY')"
              type="button"
              class="primary-btn compact-btn"
              (click)="openReview(order, 'DELIVERY')">
              Review delivery
            </button>
            <span *ngIf="order.deliveryAgentId && hasReview(order.orderId, 'DELIVERY')" class="status-pill">Delivery reviewed</span>
          </ng-container>
        </div>
      </article>
    </section>

    <ng-template #noOrders>
      <app-empty-state
        *ngIf="!loading() && !error()"
        title="No orders yet"
        description="Place an order to start live tracking and order history.">
      </app-empty-state>
    </ng-template>

    <app-review
      *ngIf="selectedOrder() && selectedReviewType()"
      [reviewType]="selectedReviewType()!"
      [orderId]="selectedOrder()!.orderId"
      [customerId]="customerId()"
      (submitted)="handleReviewSubmitted($event)"
      (cancel)="closeReview()">
    </app-review>
  `,
  styles: [`
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    .order-card {
      display: grid;
      gap: 18px;
      padding: 20px;
    }
    .order-body {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
    }
    .order-card p {
      margin-top: 6px;
      color: var(--qb-text-muted);
    }
    .order-meta {
      display: grid;
      gap: 10px;
      justify-items: end;
    }
    .order-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }
    .compact-btn,
    .compact-link {
      min-height: 40px;
      padding-inline: 16px;
    }
    .compact-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      min-height: 40px;
      padding: 0 16px;
      border-radius: 999px;
      background: rgba(22, 163, 74, 0.12);
      color: #166534;
      font-weight: 700;
      font-size: 0.92rem;
    }
    @media (max-width: 780px) {
      .order-body {
        flex-direction: column;
        align-items: stretch;
      }
      .order-meta {
        justify-items: start;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerOrdersPageComponent {
  private readonly authService = inject(AuthService);
  private readonly orderService = inject(OrderService);
  private readonly orderReviewService = inject(OrderReviewService);
  private readonly destroyRef = inject(DestroyRef);

  readonly customerId = signal(this.authService.getCurrentUser()?.id ?? 0);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly orders = signal<Order[]>([]);
  readonly reviews = signal<Review[]>([]);
  readonly selectedOrder = signal<Order | null>(null);
  readonly selectedReviewType = signal<ReviewType | null>(null);

  constructor() {
    this.loadOrders();
  }

  loadOrders(): void {
    const customerId = this.customerId();
    if (!customerId) {
      this.error.set('Unable to resolve your customer session.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.orderService.getCustomerOrders(customerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          this.orders.set(orders);
          this.loadReviews(customerId);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  openReview(order: Order, reviewType: ReviewType): void {
    this.selectedOrder.set(order);
    this.selectedReviewType.set(reviewType);
  }

  closeReview(): void {
    this.selectedOrder.set(null);
    this.selectedReviewType.set(null);
  }

  hasReview(orderId: number, reviewType: ReviewType): boolean {
    return this.reviews().some((review) => review.orderId === orderId && review.reviewType === reviewType);
  }

  handleReviewSubmitted(review: Review): void {
    this.reviews.update((reviews) => [review, ...reviews]);
    this.closeReview();
  }

  private loadReviews(customerId: number): void {
    this.orderReviewService.getCustomerReviews(customerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reviews) => {
          this.reviews.set(reviews);
          this.loading.set(false);
        },
        error: () => {
          this.reviews.set([]);
          this.loading.set(false);
        }
      });
  }
}
