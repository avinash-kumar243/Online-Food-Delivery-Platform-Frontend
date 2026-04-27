import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-admin-placeholder-page',
  standalone: true,
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Admin module</span>
        <h1>{{ title() }}</h1>
        <p class="dashboard-subtitle">{{ description() }}</p>
      </div>
    </section>
    <section class="empty-state">{{ note() }}</section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPlaceholderPageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title = computed(() => this.route.snapshot.data['title'] as string);
  readonly description = computed(() => this.route.snapshot.data['description'] as string);
  readonly note = computed(() => this.route.snapshot.data['note'] as string ?? 'This backend endpoint is not available yet.');
}
