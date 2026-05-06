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
      <header class="topbar surface-card">
        <div class="brand-block">
          <span class="brand-mark">QB</span>
          <div>
            <strong>QuickBite</strong>
            <p>{{ roleLabel() }} workspace</p>
          </div>
        </div>

        <div class="topbar-actions">
          <button type="button" class="profile-pill secondary-btn" (click)="goToAccount()">
            <span class="avatar">{{ initials() }}</span>
            <span>{{ currentUser()?.email || 'Account' }}</span>
          </button>
          <button type="button" class="ghost-btn logout-btn" (click)="logout()">Logout</button>
        </div>
      </header>

      <aside class="sidebar surface-card">
        <div class="sidebar-head">
          <a class="brand" routerLink="/welcome">QuickBite</a>
          <span class="sidebar-badge">{{ roleLabel() }}</span>
        </div>
        <p class="sidebar-copy">Operational tools, live data, and account-specific workflows in one place.</p>

        <nav class="nav-list">
          <a
            *ngFor="let item of navItems()"
            [routerLink]="item.path"
            routerLinkActive="active"
            class="nav-link">
            {{ item.label }}
          </a>
        </nav>
      </aside>

      <div class="content">
        <main class="dashboard-main app-shell-main">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --shell-header-height: 72px;
      --shell-gap: 18px;
    }

    .app-shell {
      display: grid;
      grid-template-columns: 288px minmax(0, 1fr);
      grid-template-areas:
        'topbar topbar'
        'sidebar content';
      gap: var(--shell-gap);
      min-height: 100vh;
      padding: 0 0 18px;
    }

    .topbar {
      grid-area: topbar;
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      width: 100%;
      height: var(--shell-header-height);
      min-height: var(--shell-header-height);
      max-height: var(--shell-header-height);
      padding: 0 24px;
      border-radius: 0 0 18px 18px;
      border: 0;
      backdrop-filter: blur(22px);
      background: rgba(244, 250, 247, 0.84);
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }

    .sidebar {
      grid-area: sidebar;
      position: sticky;
      top: calc(var(--shell-header-height) + var(--shell-gap));
      height: fit-content;
      max-height: calc(100vh - (var(--shell-header-height) + var(--shell-gap) + 18px));
      overflow: auto;
      margin-left: 18px;
      padding: 24px 20px;
      align-self: start;
    }

    .brand-block,
    .sidebar-head {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-mark {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: inline-grid;
      place-items: center;
      font-weight: 800;
      color: #ffffff;
      background: linear-gradient(135deg, var(--qb-primary), #11936f);
      box-shadow: 0 12px 20px rgba(15, 122, 95, 0.24);
    }

    .brand {
      display: inline-block;
      font-size: 1.5rem;
      font-weight: 760;
      color: var(--qb-text);
    }

    .sidebar-badge {
      padding: 8px 12px;
      border-radius: 999px;
      background: var(--qb-primary-soft);
      color: var(--qb-primary);
      font-size: 0.8rem;
      font-weight: 700;
    }

    .sidebar-copy {
      margin-top: 14px;
      color: var(--qb-text-muted);
      line-height: 1.6;
      font-size: 0.92rem;
    }

    .nav-list {
      display: grid;
      gap: 10px;
      margin-top: 28px;
    }

    .nav-link {
      display: block;
      padding: 14px 16px;
      border-radius: 12px;
      color: var(--qb-text-muted);
      font-weight: 600;
      border: 1px solid transparent;
      transition: 0.2s ease;
    }

    .nav-link.active,
    .nav-link:hover {
      color: var(--qb-primary);
      background: rgba(15, 122, 95, 0.08);
      border-color: rgba(15, 122, 95, 0.14);
    }

    .content {
      grid-area: content;
      min-width: 0;
      min-height: calc(100vh - var(--shell-header-height) - var(--shell-gap) - 18px);
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
      padding-right: 18px;
      overflow: hidden;
    }

    .topbar strong {
      display: block;
      font-size: 1rem;
      font-weight: 760;
      line-height: 1.1;
    }

    .topbar p {
      color: var(--qb-text-muted);
      margin-top: 2px;
      font-size: 0.82rem;
      line-height: 1.1;
      white-space: nowrap;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
      white-space: nowrap;
    }

    .profile-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      max-width: 320px;
      min-height: 44px;
      height: 44px;
      padding-inline: 12px 16px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .avatar {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: inline-grid;
      place-items: center;
      background: var(--qb-primary-soft);
      color: var(--qb-primary);
      font-weight: 700;
    }

    .logout-btn {
      min-width: 108px;
    }

    .profile-pill span:last-child {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .app-shell-main {
      flex: 1 1 auto;
      width: min(1300px, 100%);
      min-height: 100%;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
      padding-top: 0;
      overflow: auto;
    }

    @media (max-width: 1080px) {
      :host {
        --shell-header-height: 76px;
      }

      .app-shell {
        grid-template-columns: 1fr;
        grid-template-areas:
          'topbar'
          'sidebar'
          'content';
      }

      .sidebar {
        position: sticky;
        top: calc(var(--shell-header-height) + var(--shell-gap));
        height: auto;
        max-height: none;
        margin-right: 18px;
      }

      .app-shell-main {
        width: min(1300px, 100%);
        padding-top: 0;
      }
    }

    @media (max-width: 720px) {
      .topbar {
        padding-inline: 14px;
      }

      .profile-pill {
        max-width: 220px;
      }

      .sidebar {
        margin-left: 12px;
        margin-right: 12px;
      }

      .content {
        min-height: calc(100vh - var(--shell-header-height) - var(--shell-gap) - 18px);
        padding-right: 12px;
        padding-left: 12px;
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
