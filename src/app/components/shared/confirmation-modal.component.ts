import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface ModalConfig {
  action: 'Suspend' | 'Reactivate' | 'Delete';
  role: 'Customer' | 'Delivery Partner' | 'Restaurant Owner' | 'Admin';
  userId: string;
}

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="confirmation-backdrop" (click)="cancel.emit()">
      <article class="confirmation-card surface-card" (click)="$event.stopPropagation()">
        <div class="confirmation-header">
          <div class="confirmation-copy">
            <span class="dashboard-kicker">{{ title }}</span>
            <h2>{{ title }}</h2>
          </div>
          <button type="button" class="ghost-btn compact-btn" (click)="cancel.emit()">Close</button>
        </div>

        <p class="confirmation-message">{{ message }}</p>

        <div class="actions">
          <button
            type="button"
            class="secondary-btn cancel-btn"
            [disabled]="submitting"
            (click)="cancel.emit()"
          >
            Cancel
          </button>
          <button
            type="button"
            class="primary-btn confirm-btn"
            [disabled]="submitting"
            (click)="confirm.emit(config)"
          >
            {{ submitting ? busyLabel : confirmLabel }}
          </button>
        </div>
      </article>
    </section>
  `,
  styles: [
    `
      .confirmation-backdrop {
        position: fixed;
        inset: 0;
        z-index: 110;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(15, 23, 42, 0.42);
        backdrop-filter: blur(6px);
      }
      .confirmation-card {
        width: min(560px, 100%);
        padding: 28px 28px 26px;
        border-radius: 24px;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
        display: grid;
        gap: 22px;
        border: 1px solid rgba(229, 57, 53, 0.08);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.94));
      }
      .confirmation-header,
      .actions {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }
      .confirmation-copy {
        display: grid;
        gap: 8px;
      }
      .confirmation-copy h2 {
        font-size: clamp(2rem, 3vw, 2.65rem);
        line-height: 1.08;
      }
      .confirmation-message {
        color: var(--qb-text-muted);
        font-size: 1rem;
        line-height: 1.7;
        max-width: 44ch;
        margin: 0;
      }
      .compact-btn {
        min-height: 40px;
        padding-inline: 18px;
        border-radius: 999px;
        background: #fff1f1;
        color: var(--qb-primary);
        border: 1px solid rgba(229, 57, 53, 0.14);
        box-shadow: none;
      }
      .cancel-btn,
      .confirm-btn {
        min-width: 148px;
      }
      .confirm-btn {
        background: linear-gradient(135deg, #e53935, #ff7c78);
        box-shadow: 0 14px 26px rgba(255, 124, 120, 0.28);
      }
      @media (max-width: 700px) {
        .confirmation-card {
          padding: 22px;
          border-radius: 20px;
        }
        .confirmation-header,
        .actions {
          flex-direction: column;
          align-items: stretch;
        }
        .cancel-btn,
        .confirm-btn {
          width: 100%;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationModalComponent {
  @Input({ required: true }) config!: ModalConfig;
  @Input() submitting = false;

  @Output() confirm = new EventEmitter<ModalConfig>();
  @Output() cancel = new EventEmitter<void>();

  get title(): string {
    return `${this.config.action} Account`;
  }

  get message(): string {
    return `Are you sure you want to ${this.config.action.toLowerCase()} this ${this.config.role.toLowerCase()} account?`;
  }

  get confirmLabel(): string {
    return `${this.config.action} Account`;
  }

  get busyLabel(): string {
    switch (this.config.action) {
      case 'Delete':
        return 'Deleting...';
      case 'Reactivate':
        return 'Reactivating...';
      default:
        return 'Suspending...';
    }
  }
}
