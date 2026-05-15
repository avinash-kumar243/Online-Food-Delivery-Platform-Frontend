import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { LoaderComponent } from '../../components/shared/loader.component';
import { AdminRestaurantRecord } from '../../models/app.models';
import { AdminService } from '../../services/admin.service';
import { getErrorMessage } from '../../services/api.utils';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-admin-restaurants-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Admin restaurants</span>
        <h1>{{ title() }}</h1>
        <p class="dashboard-subtitle">{{ subtitle() }}</p>
      </div>
      <button type="button" class="secondary-btn" (click)="load()">Refresh</button>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <section class="stack-list dashboard-section" *ngIf="!loading() && !error() && restaurants().length; else empty">
      <article *ngFor="let restaurant of restaurants()" class="surface-card record-card">
        <div class="record-copy">
          <div class="record-heading">
            <div>
              <strong>{{ restaurant.restaurantName }}</strong>
              <p>{{ restaurant.cuisine }} - {{ restaurant.city }}</p>
            </div>
            <span class="status-chip" [ngClass]="statusClass(restaurant.approvalStatus)">{{ restaurant.approvalStatus }}</span>
          </div>
          <div class="meta-list compact-meta">
            <div class="meta-row"><span>Owner</span><strong>{{ restaurant.ownerName || 'Owner #' + restaurant.ownerId }}</strong></div>
            <div class="meta-row"><span>Owner email</span><strong>{{ restaurant.ownerEmail || 'Not available' }}</strong></div>
            <div class="meta-row"><span>Phone</span><strong>{{ restaurant.phone }}</strong></div>
            <div class="meta-row"><span>Address</span><strong>{{ restaurant.address }}</strong></div>
            <div class="meta-row"><span>Submitted</span><strong>{{ restaurant.submittedAt || 'Not available' }}</strong></div>
            <div class="meta-row"><span>Open status</span><strong>{{ restaurant.isOpen ? 'Open' : 'Closed' }}</strong></div>
          </div>
          <section *ngIf="restaurant.rejectionReason" class="feedback-box">Feedback: {{ restaurant.rejectionReason }}</section>
        </div>

        <div class="actions" *ngIf="restaurant.approvalStatus === 'PENDING'">
          <button type="button" class="primary-btn" (click)="approve(restaurant)">Approve</button>
          <button type="button" class="ghost-btn" (click)="startReject(restaurant)">Reject</button>
        </div>
      </article>
    </section>

    <section class="surface-card modal-card" *ngIf="rejectingRestaurant() as restaurant">
      <div class="modal-header">
        <div>
          <strong>Reject {{ restaurant.restaurantName }}</strong>
          <p>Store feedback so the owner can resubmit with corrections.</p>
        </div>
      </div>
      <label class="feedback-label">
        <span>Admin feedback</span>
        <textarea rows="4" [(ngModel)]="rejectionFeedback"></textarea>
      </label>
      <div class="actions">
        <button type="button" class="secondary-btn" (click)="cancelReject()">Cancel</button>
        <button type="button" class="primary-btn" [disabled]="!rejectionFeedback.trim()" (click)="reject()">Submit rejection</button>
      </div>
    </section>

    <ng-template #empty>
      <section class="empty-state" *ngIf="!loading() && !error()">No restaurants match this admin view.</section>
    </ng-template>
  `,
  styles: [`
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    .record-card { padding: 22px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px; }
    .record-heading { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
    .record-heading p { margin-top: 6px; color: var(--qb-text-muted); }
    .compact-meta { margin-top: 18px; gap: 10px; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; align-content: start; justify-content: end; }
    .feedback-box { margin-top: 18px; padding: 14px 16px; border-radius: 14px; background: var(--qb-primary-soft); color: var(--qb-text); }
    .modal-card { margin-top: 20px; padding: 22px; display: grid; gap: 16px; }
    .modal-header p { margin-top: 6px; color: var(--qb-text-muted); }
    .feedback-label span { display: block; margin-bottom: 8px; font-weight: 600; }
    textarea { width: 100%; border: 1px solid var(--qb-border); border-radius: 14px; padding: 12px 14px; resize: vertical; }
    @media (max-width: 860px) {
      .record-card { grid-template-columns: 1fr; }
      .record-heading, .actions { flex-direction: column; align-items: stretch; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminRestaurantsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly adminService = inject(AdminService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pendingOnly = this.route.snapshot.data['pendingOnly'] === true;
  readonly title = computed(() => this.pendingOnly ? 'Review pending restaurant approval requests.' : 'Monitor every restaurant registered on the platform.');
  readonly subtitle = computed(() => this.pendingOnly ? 'Approve or reject registration requests with persisted feedback.' : 'Pending, approved, and rejected restaurants are all visible here.');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly restaurants = signal<AdminRestaurantRecord[]>([]);
  readonly rejectingRestaurant = signal<AdminRestaurantRecord | null>(null);
  rejectionFeedback = '';

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    const request = this.pendingOnly ? this.adminService.getPendingRestaurants() : this.adminService.getAllRestaurants();
    request
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurants) => {
          this.restaurants.set(restaurants);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  approve(restaurant: AdminRestaurantRecord): void {
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

  startReject(restaurant: AdminRestaurantRecord): void {
    this.rejectingRestaurant.set(restaurant);
    this.rejectionFeedback = restaurant.rejectionReason ?? '';
  }

  cancelReject(): void {
    this.rejectingRestaurant.set(null);
    this.rejectionFeedback = '';
  }

  reject(): void {
    const adminId = this.authService.getCurrentUser()?.id;
    const restaurant = this.rejectingRestaurant();
    if (!adminId || !restaurant || !this.rejectionFeedback.trim()) {
      return;
    }

    this.adminService.rejectRestaurant(restaurant.restaurantId, adminId, this.rejectionFeedback.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(`${restaurant.restaurantName} rejected.`);
          this.cancelReject();
          this.load();
        },
        error: (error) => this.notificationService.error(getErrorMessage(error))
      });
  }

  statusClass(status: string): string {
    if (status === 'APPROVED') return 'status-green';
    if (status === 'REJECTED') return 'status-red';
    return 'status-amber';
  }
}
