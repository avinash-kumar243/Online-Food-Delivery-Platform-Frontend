import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReviewCardComponent } from '../../components/review/review-card.component';
import { LoaderComponent } from '../../components/shared/loader.component';
import { Review, ReviewType } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';
import { OrderReviewService } from '../../services/order-review.service';

type ReviewFilter = 'ALL' | ReviewType;

@Component({
  selector: 'app-admin-reviews-page',
  standalone: true,
  imports: [CommonModule, LoaderComponent, ReviewCardComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Review moderation</span>
        <h1>Platform feedback across food quality and delivery execution.</h1>
        <p class="dashboard-subtitle">Admins can inspect all verified customer reviews, isolate low scores, and monitor sentiment patterns across the marketplace.</p>
      </div>
      <button type="button" class="secondary-btn" (click)="load()">Refresh</button>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <ng-container *ngIf="!loading() && !error()">
      <section class="stats-grid dashboard-section">
        <article class="surface-card stat-card"><div class="value">{{ reviews().length }}</div><p class="helper">Total reviews</p></article>
        <article class="surface-card stat-card"><div class="value">{{ foodReviewCount() }}</div><p class="helper">Food reviews</p></article>
        <article class="surface-card stat-card"><div class="value">{{ deliveryReviewCount() }}</div><p class="helper">Delivery reviews</p></article>
        <article class="surface-card stat-card emphasis-card"><div class="value">{{ averageFoodRating().toFixed(1) }}</div><p class="helper">Average food rating</p></article>
        <article class="surface-card stat-card emphasis-card cool-card"><div class="value">{{ averageDeliveryRating().toFixed(1) }}</div><p class="helper">Average delivery rating</p></article>
        <article class="surface-card stat-card"><div class="value">{{ lowRatingCount() }}</div><p class="helper">Low-rating alerts</p></article>
      </section>

      <section class="split-layout dashboard-section">
        <article class="surface-card panel-card">
          <div class="panel-header">
            <div>
              <span class="dashboard-kicker">Operational watchlist</span>
              <strong>Low-score reviews needing attention</strong>
            </div>
            <span>{{ lowRatingCount() }} flagged</span>
          </div>

          <div class="stack-list" *ngIf="lowRatings().length; else noAlerts">
            <div *ngFor="let review of lowRatings().slice(0, 5)" class="alert-row">
              <div>
                <strong>{{ review.reviewType === 'FOOD' ? 'Food' : 'Delivery' }} review</strong>
                <p>Order #{{ review.orderId }} • {{ review.rating }}/5</p>
              </div>
              <span class="badge-chip">{{ review.reviewType }}</span>
            </div>
          </div>

          <ng-template #noAlerts>
            <div class="empty-state compact-empty">No low-score reviews are currently in the moderation queue.</div>
          </ng-template>
        </article>

        <article class="surface-card panel-card">
          <div class="panel-header">
            <div>
              <span class="dashboard-kicker">Type mix</span>
              <strong>Distribution of customer feedback</strong>
            </div>
            <span>{{ reviews().length }} entries</span>
          </div>

          <div class="stack-list" *ngIf="reviews().length; else noMix">
            <div class="distribution-row" *ngFor="let item of typeDistribution()">
              <div class="distribution-label">
                <strong>{{ item.label }}</strong>
                <span>{{ item.count }} review{{ item.count === 1 ? '' : 's' }}</span>
              </div>
              <div class="distribution-bar-track">
                <div class="distribution-bar-fill" [style.width.%]="item.percent"></div>
              </div>
              <strong class="distribution-percent">{{ item.percent }}%</strong>
            </div>
          </div>

          <ng-template #noMix>
            <div class="empty-state compact-empty">Review volume will appear here once delivered orders start receiving feedback.</div>
          </ng-template>
        </article>
      </section>

      <section class="dashboard-section">
        <div class="toolbar">
          <div>
            <span class="dashboard-kicker">Review stream</span>
            <strong>Latest customer feedback</strong>
          </div>

          <div class="segmented-control" role="tablist" aria-label="Review type filter">
            <button type="button" [class.active]="filter() === 'ALL'" (click)="setFilter('ALL')">All</button>
            <button type="button" [class.active]="filter() === 'FOOD'" (click)="setFilter('FOOD')">Food</button>
            <button type="button" [class.active]="filter() === 'DELIVERY'" (click)="setFilter('DELIVERY')">Delivery</button>
          </div>
        </div>

        <div class="reviews-grid" *ngIf="filteredReviews().length; else noReviews">
          <app-review-card
            *ngFor="let review of filteredReviews()"
            [review]="review"
            [heading]="review.reviewType === 'FOOD' ? ('Restaurant #' + review.restaurantId) : ('Delivery partner #' + review.agentId)"
            [subheading]="review.reviewType === 'FOOD'
              ? 'Verified post-delivery food review visible to restaurant operations and admin.'
              : 'Verified post-delivery delivery review visible to the assigned partner and admin.'">
          </app-review-card>
        </div>

        <ng-template #noReviews>
          <section class="empty-state">No reviews match the selected filter.</section>
        </ng-template>
      </section>
    </ng-container>
  `,
  styles: [`
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    .stat-card,
    .panel-card {
      padding: 24px;
    }
    .emphasis-card {
      background: linear-gradient(180deg, rgba(249, 115, 22, 0.08), rgba(255, 255, 255, 0.96));
    }
    .cool-card {
      background: linear-gradient(180deg, rgba(14, 165, 233, 0.08), rgba(255, 255, 255, 0.96));
    }
    .panel-header,
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 18px;
      color: var(--qb-text-muted);
    }
    .panel-header strong,
    .toolbar strong {
      display: block;
      margin-top: 4px;
      color: var(--qb-text);
      font-size: 1rem;
    }
    .alert-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 16px 18px;
      border-radius: 16px;
      background: rgba(248, 113, 113, 0.08);
    }
    .alert-row p {
      margin: 4px 0 0;
      color: var(--qb-text-muted);
    }
    .distribution-row {
      display: grid;
      grid-template-columns: 120px minmax(0, 1fr) 52px;
      gap: 14px;
      align-items: center;
    }
    .distribution-label {
      display: grid;
      gap: 2px;
    }
    .distribution-label span {
      color: var(--qb-text-muted);
      font-size: 0.82rem;
    }
    .distribution-bar-track {
      height: 10px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.18);
      overflow: hidden;
    }
    .distribution-bar-fill {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #f97316, #0ea5e9);
    }
    .distribution-percent {
      text-align: right;
    }
    .segmented-control {
      display: inline-flex;
      padding: 4px;
      border-radius: 14px;
      background: rgba(148, 163, 184, 0.12);
      gap: 4px;
    }
    .segmented-control button {
      min-width: 82px;
      min-height: 38px;
      border: 0;
      border-radius: 10px;
      background: transparent;
      color: var(--qb-text-muted);
      font-weight: 700;
      cursor: pointer;
    }
    .segmented-control button.active {
      background: #fff;
      color: var(--qb-primary);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
    }
    .reviews-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }
    .compact-empty {
      min-height: auto;
      padding: 18px;
    }
    @media (max-width: 900px) {
      .reviews-grid {
        grid-template-columns: 1fr;
      }
      .distribution-row {
        grid-template-columns: 1fr;
      }
      .distribution-percent {
        text-align: left;
      }
      .toolbar {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminReviewsPageComponent {
  private readonly orderReviewService = inject(OrderReviewService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly reviews = signal<Review[]>([]);
  readonly filter = signal<ReviewFilter>('ALL');

  readonly filteredReviews = computed(() => {
    const filter = this.filter();
    if (filter === 'ALL') {
      return this.reviews();
    }
    return this.reviews().filter((review) => review.reviewType === filter);
  });
  readonly foodReviewCount = computed(() => this.countByType('FOOD'));
  readonly deliveryReviewCount = computed(() => this.countByType('DELIVERY'));
  readonly lowRatings = computed(() => this.reviews().filter((review) => review.rating <= 2));
  readonly lowRatingCount = computed(() => this.lowRatings().length);
  readonly averageFoodRating = computed(() => this.averageForType('FOOD'));
  readonly averageDeliveryRating = computed(() => this.averageForType('DELIVERY'));
  readonly typeDistribution = computed(() => {
    const total = this.reviews().length || 1;
    return [
      { label: 'Food', count: this.foodReviewCount() },
      { label: 'Delivery', count: this.deliveryReviewCount() }
    ].map((item) => ({
      ...item,
      percent: Math.round((item.count / total) * 100)
    }));
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.orderReviewService.getAllReviews()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reviews) => {
          this.reviews.set(reviews);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  setFilter(filter: ReviewFilter): void {
    this.filter.set(filter);
  }

  private countByType(reviewType: ReviewType): number {
    return this.reviews().filter((review) => review.reviewType === reviewType).length;
  }

  private averageForType(reviewType: ReviewType): number {
    const items = this.reviews().filter((review) => review.reviewType === reviewType);
    if (!items.length) return 0;
    const total = items.reduce((sum, review) => sum + review.rating, 0);
    return total / items.length;
  }
}
