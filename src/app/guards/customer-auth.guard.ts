import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const customerAuthGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    authService.clearInvalidSession();
    router.navigate(['/customer/auth'], { queryParams: { returnUrl: state.url, mode: 'login' } });
    return false;
  }

  if (currentUser.role !== 'CUSTOMER') {
    return router.parseUrl(authService.getDashboardRoute(currentUser.role));
  }

  return true;
};
