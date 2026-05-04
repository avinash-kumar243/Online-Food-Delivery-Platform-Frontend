import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { ReviewCardComponent } from '../../components/review/review-card.component';
import { LoaderComponent } from '../../components/shared/loader.component';
import { DashboardStats, DeliveryPartner, Review } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';
import { AuthService } from '../../services/auth.service';
import { DeliveryPartnerService } from '../../services/delivery-partner.service';
import { OrderReviewService } from '../../services/order-review.service';
import { StatsService } from '../../services/stats.service';

@Component({
  selector: 'app-partner-earnings-page',
  standalone: true,
  imports: [CommonModule, LoaderComponent, ReviewCardComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Earnings</span>
        <h1>Delivery performance, payouts, and customer ratings.</h1>
        <p class="dashboard-subtitle">This page combines live delivery earnings with verified post-delivery customer feedback.</p>
      </div>
      <button type="button" class="secondary-btn" (click)="load()">Refresh</button>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <ng-container *ngIf="!loading() && !error()">
      <section class="stats-grid dashboard-section" *ngIf="stats() as stats">
        <article class="surface-card stat-card"><div class="value">{{ stats.totalDeliveries || 0 }}</div><p class="helper">Total deliveries</p></article>
        <article class="surface-card stat-card"><div class="value">{{ stats.todayDeliveries || 0 }}</div><p class="helper">Today deliveries</p></article>
        <article class="surface-card stat-card"><div class="value">Rs {{ (stats.totalEarnings || 0).toFixed(2) }}</div><p class="helper">Estimated earnings</p></article>
        <article class="surface-card stat-card"><div class="value">Rs {{ (stats.todayEarnings || 0).toFixed(2) }}</div><p class="helper">Today earnings</p></article>
        <article class="surface-card stat-card emphasis-card"><div class="value">{{ averageRating().toFixed(1) }}</div><p class="helper">Average delivery rating</p></article>
        <article class="surface-card stat-card"><div class="value">{{ reviews().length }}</div><p class="helper">Customer reviews</p></article>
      </section>

      <section class="split-layout dashboard-section">
        <article class="surface-card panel-card summary-card">
          <div class="panel-header">
            <div>
              <span class="dashboard-kicker">Reputation snapshot</span>
              <strong>{{ profile()?.fullName || 'Delivery partner' }}</strong>
            </div>
            <span class="rating-chip">★ {{ averageRating().toFixed(1) }}</span>
          </div>

          <div class="summary-grid">
            <div class="summary-block">
              <span>5-star share</span>
              <strong>{{ fiveStarShare() }}%</strong>
            </div>
            <div class="summary-block">
              <span>Comment coverage</span>
              <strong>{{ commentCoverage() }}%</strong>
            </div>
            <div class="summary-block">
              <span>Active delivery load</span>
              <strong>{{ stats()?.pendingOrders || 0 }}</strong>
            </div>
          </div>

          <p class="summary-copy">{{ reviewSummaryCopy() }}</p>
        </article>

        <article class="surface-card panel-card breakdown-card">
          <div class="panel-header">
            <div>
              <span class="dashboard-kicker">Delivery score mix</span>
              <strong>How customers rate delivery execution</strong>
            </div>
            <span>{{ reviews().length }} reviews</span>
          </div>

          <div class="stack-list" *ngIf="reviews().length; else noBreakdown">
            <div *ngFor="let bucket of ratingDistribution()" class="distribution-row">
              <div class="distribution-label">
                <strong>{{ bucket.label }}</strong>
                <span>{{ bucket.count }} review{{ bucket.count === 1 ? '' : 's' }}</span>
              </div>
              <div class="distribution-bar-track">
                <div class="distribution-bar-fill" [style.width.%]="bucket.percent"></div>
              </div>
              <strong class="distribution-percent">{{ bucket.percent }}%</strong>
            </div>
          </div>

          <ng-template #noBreakdown>
            <div class="empty-state compact-empty">Delivery ratings will appear here after customers review completed drop-offs.</div>
          </ng-template>
        </article>
      </section>

      <section class="dashboard-section">
        <div class="panel-header section-header-inline">
          <div>
            <span class="dashboard-kicker">Latest delivery reviews</span>
            <strong>Verified customer feedback</strong>
          </div>
          <span>{{ reviews().length }} total</span>
        </div>

        <div class="reviews-grid" *ngIf="reviews().length; else noReviews">
          <app-review-card
            *ngFor="let review of reviews().slice(0, 6)"
            [review]="review"
            [heading]="profile()?.fullName || ''"
            subheading="Verified post-delivery customer feedback on handling, timing, and professionalism.">
          </app-review-card>
        </div>

        <ng-template #noReviews>
          <section class="empty-state">Customer delivery ratings will appear here after delivered orders are reviewed.</section>
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
      background: linear-gradient(180deg, rgba(14, 165, 233, 0.08), rgba(255, 255, 255, 0.96));
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 18px;
      color: var(--qb-text-muted);
    }
    .panel-header strong {
      display: block;
      margin-top: 4px;
      color: var(--qb-text);
      font-size: 1rem;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 18px;
    }
    .summary-block {
      padding: 16px;
      border-radius: 18px;
      background: rgba(14, 165, 233, 0.08);
      display: grid;
      gap: 8px;
    }
    .summary-block span {
      color: var(--qb-text-muted);
      font-size: 0.84rem;
    }
    .summary-block strong {
      font-size: 1.15rem;
      color: var(--qb-text);
    }
    .summary-copy {
      margin: 0;
      line-height: 1.7;
      color: var(--qb-text);
    }
    .rating-chip {
      display: inline-flex;
      align-items: center;
      min-height: 40px;
      padding: 0 14px;
      border-radius: 999px;
      background: rgba(14, 165, 233, 0.12);
      color: #0369a1;
      font-weight: 800;
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
      background: linear-gradient(90deg, #0ea5e9, #38bdf8);
    }
    .distribution-percent {
      text-align: right;
    }
    .section-header-inline {
      margin-bottom: 18px;
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
      .summary-grid,
      .reviews-grid {
        grid-template-columns: 1fr;
      }
      .distribution-row {
        grid-template-columns: 1fr;
      }
      .distribution-percent {
        text-align: left;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartnerEarningsPageComponent {
  private readonly authService = inject(AuthService);
  private readonly statsService = inject(StatsService);
  private readonly deliveryPartnerService = inject(DeliveryPartnerService);
  private readonly orderReviewService = inject(OrderReviewService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly profile = signal<DeliveryPartner | null>(null);
  readonly stats = signal<DashboardStats | null>(null);
  readonly reviews = signal<Review[]>([]);
  readonly averageRating = signal(0);

  readonly fiveStarShare = computed(() => this.shareForRating(5));
  readonly commentCoverage = computed(() => {
    const reviews = this.reviews();
    if (!reviews.length) return 0;
    const withComments = reviews.filter((review) => !!review.comment?.trim()).length;
    return Math.round((withComments / reviews.length) * 100);
  });
  readonly ratingDistribution = computed(() => {
    const reviews = this.reviews();
    const total = reviews.length || 1;
    return [5, 4, 3, 2, 1].map((rating) => {
      const count = reviews.filter((review) => review.rating === rating).length;
      return {
        label: `${rating} star`,
        count,
        percent: Math.round((count / total) * 100)
      };
    });
  });
  readonly reviewSummaryCopy = computed(() => {
    const average = this.averageRating();
    const count = this.reviews().length;
    if (!count) {
      return 'No delivery reviews have been published yet. Once customers submit feedback after completed deliveries, this panel will summarize reliability and service quality.';
    }
    if (average >= 4.5) {
      return 'Customers are rating delivery execution very highly. This supports stronger trust for future order assignment while you remain online and available.';
    }
    if (average >= 3.5) {
      return 'Delivery sentiment is solid but mixed. Review comments should be monitored for repeat signals around timing, communication, or drop-off handling.';
    }
    return 'Delivery feedback is below the expected operating range. This should be reviewed against recent order timelines and handoff consistency.';
  });

  constructor() {
    this.load();
  }

  load(): void {
    const partnerId = this.authService.getCurrentUser()?.id;
    if (!partnerId) {
      this.error.set('Unable to resolve your delivery partner session.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.deliveryPartnerService.getMyDeliveryProfile(partnerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          const agentId = profile.agentId ?? profile.partnerId;

          forkJoin({
            stats: this.statsService.getDeliveryPartnerStats(partnerId),
            reviews: this.orderReviewService.getDeliveryReviews(agentId),
            average: this.orderReviewService.getAverageDeliveryRating(agentId)
          }).pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: ({ stats, reviews, average }) => {
                this.stats.set(stats);
                this.reviews.set(reviews);
                this.averageRating.set(average ?? 0);
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

  private shareForRating(rating: number): number {
    const reviews = this.reviews();
    if (!reviews.length) return 0;
    const count = reviews.filter((review) => review.rating === rating).length;
    return Math.round((count / reviews.length) * 100);
  }
}
