import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardStats } from '../../models/app.models';
import { AdminService } from '../../services/admin.service';
import { getErrorMessage } from '../../services/api.utils';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="section-header"><div><span class="dashboard-kicker">Admin dashboard</span><h1>Platform-wide operational visibility.</h1></div></section>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>
    <section class="stats-grid" *ngIf="stats() as stats">
      <article class="surface-card stat-card"><div class="value">{{ stats.totalOrders || 0 }}</div><p class="helper">Orders</p></article>
      <article class="surface-card stat-card"><div class="value">{{ stats.totalRestaurants || 0 }}</div><p class="helper">Restaurants</p></article>
      <article class="surface-card stat-card"><div class="value">{{ stats.totalPayments || 0 }}</div><p class="helper">Payments</p></article>
      <article class="surface-card stat-card"><div class="value">Rs {{ (stats.totalRevenue || 0).toFixed(2) }}</div><p class="helper">Revenue</p></article>
    </section>
  `,
  styles: [`.stat-card{padding:24px}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardPageComponent {
  private readonly adminService = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);
  readonly stats = signal<DashboardStats | null>(null);
  readonly error = signal('');

  constructor() {
    this.adminService.getDashboardStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (stats) => this.stats.set(stats), error: (error) => this.error.set(getErrorMessage(error)) });
  }
}
