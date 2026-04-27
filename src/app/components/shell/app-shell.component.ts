import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ROLE_LABELS, ROLE_NAV_ITEMS } from '../../shared/role-config';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell dashboard-page">
      <aside class="sidebar surface-card">
        <a class="brand" routerLink="/welcome">QuickBite</a>
        <p class="sidebar-copy">{{ roleLabel() }} workspace</p>

        <nav class="nav-list">
          <a
            *ngFor="let item of navItems()"
            [routerLink]="item.path"
            routerLinkActive="active"
            class="nav-link">
            <span>{{ item.icon }}</span>
            {{ item.label }}
          </a>
        </nav>
      </aside>

      <div class="content">
        <header class="topbar surface-card">
          <div>
            <strong>QuickBite</strong>
            <p>{{ roleLabel() }} portal</p>
          </div>

          <div class="topbar-actions">
            <button type="button" class="profile-pill secondary-btn" (click)="goToAccount()">
              <span class="avatar">{{ initials() }}</span>
              <span>{{ currentUser()?.email || 'Account' }}</span>
            </button>
            <button type="button" class="ghost-btn" (click)="logout()">Logout</button>
          </div>
        </header>

        <main class="dashboard-main app-shell-main">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-shell {
      display: grid;
      grid-template-columns: 288px minmax(0, 1fr);
      min-height: 100vh;
    }

    .sidebar {
      position: sticky;
      top: 0;
      height: 100vh;
      margin: 18px;
      padding: 28px 22px;
      align-self: start;
    }

    .brand {
      display: inline-block;
      font-family: 'Poppins', sans-serif;
      font-size: 1.7rem;
      font-weight: 700;
      color: var(--qb-primary);
    }

    .sidebar-copy {
      margin-top: 10px;
      color: var(--qb-text-muted);
      line-height: 1.6;
    }

    .nav-list {
      display: grid;
      gap: 10px;
      margin-top: 28px;
    }

    .nav-link {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 14px 16px;
      border-radius: 16px;
      color: var(--qb-text-muted);
      font-weight: 600;
      transition: 0.2s ease;
    }

    .nav-link.active,
    .nav-link:hover {
      color: var(--qb-primary);
      background: var(--qb-primary-soft);
    }

    .content {
      min-width: 0;
    }

    .topbar {
      position: sticky;
      top: 18px;
      z-index: 25;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin: 18px 18px 0 0;
      padding: 18px 22px;
    }

    .topbar strong {
      display: block;
      font-size: 1.1rem;
    }

    .topbar p {
      color: var(--qb-text-muted);
      margin-top: 4px;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .profile-pill {
      padding-inline: 12px 16px;
    }

    .avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: inline-grid;
      place-items: center;
      background: var(--qb-primary-soft);
      color: var(--qb-primary);
      font-weight: 700;
    }

    .app-shell-main {
      width: min(1300px, calc(100% - 18px));
      padding-top: 26px;
    }

    @media (max-width: 1080px) {
      .app-shell {
        grid-template-columns: 1fr;
      }

      .sidebar {
        position: relative;
        height: auto;
        margin: 18px 18px 0;
      }

      .topbar {
        margin: 18px;
      }

      .app-shell-main {
        width: min(1300px, calc(100% - 36px));
        padding-top: 0;
      }
    }

    @media (max-width: 720px) {
      .topbar,
      .topbar-actions {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = computed(() => this.authService.getCurrentUser());
  readonly navItems = computed(() => ROLE_NAV_ITEMS[this.currentUser()?.role ?? 'CUSTOMER']);
  readonly roleLabel = computed(() => ROLE_LABELS[this.currentUser()?.role ?? 'CUSTOMER']);
  readonly initials = computed(() => (this.currentUser()?.email?.slice(0, 2) ?? 'QB').toUpperCase());

  goToAccount(): void {
    const role = this.currentUser()?.role;
    if (!role) {
      return;
    }

    const target = role === 'CUSTOMER'
      ? '/customer/stats'
      : role === 'RESTAURANT_OWNER'
        ? '/restaurant-owner/stats'
        : role === 'DELIVERY_PARTNER'
          ? '/delivery-partner/earnings'
          : '/admin/dashboard';

    this.router.navigateByUrl(target);
  }

  logout(): void {
    this.authService.logout();
  }
}
