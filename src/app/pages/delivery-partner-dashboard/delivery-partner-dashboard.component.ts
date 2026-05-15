import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Subject, startWith, switchMap, tap } from 'rxjs';
import { DashboardHeaderComponent } from '../../components/dashboard-header/dashboard-header.component';
import { DeliveryPartnerDashboardData, VerificationStatus } from '../../models/dashboard.model';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-delivery-partner-dashboard-page',
  standalone: true,
  imports: [CommonModule, DashboardHeaderComponent],
  templateUrl: './delivery-partner-dashboard.component.html',
  styleUrl: './delivery-partner-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryPartnerDashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly refreshTrigger = new Subject<void>();

  readonly isOnline = signal(true);
  readonly isUpdatingAvailability = signal(false);
  readonly latestDashboard = signal<DeliveryPartnerDashboardData | null>(null);
  readonly dashboard$ = this.refreshTrigger.pipe(
    startWith(void 0),
    switchMap(() => this.dashboardService.getDeliveryPartnerDashboard(this.authService.getCurrentUser())),
    tap((dashboard) => {
      this.latestDashboard.set(dashboard);
      this.isOnline.set(dashboard.isOnline);
    })
  );

  toggleAvailability(): void {
    const partnerId = this.latestDashboard()?.user.id ?? this.authService.getCurrentUser()?.id;
    if (!partnerId || this.isUpdatingAvailability()) {
      return;
    }

    const nextAvailability = !this.isOnline();
    this.isUpdatingAvailability.set(true);
    this.dashboardService.updateDeliveryPartnerAvailability(partnerId, nextAvailability).subscribe({
      next: (isOnline) => {
        this.isOnline.set(isOnline);
        this.isUpdatingAvailability.set(false);
        this.refreshTrigger.next();
      },
      error: () => {
        this.isUpdatingAvailability.set(false);
      }
    });
  }

  verificationClass(status: VerificationStatus): string {
    if (status === 'VERIFIED') return 'status-chip status-green';
    if (status === 'PENDING_VERIFICATION') return 'status-chip status-amber';
    return 'status-chip status-red';
  }

  assignmentClass(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized.includes('assigned')) return 'status-chip status-red';
    if (normalized.includes('way') || normalized.includes('pick')) return 'status-chip status-amber';
    if (normalized.includes('deliver')) return 'status-chip status-green';
    return 'status-chip status-slate';
  }
}
