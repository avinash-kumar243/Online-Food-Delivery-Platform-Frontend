import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationModalComponent, ModalConfig } from '../../components/shared/confirmation-modal.component';
import { LoaderComponent } from '../../components/shared/loader.component';
import { AdminUserRecord } from '../../models/app.models';
import { UserRole } from '../../models/auth.models';
import { AdminService } from '../../services/admin.service';
import { getErrorMessage } from '../../services/api.utils';
import { NotificationService } from '../../services/notification.service';

type UserFilter = 'ALL' | UserRole;
type UserAction = 'SUSPEND' | 'REACTIVATE' | 'DELETE';

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [CommonModule, LoaderComponent, ConfirmationModalComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Admin users</span>
        <h1>Manage customer, owner, partner, and admin access.</h1>
        <p class="dashboard-subtitle">Suspended users keep their account history but lose access to protected dashboard routes.</p>
      </div>
      <button type="button" class="secondary-btn" (click)="loadUsers()">Refresh</button>
    </section>

    <section class="pill-row dashboard-section">
      <button *ngFor="let option of filters" type="button" class="ghost-btn" [class.active-pill]="selectedFilter() === option.value" (click)="setFilter(option.value)">
        {{ option.label }}
      </button>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <section class="stack-list dashboard-section" *ngIf="!loading() && !error() && users().length; else empty">
      <article *ngFor="let user of users()" class="surface-card record-card">
        <div class="record-copy">
          <div class="record-heading">
            <div>
              <strong>{{ user.fullName }}</strong>
              <p>{{ user.email }}</p>
            </div>
            <span class="status-chip" [ngClass]="statusClass(user.status)">{{ user.status || (user.isActive ? 'ACTIVE' : 'INACTIVE') }}</span>
          </div>
          <div class="meta-list compact-meta">
            <div class="meta-row"><span>Role</span><strong>{{ user.role }}</strong></div>
            <div class="meta-row"><span>Phone</span><strong>{{ user.phone || 'Not provided' }}</strong></div>
            <div class="meta-row"><span>User ID</span><strong>#{{ user.id }}</strong></div>
          </div>
        </div>
        <div class="actions">
          <button
            *ngIf="user.status !== 'SUSPENDED'"
            type="button"
            class="ghost-btn"
            [disabled]="isProcessing(user)"
            (click)="openConfirmation('SUSPEND', user)">
            Suspend
          </button>
          <button
            *ngIf="user.status === 'SUSPENDED'"
            type="button"
            class="ghost-btn"
            [disabled]="isProcessing(user)"
            (click)="openConfirmation('REACTIVATE', user)">
            Reactivate
          </button>
          <button
            type="button"
            class="secondary-btn danger-btn"
            [disabled]="isProcessing(user)"
            (click)="openConfirmation('DELETE', user)">
            Delete
          </button>
        </div>
      </article>
    </section>

    <ng-template #empty>
      <section class="empty-state" *ngIf="!loading() && !error()">No users found for the selected role.</section>
    </ng-template>

    <app-confirmation-modal
      *ngIf="pendingConfirmation() as pending"
      [config]="pending.config"
      [submitting]="actionInProgress()"
      (cancel)="closeConfirmation()"
      (confirm)="confirmPendingAction($event)">
    </app-confirmation-modal>
  `,
  styles: [`
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    .active-pill { background: var(--qb-primary); color: #fff; }
    .record-card { padding: 22px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px; }
    .record-heading { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
    .record-heading p { margin-top: 6px; color: var(--qb-text-muted); }
    .compact-meta { margin-top: 18px; gap: 10px; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; align-content: start; justify-content: end; }
    .danger-btn { color: var(--qb-primary); }
    .actions button[disabled] { opacity: 0.6; cursor: not-allowed; }
    @media (max-width: 860px) {
      .record-card { grid-template-columns: 1fr; }
      .record-heading, .actions { flex-direction: column; align-items: stretch; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUsersPageComponent {
  private readonly adminService = inject(AdminService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly filters: Array<{ label: string; value: UserFilter }> = [
    { label: 'All users', value: 'ALL' },
    { label: 'Customers', value: 'CUSTOMER' },
    { label: 'Restaurant owners', value: 'RESTAURANT_OWNER' },
    { label: 'Delivery partners', value: 'DELIVERY_PARTNER' },
    { label: 'Admins', value: 'ADMIN' }
  ];
  readonly loading = signal(true);
  readonly error = signal('');
  readonly users = signal<AdminUserRecord[]>([]);
  readonly selectedFilter = signal<UserFilter>('ALL');
  readonly pendingConfirmation = signal<{ config: ModalConfig; user: AdminUserRecord } | null>(null);
  readonly actionInProgress = signal(false);
  readonly processingUserId = signal<number | null>(null);

  constructor() {
    this.loadUsers();
  }

  setFilter(filter: UserFilter): void {
    this.selectedFilter.set(filter);
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set('');

    const filter = this.selectedFilter();
    this.adminService.getUsers(filter === 'ALL' ? undefined : filter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.users.set(users);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  openConfirmation(action: UserAction, user: AdminUserRecord): void {
    this.pendingConfirmation.set({
      user,
      config: {
        action: this.actionLabel(action),
        role: this.roleTitle(user.role),
        userId: String(user.id)
      }
    });
  }

  closeConfirmation(): void {
    if (this.actionInProgress()) {
      return;
    }
    this.pendingConfirmation.set(null);
  }

  confirmPendingAction(config: ModalConfig): void {
    const pending = this.pendingConfirmation();
    if (!pending || this.actionInProgress() || pending.config.userId !== config.userId || pending.config.action !== config.action) {
      return;
    }

    this.actionInProgress.set(true);
    this.processingUserId.set(pending.user.id);

    this.actionRequest(this.modalActionToUserAction(config.action), pending.user)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(this.successMessage(this.modalActionToUserAction(config.action), pending.user));
          this.actionInProgress.set(false);
          this.processingUserId.set(null);
          this.pendingConfirmation.set(null);
          this.loadUsers();
        },
        error: (error) => {
          this.actionInProgress.set(false);
          this.processingUserId.set(null);
          this.notificationService.error(getErrorMessage(error));
        }
      });
  }

  isProcessing(user: AdminUserRecord): boolean {
    return this.processingUserId() === user.id;
  }

  statusClass(status?: string): string {
    if (status === 'ACTIVE') return 'status-green';
    if (status === 'SUSPENDED') return 'status-amber';
    if (status === 'DELETED') return 'status-red';
    return 'status-slate';
  }

  private actionRequest(action: UserAction, user: AdminUserRecord) {
    if (action === 'DELETE') {
      return this.adminService.deleteUser(user.id, user.role);
    }
    if (action === 'REACTIVATE') {
      return this.adminService.reactivateUser(user.id, user.role);
    }
    return this.adminService.suspendUser(user.id, user.role);
  }

  private successMessage(action: UserAction, user: AdminUserRecord): string {
    if (action === 'DELETE') {
      return `${user.fullName} deleted.`;
    }
    if (action === 'REACTIVATE') {
      return `${user.fullName} reactivated.`;
    }
    return `${user.fullName} suspended.`;
  }

  private roleTitle(role: UserRole): ModalConfig['role'] {
    switch (role) {
      case 'RESTAURANT_OWNER':
        return 'Restaurant Owner';
      case 'DELIVERY_PARTNER':
        return 'Delivery Partner';
      case 'ADMIN':
        return 'Admin';
      default:
        return 'Customer';
    }
  }

  private actionLabel(action: UserAction): ModalConfig['action'] {
    switch (action) {
      case 'DELETE':
        return 'Delete';
      case 'REACTIVATE':
        return 'Reactivate';
      default:
        return 'Suspend';
    }
  }

  private modalActionToUserAction(action: ModalConfig['action']): UserAction {
    switch (action) {
      case 'Delete':
        return 'DELETE';
      case 'Reactivate':
        return 'REACTIVATE';
      default:
        return 'SUSPEND';
    }
  }
}
