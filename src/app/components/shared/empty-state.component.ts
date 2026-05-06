import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <section class="empty-state">
      <span class="empty-icon">+</span>
      <strong>{{ title }}</strong>
      <p>{{ description }}</p>
    </section>
  `,
  styles: [`
    .empty-state {
      display: grid;
      gap: 8px;
      justify-items: start;
    }

    .empty-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: inline-grid;
      place-items: center;
      background: var(--qb-primary-soft);
      color: var(--qb-primary);
      font-size: 1.2rem;
      font-weight: 700;
    }

    strong {
      display: block;
      color: var(--qb-text);
      font-size: 1rem;
    }

    p {
      max-width: 56ch;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  @Input() title = 'Nothing to show yet';
  @Input() description = 'Try adjusting your filters or come back a little later.';
}
