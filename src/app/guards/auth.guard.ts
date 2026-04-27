import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) return true;

  authService.clearInvalidSession();
  const redirectPath = state.url.startsWith('/dashboard/restaurant-owner')
    ? '/restaurant/auth'
    : state.url.startsWith('/dashboard/delivery-partner')
      ? '/delivery-partner/auth'
      : '/customer/auth';

  router.navigate([redirectPath], { queryParams: { returnUrl: state.url } });
  return false;
};
