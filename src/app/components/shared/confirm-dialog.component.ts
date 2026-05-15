import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dialog-backdrop" *ngIf="open">
      <div class="dialog-card surface-card">
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
        <div class="dialog-actions">
          <button type="button" class="secondary-btn" (click)="cancel.emit()">Cancel</button>
          <button type="button" class="primary-btn" (click)="confirm.emit()">{{ confirmLabel }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1100;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(15, 23, 42, 0.45);
    }

    .dialog-card {
      width: min(460px, 100%);
      padding: 28px;
    }

    h3 {
      margin-bottom: 10px;
      font-size: 1.35rem;
    }

    p {
      color: var(--qb-text-muted);
      line-height: 1.6;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 22px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Confirm action';
  @Input() message = 'Are you sure you want to continue?';
  @Input() confirmLabel = 'Continue';

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}
