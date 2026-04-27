import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { DeliveryPartnerService } from '../../services/delivery-partner.service';
import { NotificationService } from '../../services/notification.service';
import { getErrorMessage } from '../../services/api.utils';

@Component({
  selector: 'app-delivery-registration-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="section-header"><div><span class="dashboard-kicker">Registration</span><h1>Complete your delivery partner profile.</h1></div></section>
    <form class="surface-card form-card" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-grid">
        <label><span>Vehicle type</span><input formControlName="vehicleType" /></label>
        <label><span>Vehicle number</span><input formControlName="vehicleNumber" /></label>
        <label><span>License number</span><input formControlName="licenseNumber" /></label>
        <label><span>Address</span><input formControlName="address" /></label>
      </div>
      <button type="submit" class="primary-btn" [disabled]="submitting() || form.invalid">{{ submitting() ? 'Submitting...' : 'Submit profile' }}</button>
    </form>
  `,
  styles: [`.form-card{padding:24px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px} label span{display:block;font-weight:600;margin-bottom:8px} input{width:100%;border:1px solid var(--qb-border);border-radius:14px;padding:12px 14px}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryRegistrationPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly deliveryService = inject(DeliveryPartnerService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitting = signal(false);
  readonly form = this.fb.nonNullable.group({
    vehicleType: ['', Validators.required],
    vehicleNumber: ['', Validators.required],
    licenseNumber: ['', Validators.required],
    address: ['']
  });

  submit(): void {
    const partnerId = this.authService.getCurrentUser()?.id;
    if (!partnerId || this.form.invalid) return;
    this.submitting.set(true);
    this.deliveryService.registerDeliveryPartner({ partnerId, ...this.form.getRawValue() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Delivery partner profile submitted.');
          this.submitting.set(false);
        },
        error: (error) => {
          this.notificationService.error(getErrorMessage(error));
          this.submitting.set(false);
        }
      });
  }
}
