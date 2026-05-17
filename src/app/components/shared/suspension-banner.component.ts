import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-suspension-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="suspension-banner" role="status" aria-live="polite">
      <div class="suspension-icon" aria-hidden="true">!</div>
      <div>
        <strong>{{ title }}</strong>
        <p>{{ message }}</p>
      </div>
    </section>
  `,
  styles: [`
    .suspension-banner {
      display: grid;
      grid-template-columns: 44px minmax(0, 1fr);
      gap: 14px;
      align-items: start;
      padding: 18px 20px;
      border: 1px solid rgba(185, 28, 28, 0.16);
      border-radius: 20px;
      background: linear-gradient(135deg, rgba(254, 242, 242, 0.98), rgba(255, 237, 213, 0.94));
      color: #991b1b;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.52);
    }
    .suspension-icon {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: rgba(220, 38, 38, 0.12);
      color: #b91c1c;
      font-size: 1.25rem;
      font-weight: 800;
      line-height: 1;
    }
    .suspension-banner strong {
      display: block;
      margin-bottom: 6px;
      font-size: 1rem;
      color: #991b1b;
    }
    .suspension-banner p {
      margin: 0;
      color: #b45309;
      line-height: 1.6;
    }
    @media (max-width: 640px) {
      .suspension-banner {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuspensionBannerComponent {
  @Input() title = 'Account suspended';
  @Input() message = 'Your account has been temporarily suspended by the administration team. Some platform features are currently unavailable. Please contact support for additional information.';
}
