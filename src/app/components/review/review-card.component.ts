import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Review } from '../../models/app.models';

@Component({
  selector: 'app-review-card',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <article class="surface-card review-card">
      <div class="review-card-head">
        <div class="review-card-meta">
          <span class="review-type">{{ review.reviewType === 'FOOD' ? 'Food review' : 'Delivery review' }}</span>
          <strong>{{ heading || defaultHeading }}</strong>
          <p>{{ subheading || defaultSubheading }}</p>
        </div>
        <div class="rating-pill" [attr.aria-label]="'Rating ' + review.rating + ' out of 5'">
          <span class="rating-value">{{ review.rating.toFixed(1) }}</span>
          <span class="rating-stars">{{ stars(review.rating) }}</span>
        </div>
      </div>

      <p class="review-comment" *ngIf="review.comment?.trim(); else noComment">
        {{ review.comment }}
      </p>

      <ng-template #noComment>
        <p class="review-comment muted">No written comment was added for this review.</p>
      </ng-template>

      <div class="review-footer">
        <span>Order #{{ review.orderId }}</span>
        <span>{{ review.reviewDate | date:'mediumDate' }}</span>
      </div>
    </article>
  `,
  styles: [`
    .review-card {
      display: grid;
      gap: 16px;
      padding: 22px;
      border-radius: 20px;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
    }
    .review-card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .review-card-meta {
      display: grid;
      gap: 6px;
      min-width: 0;
    }
    .review-type {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      min-height: 28px;
      padding: 0 12px;
      border-radius: 999px;
      background: rgba(249, 115, 22, 0.1);
      color: #c2410c;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .review-card-meta strong {
      font-size: 1rem;
      line-height: 1.3;
      color: var(--qb-text);
    }
    .review-card-meta p {
      color: var(--qb-text-muted);
      line-height: 1.5;
      margin: 0;
    }
    .rating-pill {
      display: grid;
      justify-items: end;
      gap: 4px;
      flex-shrink: 0;
      min-width: 84px;
    }
    .rating-value {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--qb-text);
    }
    .rating-stars {
      color: #f59e0b;
      font-size: 0.92rem;
      letter-spacing: 0.04em;
    }
    .review-comment {
      margin: 0;
      color: var(--qb-text);
      line-height: 1.7;
    }
    .review-comment.muted {
      color: var(--qb-text-muted);
    }
    .review-footer {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      color: var(--qb-text-muted);
      font-size: 0.88rem;
      padding-top: 10px;
      border-top: 1px solid var(--qb-border);
    }
    @media (max-width: 720px) {
      .review-card-head,
      .review-footer {
        grid-template-columns: 1fr;
        display: grid;
      }
      .rating-pill {
        justify-items: start;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewCardComponent {
  @Input({ required: true }) review!: Review;
  @Input() heading = '';
  @Input() subheading = '';

  get defaultHeading(): string {
    return this.review.reviewType === 'FOOD'
      ? `Restaurant #${this.review.restaurantId}`
      : `Delivery partner #${this.review.agentId}`;
  }

  get defaultSubheading(): string {
    return this.review.reviewType === 'FOOD'
      ? 'Customer feedback on food quality, taste, and order accuracy.'
      : 'Customer feedback on delivery handling, timing, and professionalism.';
  }

  stars(rating: number): string {
    const clamped = Math.max(1, Math.min(5, Math.round(rating)));
    return '★'.repeat(clamped) + '☆'.repeat(5 - clamped);
  }
}
