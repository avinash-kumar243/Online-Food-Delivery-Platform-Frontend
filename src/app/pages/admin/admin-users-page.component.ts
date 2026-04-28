import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoaderComponent } from '../../components/shared/loader.component';
import { AdminUserRecord } from '../../models/app.models';
import { UserRole } from '../../models/auth.models';
import { AdminService } from '../../services/admin.service';
import { getErrorMessage } from '../../services/api.utils';
import { NotificationService } from '../../services/notification.service';

type UserFilter = 'ALL' | UserRole;

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [CommonModule, LoaderComponent],
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
          <button *ngIf="user.status !== 'SUSPENDED'" type="button" class="ghost-btn" (click)="suspend(user)">Suspend</button>
          <button *ngIf="user.status === 'SUSPENDED'" type="button" class="ghost-btn" (click)="reactivate(user)">Reactivate</button>
          <button type="button" class="secondary-btn danger-btn" (click)="remove(user)">Delete</button>
        </div>
      </article>
    </section>

    <ng-template #empty>
      <section class="empty-state" *ngIf="!loading() && !error()">No users found for the selected role.</section>
    </ng-template>
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

  suspend(user: AdminUserRecord): void {
    this.adminService.suspendUser(user.id, user.role)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(`${user.fullName} suspended.`);
          this.loadUsers();
        },
        error: (error) => this.notificationService.error(getErrorMessage(error))
      });
  }

  reactivate(user: AdminUserRecord): void {
    this.adminService.reactivateUser(user.id, user.role)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(`${user.fullName} reactivated.`);
          this.loadUsers();
        },
        error: (error) => this.notificationService.error(getErrorMessage(error))
      });
  }

  remove(user: AdminUserRecord): void {
    if (!window.confirm(`Delete ${user.fullName} (${user.role})? This action cannot be undone.`)) {
      return;
    }

    this.adminService.deleteUser(user.id, user.role)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(`${user.fullName} deleted.`);
          this.loadUsers();
        },
        error: (error) => this.notificationService.error(getErrorMessage(error))
      });
  }

  statusClass(status?: string): string {
    if (status === 'ACTIVE') return 'status-green';
    if (status === 'SUSPENDED') return 'status-amber';
    if (status === 'DELETED') return 'status-red';
    return 'status-slate';
  }
}
