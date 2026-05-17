import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LoaderComponent } from '../../components/shared/loader.component';
import { AdminRestaurantRecord } from '../../models/app.models';
import { AdminService } from '../../services/admin.service';
import { getErrorMessage } from '../../services/api.utils';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

type RestaurantSortKey = 'restaurantName' | 'ownerEmail' | 'phone' | 'avgRating' | 'approvalStatus';

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

    <ng-container *ngIf="!loading() && !error()">
      <section class="surface-card toolbar">
        <input type="search" [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)" placeholder="Search restaurants, owner email, phone, or city" />
      </section>

      <section class="surface-card table-card" *ngIf="filteredRestaurants().length; else empty">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th><button type="button" (click)="setSort('restaurantName')">Restaurant</button></th>
                <th><button type="button" (click)="setSort('ownerEmail')">Owner Contact</button></th>
                <th><button type="button" (click)="setSort('phone')">Restaurant Phone</button></th>
                <th><button type="button" (click)="setSort('avgRating')">Avg Rating</button></th>
                <th>Status</th>
                <th><button type="button" (click)="setSort('approvalStatus')">Approval</button></th>
                <th class="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let restaurant of filteredRestaurants()">
                <td>
                  <strong>{{ restaurant.restaurantName }}</strong>
                  <div class="cell-copy">{{ restaurant.address }}, {{ restaurant.city }}</div>
                </td>
                <td>
                  <div>{{ restaurant.ownerName || ('Owner #' + restaurant.ownerId) }}</div>
                  <div class="cell-copy">{{ restaurant.ownerEmail || 'Not available' }}</div>
                </td>
                <td>{{ restaurant.phone }}</td>
                <td>{{ (restaurant.avgRating ?? 0).toFixed(1) }}</td>
                <td>{{ restaurant.isApproved && restaurant.isOpen ? 'Active' : 'Inactive' }}</td>
                <td><span class="status-chip" [ngClass]="statusClass(restaurant.approvalStatus)">{{ restaurant.approvalStatus }}</span></td>
                <td class="actions-col">
                  <div class="table-actions" *ngIf="restaurant.approvalStatus === 'PENDING'; else reviewInfo">
                    <button type="button" class="primary-btn" (click)="approve(restaurant)">Approve</button>
                    <button type="button" class="ghost-btn" (click)="startReject(restaurant)">Reject</button>
                  </div>
                  <ng-template #reviewInfo>
                    <span class="cell-copy" *ngIf="restaurant.rejectionReason">Feedback saved</span>
                  </ng-template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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
        <div class="modal-actions">
          <button type="button" class="secondary-btn" (click)="cancelReject()">Cancel</button>
          <button type="button" class="primary-btn" [disabled]="!rejectionFeedback.trim()" (click)="reject()">Submit rejection</button>
        </div>
      </section>
    </ng-container>

    <ng-template #empty>
      <section class="empty-state">No restaurants match this admin view.</section>
    </ng-template>
  `,
  styles: [`
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    .toolbar,
    .table-card,
    .modal-card { padding: 20px; }
    .toolbar input,
    textarea {
      width: 100%;
      border: 1px solid var(--qb-border);
      border-radius: 14px;
      padding: 12px 14px;
      background: #fff;
    }
    .table-wrap { overflow: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 980px; }
    th, td { padding: 14px 12px; border-bottom: 1px solid rgba(148, 163, 184, 0.18); text-align: left; vertical-align: top; }
    th button { border: 0; background: transparent; padding: 0; font-weight: 700; color: var(--qb-text); cursor: pointer; }
    .cell-copy { color: var(--qb-text-muted); margin-top: 4px; }
    .actions-col { width: 220px; }
    .table-actions,
    .modal-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .modal-header p { margin-top: 6px; color: var(--qb-text-muted); }
    .feedback-label span { display: block; margin-bottom: 8px; font-weight: 600; }
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
  readonly subtitle = computed(() => this.pendingOnly ? 'Approve or reject registration requests with persisted feedback.' : 'Search and sort restaurants by owner contact, rating, and approval state.');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly restaurants = signal<AdminRestaurantRecord[]>([]);
  readonly rejectingRestaurant = signal<AdminRestaurantRecord | null>(null);
  readonly sortKey = signal<RestaurantSortKey>('restaurantName');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly filteredRestaurants = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const key = this.sortKey();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;

    return this.restaurants()
      .filter((restaurant) => {
        if (!term) return true;
        return [
          restaurant.restaurantName,
          restaurant.ownerName,
          restaurant.ownerEmail,
          restaurant.phone,
          restaurant.city
        ].some((value) => (value ?? '').toLowerCase().includes(term));
      })
      .slice()
      .sort((left, right) => {
        const leftValue = this.sortValue(left, key);
        const rightValue = this.sortValue(right, key);
        return leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' }) * direction;
      });
  });
  readonly searchTerm = signal('');
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

  setSort(key: RestaurantSortKey): void {
    if (this.sortKey() === key) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }
    this.sortKey.set(key);
    this.sortDirection.set('asc');
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

  private sortValue(restaurant: AdminRestaurantRecord, key: RestaurantSortKey): string {
    switch (key) {
      case 'restaurantName': return restaurant.restaurantName ?? '';
      case 'ownerEmail': return restaurant.ownerEmail ?? '';
      case 'phone': return restaurant.phone ?? '';
      case 'avgRating': return String(restaurant.avgRating ?? 0);
      case 'approvalStatus': return restaurant.approvalStatus ?? '';
    }
  }
}
