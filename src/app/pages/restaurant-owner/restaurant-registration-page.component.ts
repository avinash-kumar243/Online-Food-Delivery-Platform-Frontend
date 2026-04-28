import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Restaurant } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { RestaurantService } from '../../services/restaurant.service';

@Component({
  selector: 'app-restaurant-registration-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Restaurant registration</span>
        <h1>Register your restaurant for approval.</h1>
        <p class="dashboard-subtitle">This form sends a real registration request to the restaurant service and can be used for resubmission after rejection.</p>
      </div>
    </section>

    <section *ngIf="existingRestaurant()?.rejectionReason" class="empty-state dashboard-section">
      Last admin feedback: {{ existingRestaurant()?.rejectionReason }}
    </section>

    <form class="surface-card form-card" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-grid">
        <label><span>Name</span><input formControlName="name" /></label>
        <label><span>Cuisine</span><input formControlName="cuisine" /></label>
        <label><span>Phone</span><input formControlName="phone" /></label>
        <label><span>City</span><input formControlName="city" /></label>
        <label><span>Latitude</span><input type="number" formControlName="latitude" /></label>
        <label><span>Longitude</span><input type="number" formControlName="longitude" /></label>
        <label><span>Delivery radius (km)</span><input type="number" formControlName="deliveryRadius" /></label>
        <label><span>Min order amount</span><input type="number" formControlName="minOrderAmount" /></label>
        <label><span>Estimated delivery minutes</span><input type="number" formControlName="estimatedDeliveryMin" /></label>
        <label class="full"><span>Address</span><textarea rows="3" formControlName="address"></textarea></label>
        <label class="full"><span>Description</span><textarea rows="4" formControlName="description"></textarea></label>
      </div>
      <button type="submit" class="primary-btn" [disabled]="submitting() || form.invalid">{{ submitting() ? 'Submitting...' : existingRestaurant() ? 'Resubmit restaurant' : 'Submit registration' }}</button>
    </form>
  `,
  styles: [`
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    .form-card { padding: 24px; }
    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    label span { display: block; font-weight: 600; margin-bottom: 8px; }
    input, textarea { width: 100%; border: 1px solid var(--qb-border); border-radius: 14px; padding: 12px 14px; }
    .full { grid-column: 1 / -1; }
    @media (max-width: 860px) { .form-grid { grid-template-columns: 1fr; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RestaurantRegistrationPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly existingRestaurant = signal<Restaurant | null>(null);
  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    cuisine: ['', Validators.required],
    address: ['', Validators.required],
    city: ['', Validators.required],
    latitude: [12.9716, Validators.required],
    longitude: [77.5946, Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+()\- ]{7,20}$/)]],
    deliveryRadius: [5, [Validators.required, Validators.min(1)]],
    minOrderAmount: [100, [Validators.required, Validators.min(0)]],
    estimatedDeliveryMin: [30, [Validators.required, Validators.min(1)]]
  });

  constructor() {
    const ownerId = this.authService.getCurrentUser()?.id;
    if (!ownerId) {
      return;
    }

    this.restaurantService.getMyRestaurant(ownerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurant) => {
          if (!restaurant) {
            return;
          }

          this.existingRestaurant.set(restaurant);
          this.form.patchValue({
            name: restaurant.name,
            description: restaurant.description ?? '',
            cuisine: restaurant.cuisine,
            address: restaurant.address,
            city: restaurant.city,
            latitude: restaurant.latitude,
            longitude: restaurant.longitude,
            phone: restaurant.phone,
            deliveryRadius: restaurant.deliveryRadius,
            minOrderAmount: restaurant.minOrderAmount,
            estimatedDeliveryMin: restaurant.estimatedDeliveryMin
          });
        }
      });
  }

  submit(): void {
    const ownerId = this.authService.getCurrentUser()?.id;
    if (!ownerId || this.form.invalid) {
      return;
    }

    this.submitting.set(true);
    this.restaurantService.registerRestaurant({ ownerId, ...this.form.getRawValue() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurant) => {
          this.existingRestaurant.set(restaurant);
          this.notificationService.success('Restaurant registration submitted.');
          this.submitting.set(false);
          this.router.navigate(['/restaurant-owner/dashboard']);
        },
        error: (error) => {
          this.notificationService.error(getErrorMessage(error));
          this.submitting.set(false);
        }
      });
  }
}
