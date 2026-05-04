import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { LoaderComponent } from '../../components/shared/loader.component';
import { AdminDeliveryPartnerRecord, AdminRestaurantRecord, DashboardStats } from '../../models/app.models';
import { AdminService } from '../../services/admin.service';
import { getErrorMessage } from '../../services/api.utils';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { RealtimeService } from '../../services/realtime.service';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Admin dashboard</span>
        <h1>Platform-wide operational visibility.</h1>
        <p class="dashboard-subtitle">Approvals, order volume, and payments are loaded from the live gateway-backed admin APIs.</p>
      </div>
      <button type="button" class="secondary-btn" (click)="load()">Refresh</button>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <ng-container *ngIf="!loading() && !error()">
      <section class="stats-grid" *ngIf="stats() as stats">
        <article class="surface-card stat-card"><div class="value">{{ stats.totalCustomers || 0 }}</div><p class="helper">Customers</p></article>
        <article class="surface-card stat-card"><div class="value">{{ stats.totalRestaurantOwners || 0 }}</div><p class="helper">Restaurant owners</p></article>
        <article class="surface-card stat-card"><div class="value">{{ stats.totalDeliveryPartners || 0 }}</div><p class="helper">Delivery partners</p></article>
        <article class="surface-card stat-card"><div class="value">{{ stats.totalRestaurants || 0 }}</div><p class="helper">Restaurants</p></article>
        <article class="surface-card stat-card"><div class="value">{{ stats.pendingRestaurantApprovals || 0 }}</div><p class="helper">Pending restaurant approvals</p></article>
        <article class="surface-card stat-card"><div class="value">{{ stats.pendingDeliveryPartnerApprovals || 0 }}</div><p class="helper">Pending delivery verifications</p></article>
        <article class="surface-card stat-card"><div class="value">{{ stats.totalOrders || 0 }}</div><p class="helper">Orders</p></article>
        <article class="surface-card stat-card"><div class="value">{{ stats.pendingOrders || 0 }}</div><p class="helper">Orders in progress</p></article>
        <article class="surface-card stat-card"><div class="value">{{ stats.completedOrders || 0 }}</div><p class="helper">Delivered orders</p></article>
        <article class="surface-card stat-card"><div class="value">Rs {{ (stats.totalRevenue || 0).toFixed(2) }}</div><p class="helper">Revenue</p></article>
      </section>

      <section class="split-layout dashboard-section">
        <article class="surface-card panel-card">
          <div class="panel-header">
            <div>
              <strong>Pending restaurant approvals</strong>
              <p>{{ pendingRestaurants().length }} awaiting admin review</p>
            </div>
          </div>

          <section class="stack-list" *ngIf="pendingRestaurants().length; else noPendingRestaurants">
            <article *ngFor="let restaurant of pendingRestaurants()" class="mini-card">
              <div>
                <strong>{{ restaurant.restaurantName }}</strong>
                <p>{{ restaurant.cuisine }} - {{ restaurant.city }}</p>
                <p>Owner: {{ restaurant.ownerName || ('Owner #' + restaurant.ownerId) }}</p>
              </div>
              <div class="actions">
                <button type="button" class="primary-btn" (click)="approveRestaurant(restaurant)">Approve</button>
                <button type="button" class="ghost-btn" (click)="startRejectRestaurant(restaurant)">Reject</button>
              </div>
            </article>
          </section>
        </article>

        <article class="surface-card panel-card">
          <div class="panel-header">
            <div>
              <strong>Pending delivery verification</strong>
              <p>{{ pendingAgents().length }} awaiting admin review</p>
            </div>
          </div>

          <section class="stack-list" *ngIf="pendingAgents().length; else noPendingAgents">
            <article *ngFor="let agent of pendingAgents()" class="mini-card">
              <div>
                <strong>{{ agent.fullName }}</strong>
                <p>{{ agent.vehicleType }} - {{ agent.vehicleNumber }}</p>
                <p>{{ agent.phone }}</p>
              </div>
              <div class="actions">
                <button type="button" class="primary-btn" (click)="approveAgent(agent)">Verify</button>
                <button type="button" class="ghost-btn" (click)="startRejectAgent(agent)">Reject</button>
              </div>
            </article>
          </section>
        </article>
      </section>

      <section class="surface-card modal-card" *ngIf="rejectionTarget() as target">
        <div>
          <strong>{{ target.kind === 'restaurant' ? 'Reject restaurant request' : 'Reject delivery partner request' }}</strong>
          <p class="modal-copy">{{ target.label }}</p>
        </div>
        <label class="feedback-label">
          <span>Admin feedback</span>
          <textarea rows="4" [(ngModel)]="rejectionFeedback"></textarea>
        </label>
        <div class="actions">
          <button type="button" class="secondary-btn" (click)="cancelReject()">Cancel</button>
          <button type="button" class="primary-btn" [disabled]="!rejectionFeedback.trim()" (click)="submitReject()">Submit rejection</button>
        </div>
      </section>
    </ng-container>

    <ng-template #noPendingRestaurants>
      <section class="empty-state">No restaurant approvals are pending right now.</section>
    </ng-template>

    <ng-template #noPendingAgents>
      <section class="empty-state">No delivery partner verifications are pending right now.</section>
    </ng-template>
  `,
  styles: [`
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    .stat-card, .panel-card, .modal-card { padding: 24px; }
    .panel-header p, .modal-copy { margin-top: 6px; color: var(--qb-text-muted); }
    .mini-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; padding: 18px; border: 1px solid var(--qb-border); border-radius: 18px; }
    .mini-card p { margin-top: 6px; color: var(--qb-text-muted); }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .feedback-label span { display: block; margin-bottom: 8px; font-weight: 600; }
    textarea { width: 100%; border: 1px solid var(--qb-border); border-radius: 14px; padding: 12px 14px; resize: vertical; }
    .modal-card { margin-top: 24px; display: grid; gap: 16px; }
    @media (max-width: 860px) {
      .mini-card { grid-template-columns: 1fr; }
      .actions { align-items: stretch; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardPageComponent {
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly stats = signal<DashboardStats | null>(null);
  readonly pendingRestaurants = signal<AdminRestaurantRecord[]>([]);
  readonly pendingAgents = signal<AdminDeliveryPartnerRecord[]>([]);
  readonly rejectionTarget = signal<{ kind: 'restaurant' | 'agent'; id: number; label: string } | null>(null);
  readonly error = signal('');
  rejectionFeedback = '';

  constructor() {
    this.load();
    this.realtimeService.orderEvents$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
    this.realtimeService.paymentEvents$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      stats: this.adminService.getDashboardStats(),
      pendingRestaurants: this.adminService.getPendingRestaurants(),
      pendingAgents: this.adminService.getPendingDeliveryPartners()
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ stats, pendingRestaurants, pendingAgents }) => {
          this.stats.set(stats);
          this.pendingRestaurants.set(pendingRestaurants);
          this.pendingAgents.set(pendingAgents);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  approveRestaurant(restaurant: AdminRestaurantRecord): void {
    const adminId = this.authService.getCurrentUser()?.id;
    if (!adminId) {
      this.notificationService.error('Unable to resolve the current admin session.');
      return;
    }

    this.adminService.approveRestaurant(restaurant.restaurantId, adminId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(`${restaurant.restaurantName} approved.`);
          this.load();
        },
        error: (error) => this.notificationService.error(getErrorMessage(error))
      });
  }

  approveAgent(agent: AdminDeliveryPartnerRecord): void {
    const adminId = this.authService.getCurrentUser()?.id;
    if (!adminId) {
      this.notificationService.error('Unable to resolve the current admin session.');
      return;
    }

    this.adminService.approveDeliveryPartner(agent.agentId, adminId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(`${agent.fullName} verified.`);
          this.load();
        },
        error: (error) => this.notificationService.error(getErrorMessage(error))
      });
  }

  startRejectRestaurant(restaurant: AdminRestaurantRecord): void {
    this.rejectionTarget.set({ kind: 'restaurant', id: restaurant.restaurantId, label: restaurant.restaurantName });
    this.rejectionFeedback = restaurant.rejectionReason ?? '';
  }

  startRejectAgent(agent: AdminDeliveryPartnerRecord): void {
    this.rejectionTarget.set({ kind: 'agent', id: agent.agentId, label: agent.fullName });
    this.rejectionFeedback = agent.rejectionReason ?? '';
  }

  cancelReject(): void {
    this.rejectionTarget.set(null);
    this.rejectionFeedback = '';
  }

  submitReject(): void {
    const adminId = this.authService.getCurrentUser()?.id;
    const target = this.rejectionTarget();
    if (!adminId || !target || !this.rejectionFeedback.trim()) {
      return;
    }

    const request = target.kind === 'restaurant'
      ? this.adminService.rejectRestaurant(target.id, adminId, this.rejectionFeedback.trim())
      : this.adminService.rejectDeliveryPartner(target.id, adminId, this.rejectionFeedback.trim());

    request
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(`${target.label} rejected.`);
          this.cancelReject();
          this.load();
        },
        error: (error) => this.notificationService.error(getErrorMessage(error))
      });
  }
}
