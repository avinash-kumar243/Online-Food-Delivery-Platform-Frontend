import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoaderComponent } from '../../components/shared/loader.component';
import { SuspensionBannerComponent } from '../../components/shared/suspension-banner.component';
import { DeliveryPartner } from '../../models/app.models';
import { AccountStatusService } from '../../services/account-status.service';
import { getErrorMessage } from '../../services/api.utils';
import { AuthService } from '../../services/auth.service';
import { DeliveryPartnerService } from '../../services/delivery-partner.service';
import { NotificationService } from '../../services/notification.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-delivery-partner-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LoaderComponent, SuspensionBannerComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Delivery partner</span>
        <h1>Stay online, accept trips, and close deliveries smoothly.</h1>
      </div>
      <a routerLink="/delivery-partner/register" class="secondary-btn" [class.disabled-link]="partnerSuspended()">Update profile</a>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <app-suspension-banner
      *ngIf="partnerSuspended()"
      class="dashboard-section"
      [message]="accountStatusService.getSuspensionBannerMessage()">
    </app-suspension-banner>

    <section class="surface-card hero-card" *ngIf="profile() as profile">
      <div>
        <span class="dashboard-kicker">{{ profile.status || 'PENDING_APPROVAL' }}</span>
        <h2>{{ profile.fullName }}</h2>
        <p class="dashboard-subtitle">{{ profile.vehicleType || 'Vehicle pending' }} - {{ profile.vehicleNumber || 'No registration yet' }}</p>
        <p class="dashboard-subtitle" *ngIf="profile.rejectionReason">Admin feedback: {{ profile.rejectionReason }}</p>
      </div>
      <div class="actions">
        <a routerLink="/delivery-partner/available-orders" class="primary-btn" [class.disabled-link]="partnerSuspended() || !profile.isVerified || !profile.isOnline">Available orders</a>
        <button type="button" class="ghost-btn" [disabled]="partnerSuspended() || !profile.isVerified" (click)="toggle(profile)">
          {{ profile.isOnline ? 'Go offline' : 'Go online' }}
        </button>
      </div>
    </section>

    <section *ngIf="!loading() && !profile() && !error()" class="empty-state">No delivery profile found yet. Register your vehicle and verification details to continue.</section>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>
  `,
  styles: [`
    .hero-card {
      padding: 24px;
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) auto;
      gap: 16px;
      align-items: center;
    }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; }
    .disabled-link { pointer-events: none; opacity: 0.6; }
    @media (max-width: 820px) {
      .hero-card {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryPartnerDashboardPageComponent {
  private readonly authService = inject(AuthService);
  private readonly deliveryService = inject(DeliveryPartnerService);
  private readonly profileService = inject(ProfileService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly accountStatusService = inject(AccountStatusService);

  readonly loading = signal(true);
  readonly profile = signal<DeliveryPartner | null>(null);
  readonly error = signal('');
  readonly partnerSuspended = signal(false);

  constructor() {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      this.loading.set(false);
      return;
    }

    this.profileService.getDeliveryPartnerProfile(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => this.partnerSuspended.set(this.accountStatusService.isSuspended(profile)),
        error: () => undefined
      });

    this.deliveryService.getMyDeliveryProfile(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  toggle(profile: DeliveryPartner): void {
    if (this.partnerSuspended()) {
      this.accountStatusService.notifySuspended();
      return;
    }
    this.deliveryService.updateOnlineStatus(profile.partnerId, !profile.isOnline)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.profile.set(updated);
          this.notificationService.success(`You are now ${updated.isOnline ? 'online' : 'offline'}.`);
        },
        error: (error) => this.notificationService.error(getErrorMessage(error))
      });
  }
}
