import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AuthPromptState } from '../../services/customer-access.service';

@Component({
  selector: 'app-customer-auth-prompt',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="auth-prompt-backdrop" *ngIf="config" (click)="cancel.emit()">
      <article class="auth-prompt-card surface-card" (click)="$event.stopPropagation()">
        <span class="dashboard-kicker">Customer access</span>
        <h2>{{ config.title }}</h2>
        <p>{{ config.message }}</p>

        <div class="auth-prompt-actions">
          <button type="button" class="secondary-btn" (click)="login.emit()">Login</button>
          <button type="button" class="primary-btn" (click)="signup.emit()">Sign Up</button>
          <button type="button" class="ghost-btn" (click)="cancel.emit()">Cancel</button>
        </div>
      </article>
    </section>
  `,
  styles: [`
    .auth-prompt-backdrop {
      position: fixed;
      inset: 0;
      z-index: 130;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(8px);
    }

    .auth-prompt-card {
      width: min(520px, 100%);
      padding: 28px;
      border-radius: 24px;
      display: grid;
      gap: 16px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
      box-shadow: 0 28px 60px rgba(15, 23, 42, 0.18);
    }

    h2 {
      font-size: clamp(2rem, 3vw, 2.6rem);
      line-height: 1.05;
    }

    p {
      color: var(--qb-text-muted);
      line-height: 1.7;
    }

    .auth-prompt-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 8px;
    }

    .auth-prompt-actions button {
      min-width: 140px;
    }

    @media (max-width: 640px) {
      .auth-prompt-card {
        padding: 22px;
        border-radius: 20px;
      }

      .auth-prompt-actions {
        flex-direction: column;
      }

      .auth-prompt-actions button {
        width: 100%;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerAuthPromptComponent {
  @Input() config: AuthPromptState | null = null;

  @Output() login = new EventEmitter<void>();
  @Output() signup = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
