import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-toast-outlet',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack">
      <button
        *ngFor="let toast of notificationService.toasts()"
        type="button"
        class="toast"
        [class.success]="toast.type === 'success'"
        [class.error]="toast.type === 'error'"
        [class.info]="toast.type === 'info'"
        (click)="notificationService.dismiss(toast.id)">
        {{ toast.message }}
      </button>
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 1200;
      display: grid;
      gap: 10px;
      width: min(360px, calc(100vw - 24px));
    }

    .toast {
      width: 100%;
      padding: 14px 16px;
      border: 0;
      border-radius: 18px;
      color: #fff;
      text-align: left;
      cursor: pointer;
      box-shadow: 0 16px 28px rgba(15, 23, 42, 0.18);
    }

    .success { background: linear-gradient(135deg, #1f9d63, #34c37b); }
    .error { background: linear-gradient(135deg, #d92d20, #ef5b4f); }
    .info { background: linear-gradient(135deg, #1d4ed8, #3b82f6); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastOutletComponent {
  readonly notificationService = inject(NotificationService);
}
