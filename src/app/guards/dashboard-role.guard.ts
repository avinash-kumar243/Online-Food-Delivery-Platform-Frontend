import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DASHBOARD_ROUTE_BY_ROLE } from '../models/dashboard.model';

export const dashboardRoleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    return router.parseUrl('/customer/auth');
  }

  const expectedRole = route.data['role'] as keyof typeof DASHBOARD_ROUTE_BY_ROLE | undefined;
  if (!expectedRole || currentUser.role === expectedRole) {
    return true;
  }

  return router.parseUrl(DASHBOARD_ROUTE_BY_ROLE[currentUser.role]);
};
