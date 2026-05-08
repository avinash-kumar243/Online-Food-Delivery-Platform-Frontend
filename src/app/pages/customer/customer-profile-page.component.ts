import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoaderComponent } from '../../components/shared/loader.component';
import { CustomerProfile } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-customer-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoaderComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Customer profile</span>
        <h1>Review your account details.</h1>
        <p class="dashboard-subtitle">Email stays fixed. Your current backend profile supports profile image updates from this screen.</p>
      </div>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <form *ngIf="!loading() && !error() && profile()" class="profile-layout" [formGroup]="form" (ngSubmit)="save()">
      <article class="surface-card profile-summary-card">
        <div class="profile-avatar">
          <img *ngIf="previewImage(); else initialsFallback" [src]="previewImage()!" alt="" />
          <ng-template #initialsFallback>{{ initials() }}</ng-template>
        </div>
        <strong>{{ form.controls.fullName.value }}</strong>
        <p>Keep your customer details up to date for a smoother ordering experience.</p>
        <span class="badge-chip">Customer</span>
      </article>

      <article class="surface-card profile-form-card">
        <div class="form-grid">
          <label>
            <span>Full name</span>
            <input formControlName="fullName" placeholder="Enter your full name" />
            <small *ngIf="form.controls.fullName.invalid && form.controls.fullName.touched">Full name is required.</small>
          </label>
          <label>
            <span>Phone number</span>
            <input formControlName="phone" placeholder="Enter your phone number" inputmode="numeric" maxlength="10" />
            <small *ngIf="form.controls.phone.invalid && form.controls.phone.touched">Enter a valid 10-digit phone number.</small>
          </label>
          <label>
            <span>Profile image URL</span>
            <input formControlName="profilePicUrl" placeholder="https://example.com/profile.jpg" />
          </label>
        </div>

        <div class="form-actions">
          <button type="submit" class="primary-btn" [disabled]="saving() || form.invalid">{{ saving() ? 'Saving...' : 'Save changes' }}</button>
        </div>
      </article>
    </form>
  `,
  styles: [`
    .profile-layout {
      display: grid;
      grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
      gap: 18px;
    }
    .profile-summary-card,
    .profile-form-card {
      padding: 24px;
    }
    .profile-summary-card {
      display: grid;
      gap: 12px;
      align-content: start;
      text-align: center;
    }
    .profile-avatar {
      width: 96px;
      height: 96px;
      margin: 0 auto 4px;
      border-radius: 50%;
      overflow: hidden;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, var(--qb-primary), #11936f);
      color: #fff;
      font-size: 2rem;
      font-weight: 800;
    }
    .profile-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .profile-summary-card p {
      color: var(--qb-text-muted);
      line-height: 1.6;
    }
    .form-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 16px;
    }
    label span {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
    }
    label small {
      display: block;
      margin-top: 6px;
      color: var(--qb-danger);
      font-size: 0.85rem;
    }
    .form-actions {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
    @media (max-width: 960px) {
      .profile-layout,
      .form-grid {
        grid-template-columns: 1fr;
      }
      .form-actions {
        justify-content: stretch;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerProfilePageComponent {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly profile = signal<CustomerProfile | null>(null);
  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    profilePicUrl: ['', [Validators.maxLength(1000)]]
  });

  constructor() {
    const customerId = this.authService.getCurrentUser()?.id;
    if (!customerId) {
      this.error.set('Unable to resolve your customer session.');
      this.loading.set(false);
      return;
    }

    this.profileService.getCustomerProfile(customerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.form.patchValue({
            fullName: profile.fullName ?? '',
            phone: profile.phone ?? '',
            profilePicUrl: profile.profilePicUrl ?? ''
          });
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  previewImage(): string {
    return this.form.controls.profilePicUrl.value.trim();
  }

  initials(): string {
    return this.profile()?.fullName?.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'CU';
  }

  save(): void {
    const customerId = this.authService.getCurrentUser()?.id;
    if (!customerId || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.profileService.updateCustomerProfile(customerId, {
      fullName: this.form.controls.fullName.value.trim(),
      phone: this.form.controls.phone.value.trim(),
      profilePicUrl: this.form.controls.profilePicUrl.value.trim()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.form.patchValue({
            fullName: profile.fullName ?? '',
            phone: profile.phone ?? '',
            profilePicUrl: profile.profilePicUrl ?? ''
          });
          this.authService.updateCurrentUserProfile({
            fullName: profile.fullName,
            email: profile.email,
            profilePicUrl: profile.profilePicUrl ?? null
          });
          this.notificationService.success('Customer profile updated.');
          this.saving.set(false);
        },
        error: (error) => {
          this.notificationService.error(getErrorMessage(error));
          this.saving.set(false);
        }
      });
  }
}
