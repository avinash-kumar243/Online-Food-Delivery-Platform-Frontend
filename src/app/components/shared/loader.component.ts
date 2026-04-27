import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-loader',
  standalone: true,
  template: `
    <div class="loader-wrap" [class.compact]="compact">
      <span class="loader-spinner"></span>
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

    .loader-spinner {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      border: 4px solid rgba(229, 57, 53, 0.15);
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
