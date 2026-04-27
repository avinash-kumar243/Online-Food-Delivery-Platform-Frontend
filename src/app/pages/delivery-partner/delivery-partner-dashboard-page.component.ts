import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { DeliveryPartnerService } from '../../services/delivery-partner.service';
import { NotificationService } from '../../services/notification.service';
import { DeliveryPartner } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';

@Component({
  selector: 'app-delivery-partner-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Delivery partner</span>
        <h1>Stay online, accept trips, and close deliveries smoothly.</h1>
      </div>
      <a routerLink="/delivery-partner/available-orders" class="primary-btn">Available orders</a>
    </section>

    <section class="surface-card hero-card" *ngIf="profile() as profile">
      <div>
        <span class="dashboard-kicker">{{ profile.isVerified ? 'APPROVED' : 'PENDING_APPROVAL' }}</span>
        <h2>{{ profile.fullName }}</h2>
        <p class="dashboard-subtitle">{{ profile.vehicleType || 'Vehicle pending' }} • {{ profile.vehicleNumber || 'No registration yet' }}</p>
      </div>
      <button type="button" class="ghost-btn" [disabled]="!profile.isVerified" (click)="toggle(profile)">{{ profile.isOnline ? 'Go offline' : 'Go online' }}</button>
    </section>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>
  `,
  styles: [`.hero-card{padding:24px}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryPartnerDashboardPageComponent {
  private readonly authService = inject(AuthService);
  private readonly deliveryService = inject(DeliveryPartnerService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = signal<DeliveryPartner | null>(null);
  readonly error = signal('');

  constructor() {
    const partnerId = this.authService.getCurrentUser()?.id;
    if (!partnerId) return;
    this.deliveryService.getMyDeliveryProfile(partnerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (profile) => this.profile.set(profile), error: (error) => this.error.set(getErrorMessage(error)) });
  }

  toggle(profile: DeliveryPartner): void {
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
