import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { LoaderComponent } from '../../components/shared/loader.component';
import { AdminDeliveryPartnerRecord } from '../../models/app.models';
import { AdminService } from '../../services/admin.service';
import { getErrorMessage } from '../../services/api.utils';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

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

    <section class="stack-list dashboard-section" *ngIf="!loading() && !error() && partners().length; else empty">
      <article *ngFor="let partner of partners()" class="surface-card record-card">
        <div class="record-copy">
          <div class="record-heading">
            <div>
              <strong>{{ partner.fullName }}</strong>
              <p>{{ partner.vehicleType }} - {{ partner.vehicleNumber }}</p>
            </div>
            <span class="status-chip" [ngClass]="statusClass(partner.verificationStatus)">{{ partner.verificationStatus }}</span>
          </div>
          <div class="meta-list compact-meta">
            <div class="meta-row"><span>Email</span><strong>{{ partner.email || 'Not available' }}</strong></div>
            <div class="meta-row"><span>Phone</span><strong>{{ partner.phone }}</strong></div>
            <div class="meta-row"><span>Availability</span><strong>{{ partner.isAvailable ? 'Online' : 'Offline' }}</strong></div>
            <div class="meta-row"><span>Submitted</span><strong>{{ partner.submittedAt || 'Not available' }}</strong></div>
            <div class="meta-row"><span>User ID</span><strong>#{{ partner.userId }}</strong></div>
          </div>
          <section *ngIf="partner.rejectionReason" class="feedback-box">Feedback: {{ partner.rejectionReason }}</section>
        </div>

        <div class="actions" *ngIf="partner.verificationStatus === 'PENDING'">
          <button type="button" class="primary-btn" (click)="approve(partner)">Verify</button>
          <button type="button" class="ghost-btn" (click)="startReject(partner)">Reject</button>
        </div>
      </article>
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
      <div class="actions">
        <button type="button" class="secondary-btn" (click)="cancelReject()">Cancel</button>
        <button type="button" class="primary-btn" [disabled]="!rejectionFeedback.trim()" (click)="reject()">Submit rejection</button>
      </div>
    </section>

    <ng-template #empty>
      <section class="empty-state" *ngIf="!loading() && !error()">No delivery partners match this admin view.</section>
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
export class AdminDeliveryPartnersPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly adminService = inject(AdminService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pendingOnly = this.route.snapshot.data['pendingOnly'] === true;
  readonly title = computed(() => this.pendingOnly ? 'Verify pending delivery partner requests.' : 'Monitor all delivery partners across the platform.');
  readonly subtitle = computed(() => this.pendingOnly ? 'Only verified partners should be allowed online and eligible for order pickup.' : 'Pending, verified, and rejected partner registrations are all visible here.');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly partners = signal<AdminDeliveryPartnerRecord[]>([]);
  readonly rejectingPartner = signal<AdminDeliveryPartnerRecord | null>(null);
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
}
