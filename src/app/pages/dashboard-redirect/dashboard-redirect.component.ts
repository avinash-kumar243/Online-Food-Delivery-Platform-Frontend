import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard-redirect',
  standalone: true,
  template: `
    <div class="redirect-shell">
      <div class="redirect-card surface-card">
        <p class="dashboard-kicker">QuickBite</p>
        <h1>Opening your dashboard</h1>
        <p class="dashboard-subtitle">We are routing you to the right workspace for your role.</p>
      </div>
    </div>
  `,
  styles: [
    `
      .redirect-shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }

      .redirect-card {
        width: min(540px, 100%);
        padding: 32px;
        text-align: center;
      }

      .redirect-card h1 {
        margin-bottom: 10px;
        font-size: clamp(2rem, 5vw, 2.8rem);
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardRedirectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const token = params.get('token');
      const oauth2 = params.get('oauth2');
      const userType = params.get('userType');
      const userId = params.get('userId');

      if (token && oauth2 === 'success') {
        const parsedUserId = userId ? Number(userId) : null;
        this.authService.handleGoogleToken(
          token,
          userType ?? undefined,
          Number.isFinite(parsedUserId) ? parsedUserId : null
        );
      }

      const role = this.authService.getUserRole();
      if (role) {
        this.router.navigate([this.authService.getDashboardRoute(role)], { replaceUrl: true });
        return;
      }

      this.authService.clearInvalidSession();
      this.router.navigate(['/customer/auth'], { replaceUrl: true });
    });
  }
}
