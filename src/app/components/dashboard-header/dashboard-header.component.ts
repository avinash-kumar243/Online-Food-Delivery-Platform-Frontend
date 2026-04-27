import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, Input, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserProfile } from '../../models/dashboard.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardHeaderComponent {
  @Input({ required: true }) user!: UserProfile;
  @Input() notificationCount = 3;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isProfileOpen = signal(false);

  @HostListener('document:click')
  closeProfileMenu(): void {
    this.isProfileOpen.set(false);
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isProfileOpen.update((open) => !open);
  }

  goToProfile(): void {
    this.isProfileOpen.set(false);
    this.router.navigate([], {
      fragment: 'profile-summary',
      queryParamsHandling: 'preserve'
    });
  }

  logout(): void {
    this.isProfileOpen.set(false);
    this.authService.logout();
  }
}
