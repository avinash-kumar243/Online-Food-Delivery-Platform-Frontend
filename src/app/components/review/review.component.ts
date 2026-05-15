import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Review, ReviewType } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';
import { NotificationService } from '../../services/notification.service';
import { OrderReviewService } from '../../services/order-review.service';

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="review-backdrop" (click)="cancel.emit()">
      <article class="review-card surface-card" (click)="$event.stopPropagation()">
        <div class="review-header">
          <div>
            <span class="dashboard-kicker">{{ reviewType === 'FOOD' ? 'Food review' : 'Delivery review' }}</span>
            <h2>{{ reviewType === 'FOOD' ? 'Rate your food order' : 'Rate your delivery experience' }}</h2>
          </div>
          <button type="button" class="ghost-btn compact-btn" (click)="cancel.emit()">Close</button>
        </div>

        <form [formGroup]="form" class="review-form" (ngSubmit)="submit()">
          <div class="field-group">
            <label>Rating</label>
            <div class="star-row">
              <button
                *ngFor="let star of stars"
                type="button"
                class="star-button"
                [class.active]="star <= selectedRating()"
                (click)="setRating(star)">
                &#9733;
              </button>
            </div>
            <small class="validation-text" *ngIf="form.controls.rating.touched && form.controls.rating.invalid">
              Please select a rating from 1 to 5.
            </small>
          </div>

          <div class="field-group">
            <label for="comment">Comment</label>
            <textarea
              id="comment"
              rows="4"
              formControlName="comment"
              maxlength="1000"
              placeholder="Share a short note about the order"></textarea>
          </div>

          <div class="actions">
            <button type="button" class="secondary-btn" (click)="cancel.emit()">Cancel</button>
            <button type="submit" class="primary-btn" [disabled]="submitting() || form.invalid">
              {{ submitting() ? 'Submitting...' : 'Submit review' }}
            </button>
          </div>
        </form>
      </article>
    </section>
  `,
  styles: [`
    .review-backdrop {
      position: fixed;
      inset: 0;
      z-index: 90;
      display: grid;
      place-items: center;
      padding: 24px;
      background: rgba(15, 23, 42, 0.42);
      backdrop-filter: blur(6px);
    }
    .review-card {
      width: min(560px, 100%);
      padding: 24px;
      border-radius: 18px;
      border: 1px solid rgba(15, 122, 95, 0.12);
      background:
        radial-gradient(circle at top right, rgba(245, 158, 11, 0.12), transparent 14rem),
        linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 248, 0.98));
      box-shadow: 0 24px 54px rgba(15, 23, 42, 0.18);
    }
    .review-header, .actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .review-form {
      display: grid;
      gap: 18px;
      margin-top: 20px;
    }
    .field-group {
      display: grid;
      gap: 10px;
    }
    label {
      font-weight: 700;
      color: var(--qb-text);
    }
    .star-row {
      display: flex;
      gap: 8px;
    }
    .star-button {
      width: 48px;
      height: 48px;
      border: 1px solid var(--qb-border);
      border-radius: 14px;
      background: #fff;
      color: #cbd5e1;
      font-size: 1.4rem;
      cursor: pointer;
      transition: 0.2s ease;
    }
    .star-button.active {
      color: #f59e0b;
      border-color: rgba(245, 158, 11, 0.35);
      background: #fff7e6;
    }
    textarea {
      width: 100%;
      border: 1px solid var(--qb-border);
      border-radius: 14px;
      padding: 14px 16px;
      resize: vertical;
      min-height: 120px;
      background: #fff;
      color: var(--qb-text);
    }
    .validation-text {
      color: var(--qb-primary);
      font-size: 0.82rem;
    }
    .compact-btn {
      min-height: 40px;
      padding-inline: 14px;
    }
    @media (max-width: 700px) {
      .review-header, .actions {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewComponent {
  @Input({ required: true }) reviewType!: ReviewType;
  @Input({ required: true }) orderId!: number;
  @Input({ required: true }) customerId!: number;
  @Output() submitted = new EventEmitter<Review>();
  @Output() cancel = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly orderReviewService = inject(OrderReviewService);
  private readonly notificationService = inject(NotificationService);

  readonly stars = [1, 2, 3, 4, 5];
  readonly submitting = signal(false);
  readonly selectedRating = signal(0);

  readonly form = this.fb.nonNullable.group({
    rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ['', [Validators.maxLength(1000)]]
  });

  setRating(rating: number): void {
    this.selectedRating.set(rating);
    this.form.controls.rating.setValue(rating);
    this.form.controls.rating.markAsTouched();
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      orderId: this.orderId,
      customerId: this.customerId,
      rating: this.form.getRawValue().rating,
      comment: this.form.getRawValue().comment.trim() || undefined
    };

    this.submitting.set(true);
    const request$ = this.reviewType === 'FOOD'
      ? this.orderReviewService.postFoodReview(payload)
      : this.orderReviewService.postDeliveryReview(payload);

    request$.subscribe({
      next: (review) => {
        this.submitting.set(false);
        this.notificationService.success(this.reviewType === 'FOOD' ? 'Food review submitted.' : 'Delivery review submitted.');
        this.submitted.emit(review);
      },
      error: (error) => {
        this.submitting.set(false);
        this.notificationService.error(getErrorMessage(error));
      }
    });
  }
}
