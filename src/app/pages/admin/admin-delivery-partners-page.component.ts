import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LoaderComponent } from '../../components/shared/loader.component';
import { AdminDeliveryPartnerRecord } from '../../models/app.models';
import { AdminService } from '../../services/admin.service';
import { getErrorMessage } from '../../services/api.utils';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

type DeliverySortKey = 'fullName' | 'email' | 'phone' | 'avgRating' | 'verificationStatus';

@Component({
  selector: 'app-admin-delivery-partners-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Admin delivery partners</span>
        <h1>{{ title() }}</h1>
        <p class="dashboard-subtitle">{{ subtitle() }}</p>
      </div>
      <button type="button" class="secondary-btn" (click)="load()">Refresh</button>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <ng-container *ngIf="!loading() && !error()">
      <section class="surface-card toolbar">
        <input type="search" [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)" placeholder="Search partners, email, phone, or vehicle" />
      </section>

      <section class="surface-card table-card" *ngIf="filteredPartners().length; else empty">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th><button type="button" (click)="setSort('fullName')">Partner</button></th>
                <th><button type="button" (click)="setSort('email')">Email</button></th>
                <th><button type="button" (click)="setSort('phone')">Phone</button></th>
                <th><button type="button" (click)="setSort('avgRating')">Avg Rating</button></th>
                <th>Status</th>
                <th><button type="button" (click)="setSort('verificationStatus')">Verification</button></th>
                <th>Total Deliveries</th>
                <th class="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let partner of filteredPartners()">
                <td>
                  <strong>{{ partner.fullName }}</strong>
                  <div class="cell-copy">{{ partner.vehicleType }} | {{ partner.vehicleNumber }}</div>
                </td>
                <td>{{ partner.email || 'Not available' }}</td>
                <td>{{ partner.phone }}</td>
                <td>{{ (partner.avgRating ?? 0).toFixed(1) }}</td>
                <td>{{ partner.isVerified && partner.isAvailable ? 'Online' : partner.isVerified ? 'Offline' : 'Pending Verification' }}</td>
                <td><span class="status-chip" [ngClass]="statusClass(partner.verificationStatus)">{{ partner.verificationStatus }}</span></td>
                <td>{{ partner.totalDeliveries ?? 0 }}</td>
                <td class="actions-col">
                  <div class="table-actions" *ngIf="partner.verificationStatus === 'PENDING'; else reviewInfo">
                    <button type="button" class="primary-btn" (click)="approve(partner)">Verify</button>
                    <button type="button" class="ghost-btn" (click)="startReject(partner)">Reject</button>
                  </div>
                  <ng-template #reviewInfo>
                    <span class="cell-copy" *ngIf="partner.rejectionReason">Feedback saved</span>
                  </ng-template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="surface-card modal-card" *ngIf="rejectingPartner() as partner">
        <div class="modal-header">
          <div>
            <strong>Reject {{ partner.fullName }}</strong>
            <p>Store feedback so the delivery partner can update and resubmit details.</p>
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
      <section class="empty-state">No delivery partners match this admin view.</section>
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
    table { width: 100%; border-collapse: collapse; min-width: 1060px; }
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
export class AdminDeliveryPartnersPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly adminService = inject(AdminService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pendingOnly = this.route.snapshot.data['pendingOnly'] === true;
  readonly title = computed(() => this.pendingOnly ? 'Verify pending delivery partner requests.' : 'Monitor all delivery partners across the platform.');
  readonly subtitle = computed(() => this.pendingOnly ? 'Only verified partners should be allowed online and eligible for order pickup.' : 'Search and sort partners by contact details, rating, and delivery status.');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly partners = signal<AdminDeliveryPartnerRecord[]>([]);
  readonly rejectingPartner = signal<AdminDeliveryPartnerRecord | null>(null);
  readonly sortKey = signal<DeliverySortKey>('fullName');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly filteredPartners = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const key = this.sortKey();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;

    return this.partners()
      .filter((partner) => {
        if (!term) return true;
        return [
          partner.fullName,
          partner.email,
          partner.phone,
          partner.vehicleType,
          partner.vehicleNumber
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

    const request = this.pendingOnly ? this.adminService.getPendingDeliveryPartners() : this.adminService.getAllDeliveryPartners();
    request
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (partners) => {
          this.partners.set(partners);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  setSort(key: DeliverySortKey): void {
    if (this.sortKey() === key) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }
    this.sortKey.set(key);
    this.sortDirection.set('asc');
  }

  approve(partner: AdminDeliveryPartnerRecord): void {
    const adminId = this.authService.getCurrentUser()?.id;
    if (!adminId) {
      this.notificationService.error('Unable to resolve the current admin session.');
      return;
    }

    this.adminService.approveDeliveryPartner(partner.agentId, adminId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(`${partner.fullName} verified.`);
          this.load();
        },
        error: (error) => this.notificationService.error(getErrorMessage(error))
      });
  }

  startReject(partner: AdminDeliveryPartnerRecord): void {
    this.rejectingPartner.set(partner);
    this.rejectionFeedback = partner.rejectionReason ?? '';
  }

  cancelReject(): void {
    this.rejectingPartner.set(null);
    this.rejectionFeedback = '';
  }

  reject(): void {
    const adminId = this.authService.getCurrentUser()?.id;
    const partner = this.rejectingPartner();
    if (!adminId || !partner || !this.rejectionFeedback.trim()) {
      return;
    }

    this.adminService.rejectDeliveryPartner(partner.agentId, adminId, this.rejectionFeedback.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(`${partner.fullName} rejected.`);
          this.cancelReject();
          this.load();
        },
        error: (error) => this.notificationService.error(getErrorMessage(error))
      });
  }

  statusClass(status: string): string {
    if (status === 'VERIFIED') return 'status-green';
    if (status === 'REJECTED') return 'status-red';
    return 'status-amber';
  }

  private sortValue(partner: AdminDeliveryPartnerRecord, key: DeliverySortKey): string {
    switch (key) {
      case 'fullName': return partner.fullName ?? '';
      case 'email': return partner.email ?? '';
      case 'phone': return partner.phone ?? '';
      case 'avgRating': return String(partner.avgRating ?? 0);
      case 'verificationStatus': return partner.verificationStatus ?? '';
    }
  }
}
