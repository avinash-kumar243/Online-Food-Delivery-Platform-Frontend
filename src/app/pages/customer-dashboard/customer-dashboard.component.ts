import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DashboardHeaderComponent } from '../../components/dashboard-header/dashboard-header.component';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-customer-dashboard-page',
  standalone: true,
  imports: [CommonModule, DashboardHeaderComponent],
  templateUrl: './customer-dashboard.component.html',
  styleUrl: './customer-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerDashboardComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);

  readonly selectedFilter = signal('Cuisine');
  readonly dashboard$ = this.dashboardService.getCustomerDashboard(this.authService.getCurrentUser());

  setFilter(filter: string): void {
    this.selectedFilter.set(filter);
  }

  walletTypeClass(type: 'CREDIT' | 'DEBIT'): string {
    return type === 'CREDIT' ? 'status-chip status-green' : 'status-chip status-red';
  }

  historyStatusClass(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized.includes('deliver')) return 'status-chip status-green';
    if (normalized.includes('prepar') || normalized.includes('confirm')) return 'status-chip status-amber';
    if (normalized.includes('cancel')) return 'status-chip status-red';
    return 'status-chip status-slate';
  }

  feedbackRatingLabel(rating: number): string {
    return rating > 0 ? rating.toFixed(1) : 'Pending';
  }
}
