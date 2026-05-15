import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-loader',
  standalone: true,
  template: `
    <div class="loader-wrap" [class.compact]="compact">
      <div class="loader-core">
        <span class="loader-spinner"></span>
      </div>
      <p>{{ label }}</p>
    </div>
  `,
  styles: [`
    .loader-wrap {
      min-height: 180px;
      display: grid;
      place-items: center;
      gap: 14px;
      text-align: center;
      color: var(--qb-text-muted);
    }

    .compact {
      min-height: 96px;
    }

    .loader-core {
      width: 72px;
      height: 72px;
      border-radius: 22px;
      display: grid;
      place-items: center;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(245, 248, 251, 0.96));
      border: 1px solid rgba(148, 163, 184, 0.18);
      box-shadow: var(--qb-shadow-soft);
    }

    .loader-spinner {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      border: 4px solid rgba(15, 122, 95, 0.14);
      border-top-color: var(--qb-primary);
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoaderComponent {
  @Input() label = 'Loading...';
  @Input() compact = false;
}
