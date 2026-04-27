import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <section class="empty-state">
      <strong>{{ title }}</strong>
      <p>{{ description }}</p>
    </section>
  `,
  styles: [`
    strong {
      display: block;
      margin-bottom: 8px;
      color: var(--qb-text);
      font-size: 1rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  @Input() title = 'Nothing to show yet';
  @Input() description = 'Try adjusting your filters or come back a little later.';
}
