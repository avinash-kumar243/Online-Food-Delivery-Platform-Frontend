import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoaderComponent } from '../../components/shared/loader.component';
import { RestaurantOwnerProfile } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-owner-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoaderComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Owner profile</span>
        <h1>Manage your account and business identity.</h1>
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
        <div class="summary-copy">
          <strong>{{ profile()?.email }}</strong>
          <p>{{ form.controls.fullName.value }}</p>
          <span class="badge-chip">Restaurant Owner</span>
        </div>
      </article>

      <article class="surface-card profile-form-card">
        <div class="form-intro">
          <h2>My restaurant profile</h2>
          <p>Update only the essential profile details below.</p>
        </div>

        <div class="form-grid">
          <label><span>Full name</span><input formControlName="fullName" /></label>
          <label><span>Phone number</span><input formControlName="phone" /></label>
          <label class="full"><span>Profile image URL</span><input formControlName="profilePicUrl" placeholder="https://example.com/profile.jpg" /></label>
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
      padding: 26px;
    }
    .profile-summary-card {
      display: grid;
      gap: 18px;
      align-content: start;
      text-align: center;
    }
    .summary-copy {
      display: grid;
      gap: 8px;
    }
    .summary-copy strong {
      font-size: 1.05rem;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }
    .summary-copy p {
      color: var(--qb-text-muted);
      font-size: 0.98rem;
    }
    .profile-avatar {
      width: 112px;
      height: 112px;
      margin: 0 auto;
      border-radius: 50%;
      overflow: hidden;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, var(--qb-primary), #11936f);
      color: #fff;
      font-size: 2rem;
      font-weight: 800;
    }
    .profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .form-intro {
      margin-bottom: 20px;
    }
    .form-intro h2 {
      margin-bottom: 8px;
      font-size: clamp(1.4rem, 2.5vw, 1.8rem);
      line-height: 1.1;
    }
    .form-intro p {
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
    .form-actions {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
    @media (max-width: 960px) {
      .profile-layout {
        grid-template-columns: 1fr;
      }
      .form-actions {
        justify-content: stretch;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OwnerProfilePageComponent {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly profile = signal<RestaurantOwnerProfile | null>(null);
  readonly form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    profilePicUrl: ['']
  });

  constructor() {
    const ownerId = this.authService.getCurrentUser()?.id;
    if (!ownerId) {
      this.error.set('Unable to resolve your owner session.');
      this.loading.set(false);
      return;
    }

    this.profileService.getRestaurantOwnerProfile(ownerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.form.patchValue({
            fullName: profile.fullName,
            phone: profile.phone,
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
    return this.form.controls.fullName.value.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'RO';
  }

  save(): void {
    const ownerId = this.authService.getCurrentUser()?.id;
    if (!ownerId || this.form.invalid) {
      return;
    }

    this.saving.set(true);
    const currentProfile = this.profile();
    this.profileService.updateRestaurantOwnerProfile(ownerId, {
      fullName: this.form.controls.fullName.value.trim(),
      phone: this.form.controls.phone.value.trim(),
      restaurantName: currentProfile?.restaurantName ?? '',
      restaurantAddress: currentProfile?.restaurantAddress ?? '',
      profilePicUrl: this.form.controls.profilePicUrl.value.trim()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.form.patchValue({
            fullName: profile.fullName,
            phone: profile.phone,
            profilePicUrl: profile.profilePicUrl ?? ''
          });
          this.authService.updateCurrentUserProfile({
            fullName: profile.fullName,
            email: profile.email,
            profilePicUrl: profile.profilePicUrl ?? null
          });
          this.notificationService.success('Owner profile updated.');
          this.saving.set(false);
        },
        error: (error) => {
          this.notificationService.error(getErrorMessage(error));
          this.saving.set(false);
        }
      });
  }
}
