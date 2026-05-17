import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, interval, map } from 'rxjs';
import { AppNotification } from '../../models/app.models';
import { CurrentUser, UserRole } from '../../models/auth.models';
import { AdminService } from '../../services/admin.service';
import { AppNotificationService } from '../../services/app-notification.service';
import { AuthService } from '../../services/auth.service';
import { CustomerAccessService } from '../../services/customer-access.service';
import { ProfileService } from '../../services/profile.service';
import { ROLE_LABELS, ROLE_NAV_ITEMS } from '../../shared/role-config';
import { CustomerAuthPromptComponent } from '../shared/customer-auth-prompt.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, CustomerAuthPromptComponent],
  template: `
    <div class="app-shell dashboard-page">
      <header class="topbar surface-card">
        <div class="topbar-start">
          <button
            type="button"
            class="icon-toggle nav-toggle"
            (click)="toggleMobileNav($event)"
            [attr.aria-expanded]="isMobileNavOpen()"
            aria-label="Toggle navigation menu">
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div class="brand-block">
            <span class="brand-mark">QB</span>
            <div>
              <strong>QuickBite</strong>
              <p>{{ activeRoleLabel() }} workspace</p>
            </div>
          </div>
        </div>

        <div class="topbar-actions">
          <div class="notification-wrap" *ngIf="showNotificationBell()">
            <button
              type="button"
              class="icon-toggle notification-toggle"
              (click)="toggleNotificationMenu($event)"
              [attr.aria-expanded]="isNotificationMenuOpen()"
              aria-label="Open notifications">
              <svg class="bell-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0H9m6 0a3 3 0 0 1-6 0"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round" />
              </svg>
              <span class="notification-badge" *ngIf="unreadCount() > 0">{{ unreadBadge() }}</span>
            </button>

            <div class="notification-dropdown surface-card" *ngIf="isNotificationMenuOpen()" (click)="stopEvent($event)">
              <div class="notification-head">
                <div class="notification-head-copy">
                  <strong>Notifications</strong>
                  <p *ngIf="unreadCount() > 0">{{ unreadCount() }} unread update{{ unreadCount() === 1 ? '' : 's' }}</p>
                  <p *ngIf="unreadCount() === 0">Everything is up to date.</p>
                </div>
                <button
                  type="button"
                  class="notification-mark-read"
                  *ngIf="unreadCount() > 0"
                  (click)="markAllNotificationsRead()">
                  Mark all read
                </button>
              </div>

              <div class="notification-empty" *ngIf="notificationState.isLoading() && !notifications().length">
                Loading notifications...
              </div>

              <div class="notification-empty" *ngIf="!notificationState.isLoading() && !notifications().length">
                No notifications yet.
              </div>

              <div class="notification-list" *ngIf="notifications().length">
                <button
                  type="button"
                  class="notification-item"
                  *ngFor="let notification of notifications(); trackBy: trackNotification"
                  [class.notification-item-unread]="!notification.isRead"
                  (click)="openNotification(notification)">
                  <span class="notification-item-title">{{ notification.title }}</span>
                  <span class="notification-item-message">{{ notification.message }}</span>
                  <span class="notification-item-badges" *ngIf="notification.orderId || notification.deliveryId">
                    <span class="notification-chip" *ngIf="notification.orderId">Order {{ notification.orderId }}</span>
                    <span class="notification-chip" *ngIf="notification.deliveryId">Delivery {{ notification.deliveryId }}</span>
                  </span>
                  <span class="notification-rating" *ngIf="notification.rating">
                    <span class="notification-stars">{{ renderStars(notification.rating) }}</span>
                    <span class="notification-rating-copy">
                      {{ notification.rating }}/5
                      <ng-container *ngIf="notification.actorName"> by {{ notification.actorName }}</ng-container>
                    </span>
                  </span>
                  <span class="notification-item-meta">
                    {{ formatRelativeTime(notification.sentAt) }}
                    <strong *ngIf="!notification.isRead">Unread</strong>
                  </span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="icon-toggle account-toggle"
            (click)="toggleProfileMenu($event)"
            [attr.aria-expanded]="isProfileMenuOpen()"
            aria-label="Open profile menu">
            <ng-container *ngIf="profileImageUrl(); else avatarFallback">
              <img class="avatar-image" [src]="profileImageUrl()!" alt="" />
            </ng-container>
            <ng-template #avatarFallback>
              <span class="avatar-fallback">{{ avatarInitials() }}</span>
            </ng-template>
          </button>

          <div class="profile-dropdown surface-card" *ngIf="isProfileMenuOpen()" (click)="stopEvent($event)">
            <ng-container *ngIf="isGuestCustomer(); else memberMenu">
              <div class="guest-copy">
                <strong>Browse as guest</strong>
                <p>Login or sign up when you are ready to order, save addresses, and track deliveries.</p>
              </div>
              <div class="guest-actions">
                <button type="button" class="secondary-btn" (click)="goToCustomerAuth('login')">Login</button>
                <button type="button" class="primary-btn" (click)="goToCustomerAuth('signup')">Sign Up</button>
              </div>
            </ng-container>

            <ng-template #memberMenu>
              <div class="profile-identity">
                <span class="profile-avatar">
                  <ng-container *ngIf="profileImageUrl(); else dropdownAvatarFallback">
                    <img class="avatar-image" [src]="profileImageUrl()!" alt="" />
                  </ng-container>
                  <ng-template #dropdownAvatarFallback>
                    <span class="avatar-fallback">{{ avatarInitials() }}</span>
                  </ng-template>
                </span>
                <span class="profile-copy">
                  <strong>{{ displayName() }}</strong>
                  <small>{{ activeRoleLabel() }}</small>
                </span>
              </div>
              <button type="button" class="dropdown-action profile-action" (click)="goToAccount()">Profile</button>
              <button type="button" class="dropdown-action" (click)="logout()">Logout</button>
            </ng-template>
          </div>
        </div>
      </header>

      <button
        type="button"
        class="shell-backdrop"
        *ngIf="isMobileNavOpen()"
        (click)="closeMobileNav()"
        aria-label="Close navigation">
      </button>

      <aside class="sidebar surface-card" [class.sidebar-open]="isMobileNavOpen()">
        <div class="sidebar-head">
          <ng-container *ngIf="showsStandaloneRoleBadge(); else defaultSidebarBrand">
            <span class="sidebar-badge sidebar-badge-standalone">{{ activeRoleLabel() }}</span>
          </ng-container>
          <ng-template #defaultSidebarBrand>
            <a class="brand" routerLink="/welcome">QuickBite</a>
            <span class="sidebar-badge">{{ activeRoleLabel() }}</span>
          </ng-template>
        </div>
        <p class="sidebar-copy">{{ sidebarCopy() }}</p>

        <nav class="nav-list">
          <ng-container *ngFor="let item of navItems()">
            <a
              *ngIf="!isProtectedCustomerLink(item.path); else gatedLink"
              [routerLink]="item.path"
              routerLinkActive="active"
              (click)="closeMobileNav()"
              class="nav-link">
              {{ item.label }}
            </a>

            <ng-template #gatedLink>
              <button type="button" class="nav-link nav-link-button" (click)="handleProtectedCustomerLink(item.path)">
                {{ item.label }}
              </button>
            </ng-template>
          </ng-container>
        </nav>
      </aside>

      <div class="content">
        <main class="dashboard-main app-shell-main">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>

    <app-customer-auth-prompt
      *ngIf="isCustomerContext()"
      [config]="customerAccessService.authPrompt()"
      (login)="customerAccessService.goToLogin()"
      (signup)="customerAccessService.goToSignup()"
      (cancel)="customerAccessService.closePrompt()">
    </app-customer-auth-prompt>
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
      min-height: var(--shell-header-height);
      padding: 12px 24px;
      border-radius: 0 0 18px 18px;
      border: 0;
      backdrop-filter: blur(22px);
      background: rgba(244, 250, 247, 0.9);
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
    }

    .topbar-start {
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 0;
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
      z-index: 70;
    }

    .brand-block,
    .sidebar-head {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
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
      flex-shrink: 0;
    }

    .brand {
      display: inline-block;
      font-size: 1.5rem;
      font-weight: 760;
      color: var(--qb-text);
      margin-left: 2px;
      margin-right: 6px;
      flex: 0 1 auto;
    }

    .sidebar-badge {
      padding: 8px 12px;
      border-radius: 999px;
      background: var(--qb-primary-soft);
      color: var(--qb-primary);
      font-size: 0.8rem;
      font-weight: 700;
      margin-left: 6px;
      flex-shrink: 0;
    }

    .sidebar-badge-standalone {
      margin-left: 0;
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
      width: 100%;
      padding: 14px 16px;
      border-radius: 12px;
      color: var(--qb-text-muted);
      font-weight: 600;
      border: 1px solid transparent;
      background: transparent;
      text-align: left;
      transition: 0.2s ease;
    }

    .nav-link.active,
    .nav-link:hover,
    .nav-link-button:hover {
      color: var(--qb-primary);
      background: rgba(15, 122, 95, 0.08);
      border-color: rgba(15, 122, 95, 0.14);
    }

    .nav-link-button {
      cursor: pointer;
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
    }

    .topbar-actions {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .notification-wrap {
      position: relative;
      flex-shrink: 0;
    }

    .icon-toggle {
      border: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(255, 255, 255, 0.82);
      box-shadow: var(--qb-shadow-soft);
      cursor: pointer;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }

    .icon-toggle:hover {
      transform: translateY(-1px);
      border-color: rgba(15, 122, 95, 0.18);
    }

    .nav-toggle {
      display: none;
      width: 46px;
      height: 46px;
      padding: 0;
      border-radius: 14px;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 4px;
      flex-shrink: 0;
    }

    .nav-toggle span {
      width: 18px;
      height: 2px;
      border-radius: 999px;
      background: var(--qb-text);
    }

    .notification-toggle {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 46px;
      height: 46px;
      padding: 0;
      border-radius: 14px;
      color: var(--qb-text);
      flex-shrink: 0;
    }

    .bell-icon {
      width: 20px;
      height: 20px;
    }

    .notification-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--qb-danger);
      color: #ffffff;
      font-size: 0.68rem;
      font-weight: 800;
      box-shadow: 0 8px 16px rgba(201, 59, 49, 0.24);
    }

    .account-toggle,
    .profile-avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      padding: 0;
      border-radius: 999px;
      overflow: hidden;
      flex-shrink: 0;
    }

    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .avatar-fallback {
      display: inline-grid;
      place-items: center;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, var(--qb-primary), #11936f);
      color: #ffffff;
      font-weight: 700;
    }

    .notification-dropdown {
      position: absolute;
      top: calc(100% + 12px);
      right: 0;
      width: min(360px, calc(100vw - 24px));
      min-width: 280px;
      max-height: min(460px, calc(100vh - 120px));
      padding: 14px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.96);
      z-index: 80;
      display: grid;
      gap: 12px;
      overflow: hidden;
    }

    .profile-dropdown {
      position: absolute;
      top: calc(100% + 12px);
      right: 0;
      width: auto;
      min-width: 220px;
      max-width: min(280px, calc(100vw - 24px));
      padding: 14px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.95);
      z-index: 80;
      display: grid;
      gap: 12px;
      justify-items: center;
      text-align: center;
    }

    .notification-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .notification-head-copy {
      display: grid;
      gap: 4px;
    }

    .notification-head-copy strong {
      font-size: 0.98rem;
      font-weight: 760;
    }

    .notification-head-copy p {
      margin: 0;
      color: var(--qb-text-muted);
      font-size: 0.82rem;
      line-height: 1.4;
    }

    .notification-mark-read {
      border: 0;
      padding: 0;
      background: transparent;
      color: var(--qb-primary);
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }

    .notification-list {
      display: grid;
      gap: 10px;
      max-height: 330px;
      overflow: auto;
      padding-right: 2px;
    }

    .notification-item {
      width: 100%;
      border: 1px solid rgba(148, 163, 184, 0.14);
      border-radius: 16px;
      background: rgba(248, 250, 252, 0.76);
      padding: 12px 14px;
      display: grid;
      gap: 6px;
      text-align: left;
      cursor: pointer;
      transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
    }

    .notification-item:hover {
      transform: translateY(-1px);
      border-color: rgba(15, 122, 95, 0.18);
    }

    .notification-item-unread {
      background: rgba(15, 122, 95, 0.08);
      border-color: rgba(15, 122, 95, 0.18);
    }

    .notification-item-title {
      font-size: 0.92rem;
      font-weight: 760;
      color: var(--qb-text);
    }

    .notification-item-message {
      font-size: 0.84rem;
      line-height: 1.5;
      color: var(--qb-text-muted);
    }

    .notification-item-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .notification-chip {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      padding: 0 10px;
      border-radius: 999px;
      background: rgba(15, 122, 95, 0.08);
      color: var(--qb-primary);
      font-size: 0.74rem;
      font-weight: 700;
    }

    .notification-rating {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #b45309;
      font-size: 0.8rem;
    }

    .notification-stars {
      letter-spacing: 0.08em;
      font-size: 0.9rem;
    }

    .notification-rating-copy {
      color: var(--qb-text-muted);
      line-height: 1.4;
    }

    .notification-item-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 0.76rem;
      color: var(--qb-text-muted);
    }

    .notification-item-meta strong {
      color: var(--qb-primary);
      font-weight: 800;
    }

    .notification-empty {
      padding: 14px 4px 6px;
      color: var(--qb-text-muted);
      text-align: center;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .guest-copy {
      display: grid;
      gap: 6px;
      padding: 6px;
    }

    .guest-copy p {
      color: var(--qb-text-muted);
      line-height: 1.6;
      font-size: 0.92rem;
    }

    .guest-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .profile-identity,
    .dropdown-action {
      width: 100%;
      background: transparent;
    }

    .dropdown-action {
      border: 0;
      cursor: pointer;
    }

    .profile-identity {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 8px 6px;
      border-radius: 16px;
      text-align: center;
    }

    .profile-action {
      color: var(--qb-text);
    }

    .dropdown-action:hover {
      background: rgba(15, 122, 95, 0.06);
    }

    .profile-copy {
      display: grid;
      gap: 2px;
      min-width: 0;
      justify-items: center;
    }

    .profile-copy strong,
    .profile-copy small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }

    .profile-copy small {
      color: var(--qb-text-muted);
      font-size: 0.8rem;
    }

    .dropdown-action {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 42px;
      padding: 0 10px;
      border-radius: 14px;
      color: var(--qb-danger);
      font-weight: 700;
    }

    .profile-action {
      color: var(--qb-text);
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

    .shell-backdrop {
      display: none;
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
        position: fixed;
        top: calc(var(--shell-header-height) + 10px);
        left: 12px;
        width: min(320px, calc(100vw - 24px));
        max-height: calc(100vh - var(--shell-header-height) - 24px);
        margin-left: 0;
        margin-right: 0;
        transform: translateX(calc(-100% - 24px));
        opacity: 0;
        pointer-events: none;
        transition: transform 0.24s ease, opacity 0.24s ease;
      }

      .sidebar.sidebar-open {
        transform: translateX(0);
        opacity: 1;
        pointer-events: auto;
      }

      .nav-toggle {
        display: inline-flex;
      }

      .shell-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 60;
        border: 0;
        background: rgba(15, 23, 42, 0.24);
      }
    }

    @media (max-width: 720px) {
      .topbar {
        padding-inline: 14px;
      }

      .topbar p {
        display: none;
      }

      .content {
        min-height: calc(100vh - var(--shell-header-height) - var(--shell-gap) - 18px);
        padding-right: 12px;
        padding-left: 12px;
      }

      .guest-actions {
        grid-template-columns: 1fr;
      }

      .notification-dropdown {
        min-width: 0;
        width: min(320px, calc(100vw - 20px));
      }

      .profile-dropdown {
        min-width: 210px;
        max-width: min(260px, calc(100vw - 20px));
        right: 0;
      }
    }

    @media (max-width: 540px) {
      .topbar {
        gap: 10px;
      }

      .brand-block {
        gap: 10px;
      }

      .sidebar-head {
        gap: 10px;
      }

      .brand-mark {
        width: 38px;
        height: 38px;
        border-radius: 10px;
      }

      .brand-block strong {
        font-size: 0.98rem;
      }

      .brand {
        margin-right: 2px;
      }

      .sidebar-badge {
        margin-left: 2px;
        padding-inline: 10px;
      }

      .notification-dropdown {
        width: min(300px, calc(100vw - 18px));
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);
  private readonly adminService = inject(AdminService);
  readonly notificationState = inject(AppNotificationService);
  readonly customerAccessService = inject(CustomerAccessService);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUser = signal<CurrentUser | null>(this.authService.getCurrentUser());
  readonly currentUrl = signal(this.router.url);
  readonly activeRole = computed<UserRole>(() => this.currentUrl().startsWith('/customer') ? 'CUSTOMER' : this.currentUser()?.role ?? 'CUSTOMER');
  readonly activeRoleLabel = computed(() => ROLE_LABELS[this.activeRole()]);
  readonly navItems = computed(() => ROLE_NAV_ITEMS[this.activeRole()]);
  readonly displayName = computed(() => this.currentUser()?.fullName?.trim() || this.currentUser()?.email || 'QuickBite user');
  readonly avatarInitials = computed(() => this.buildInitials(this.currentUser()?.fullName, this.currentUser()?.email));
  readonly profileImageUrl = computed(() => this.currentUser()?.profilePicUrl?.trim() || '');
  readonly notifications = computed(() => this.notificationState.notifications());
  readonly unreadCount = computed(() => this.notificationState.unreadCount());
  readonly relativeTimeTick = signal(Date.now());
  readonly isMobileNavOpen = signal(false);
  readonly isProfileMenuOpen = signal(false);
  readonly isNotificationMenuOpen = signal(false);
  readonly isCustomerContext = computed(() => this.activeRole() === 'CUSTOMER');
  readonly isGuestCustomer = computed(() => this.isCustomerContext() && !this.customerAccessService.isCustomerLoggedIn());
  readonly showNotificationBell = computed(() => Boolean(this.currentUser()) && !this.isGuestCustomer());
  readonly showsStandaloneRoleBadge = computed(() => {
    const role = this.activeRole();
    return role === 'CUSTOMER'
      || role === 'RESTAURANT_OWNER'
      || role === 'DELIVERY_PARTNER'
      || role === 'ADMIN';
  });
  readonly sidebarCopy = computed(() => this.isCustomerContext()
    ? 'Browse restaurants, menus, offers, and featured dishes. Login only when you want to order or save personal data.'
    : 'Operational tools, live data, and account-specific workflows in one place.');

  private hydratedProfileKey: string | null = null;

  constructor() {
    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.currentUser.set(user);
        this.hydrateProfile(user);

        if (user && (!this.isCustomerContext() || !this.isGuestCustomer())) {
          this.refreshUnreadCount();
          if (this.isNotificationMenuOpen()) {
            this.loadNotifications();
          }
        } else {
          this.notificationState.clear();
        }
      });

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.closeMobileNav();
        this.closeProfileMenu();
        this.closeNotificationMenu();
        this.customerAccessService.closePrompt();

        if (this.showNotificationBell()) {
          this.refreshUnreadCount();
        }
      });

    interval(30000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.relativeTimeTick.set(Date.now());
        if (!this.showNotificationBell()) {
          return;
        }

        this.refreshUnreadCount();
        if (this.isNotificationMenuOpen()) {
          this.loadNotifications();
        }
      });
  }

  @HostListener('document:click')
  closeMenusFromDocument(): void {
    this.closeMobileNav();
    this.closeProfileMenu();
    this.closeNotificationMenu();
  }

  stopEvent(event: Event): void {
    event.stopPropagation();
  }

  toggleMobileNav(event: MouseEvent): void {
    event.stopPropagation();
    this.isMobileNavOpen.update((open) => !open);
    this.isProfileMenuOpen.set(false);
    this.isNotificationMenuOpen.set(false);
  }

  closeMobileNav(): void {
    this.isMobileNavOpen.set(false);
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isProfileMenuOpen.update((open) => !open);
    this.isMobileNavOpen.set(false);
    this.isNotificationMenuOpen.set(false);
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen.set(false);
  }

  toggleNotificationMenu(event: MouseEvent): void {
    event.stopPropagation();

    if (!this.showNotificationBell()) {
      return;
    }

    const nextState = !this.isNotificationMenuOpen();
    this.isNotificationMenuOpen.set(nextState);
    this.isMobileNavOpen.set(false);
    this.isProfileMenuOpen.set(false);

    if (nextState) {
      this.loadNotifications();
      this.refreshUnreadCount();
    }
  }

  closeNotificationMenu(): void {
    this.isNotificationMenuOpen.set(false);
  }

  isProtectedCustomerLink(path: string): boolean {
    return this.isGuestCustomer() && ['/customer/cart', '/customer/orders', '/customer/stats', '/customer/profile'].some((protectedPath) => path.startsWith(protectedPath));
  }

  handleProtectedCustomerLink(path: string): void {
    this.closeMobileNav();
    this.closeProfileMenu();
    this.closeNotificationMenu();
    this.customerAccessService.requestAuth(path);
  }

  goToCustomerAuth(mode: 'login' | 'signup'): void {
    this.closeProfileMenu();
    this.router.navigate(['/customer/auth'], {
      queryParams: {
        returnUrl: this.currentUrl(),
        mode
      }
    });
  }

  goToAccount(): void {
    this.closeProfileMenu();
    const role = this.activeRole();
    const target = role === 'CUSTOMER'
      ? '/customer/profile'
      : role === 'RESTAURANT_OWNER'
        ? '/restaurant-owner/profile'
        : role === 'DELIVERY_PARTNER'
          ? '/delivery-partner/profile'
          : '/admin/dashboard';

    if (role === 'CUSTOMER' && this.isGuestCustomer()) {
      this.customerAccessService.requestAuth(target);
      return;
    }

    this.router.navigateByUrl(target);
  }

  logout(): void {
    this.closeProfileMenu();
    this.closeNotificationMenu();
    this.notificationState.clear();
    this.authService.logout();
  }

  markAllNotificationsRead(): void {
    this.notificationState.markAllRead()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => undefined
      });
  }

  openNotification(notification: AppNotification): void {
    if (notification.isRead) {
      return;
    }

    this.notificationState.markAsRead(notification.notificationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => undefined
      });
  }

  trackNotification(_index: number, notification: AppNotification): number {
    return notification.notificationId;
  }

  unreadBadge(): string {
    return this.unreadCount() > 99 ? '99+' : String(this.unreadCount());
  }

  formatRelativeTime(value?: string | null): string {
    this.relativeTimeTick();
    if (!value) {
      return 'Just now';
    }

    const timestamp = this.parseTimestamp(value);
    if (Number.isNaN(timestamp)) {
      return 'Just now';
    }

    const diff = Math.max(0, Date.now() - timestamp);
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) {
      return 'Just now';
    }
    if (diff < hour) {
      const minutes = Math.floor(diff / minute);
      return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    }
    if (diff < day) {
      const hours = Math.floor(diff / hour);
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    }
    if (diff < 2 * day) {
      return 'Yesterday';
    }
    const days = Math.floor(diff / day);
    return `${days} days ago`;
  }

  renderStars(rating?: number | null): string {
    const normalized = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return `${'★'.repeat(normalized)}${'☆'.repeat(5 - normalized)}`;
  }

  private loadNotifications(): void {
    this.notificationState.loadNotifications()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => undefined
      });
  }

  private refreshUnreadCount(): void {
    this.notificationState.loadUnreadCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => undefined
      });
  }

  private hydrateProfile(user: CurrentUser | null): void {
    if (!user?.id) {
      this.hydratedProfileKey = null;
      return;
    }

    const profileKey = `${user.role}:${user.id}`;
    if (this.hydratedProfileKey === profileKey && user.fullName) {
      return;
    }

    this.hydratedProfileKey = profileKey;

    if (user.role === 'CUSTOMER') {
      this.profileService.getCustomerProfile(user.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (profile) => this.authService.updateCurrentUserProfile({
            email: profile.email,
            fullName: profile.fullName,
            profilePicUrl: profile.profilePicUrl ?? null
          }),
          error: () => undefined
        });
      return;
    }

    if (user.role === 'RESTAURANT_OWNER') {
      this.profileService.getRestaurantOwnerProfile(user.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (profile) => this.authService.updateCurrentUserProfile({
            email: profile.email,
            fullName: profile.fullName,
            profilePicUrl: profile.profilePicUrl ?? null
          }),
          error: () => undefined
        });
      return;
    }

    if (user.role === 'DELIVERY_PARTNER') {
      this.profileService.getDeliveryPartnerProfile(user.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (profile) => this.authService.updateCurrentUserProfile({
            email: profile.email,
            fullName: profile.fullName,
            profilePicUrl: profile.profilePicUrl ?? null
          }),
          error: () => undefined
        });
      return;
    }

    this.adminService.getUsers()
      .pipe(
        map((users) => users.find((item) => item.id === user.id)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (profile) => {
          if (!profile) {
            return;
          }

          this.authService.updateCurrentUserProfile({
            email: profile.email,
            fullName: profile.fullName
          });
        },
        error: () => undefined
      });
  }

  private buildInitials(fullName?: string | null, email?: string | null): string {
    const name = fullName?.trim();
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
      return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'QB';
    }

    const fallback = email?.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2);
    return (fallback || 'QB').toUpperCase();
  }

  private parseTimestamp(value: string): number {
    const normalized = /[zZ]|[+\-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`;
    return new Date(normalized).getTime();
  }
}
