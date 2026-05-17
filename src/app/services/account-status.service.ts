import { Injectable, inject } from '@angular/core';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class AccountStatusService {
  private readonly notificationService = inject(NotificationService);

  isSuspended(subject?: { isActive?: boolean | null } | null): boolean {
    return subject?.isActive === false;
  }

  getSuspensionBannerMessage(): string {
    return 'Your account has been temporarily suspended by the administration team. Some platform features are currently unavailable. Please contact support for additional information.';
  }

  getRestrictionMessage(): string {
    return 'Your account has been suspended. This action is currently unavailable.';
  }

  notifySuspended(): void {
    this.notificationService.error(this.getRestrictionMessage());
  }
}
