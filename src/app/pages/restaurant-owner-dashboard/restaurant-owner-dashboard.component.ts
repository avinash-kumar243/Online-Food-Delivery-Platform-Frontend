import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Subject, startWith, switchMap, tap } from 'rxjs';
import { DashboardHeaderComponent } from '../../components/dashboard-header/dashboard-header.component';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { ApprovalStatus, RestaurantOwnerDashboardData } from '../../models/dashboard.model';

@Component({
  selector: 'app-restaurant-owner-dashboard-page',
  standalone: true,
  imports: [CommonModule, DashboardHeaderComponent],
  templateUrl: './restaurant-owner-dashboard.component.html',
  styleUrl: './restaurant-owner-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RestaurantOwnerDashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly refreshTrigger = new Subject<void>();

  readonly isRestaurantOpen = signal(true);
  readonly isUpdatingStatus = signal(false);
  readonly latestDashboard = signal<RestaurantOwnerDashboardData | null>(null);
  readonly dashboard$ = this.refreshTrigger.pipe(
    startWith(void 0),
    switchMap(() => this.dashboardService.getRestaurantOwnerDashboard(this.authService.getCurrentUser())),
    tap((dashboard) => {
      this.latestDashboard.set(dashboard);
      this.isRestaurantOpen.set(dashboard.restaurantProfile.isOpen);
    })
  );

  toggleRestaurantStatus(): void {
    const dashboard = this.latestDashboard();
    const restaurantId = dashboard?.restaurantProfile.id;

    if (!restaurantId || this.isUpdatingStatus()) {
      return;
    }

    const nextOpenState = !this.isRestaurantOpen();
    this.isUpdatingStatus.set(true);
    this.dashboardService.updateRestaurantStatus(restaurantId, nextOpenState).subscribe({
      next: (open) => {
        this.isRestaurantOpen.set(open);
        this.isUpdatingStatus.set(false);
        this.refreshTrigger.next();
      },
      error: () => {
        this.isUpdatingStatus.set(false);
      }
    });
  }

  approvalClass(status: ApprovalStatus): string {
    if (status === 'APPROVED') return 'status-chip status-green';
    if (status === 'PENDING_APPROVAL') return 'status-chip status-amber';
    return 'status-chip status-red';
  }

  orderStatusClass(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized.includes('new')) return 'status-chip status-red';
    if (normalized.includes('accept') || normalized.includes('prepar')) return 'status-chip status-amber';
    if (normalized.includes('ready')) return 'status-chip status-green';
    return 'status-chip status-slate';
  }
}
