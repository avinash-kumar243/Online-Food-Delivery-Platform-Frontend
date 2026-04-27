import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const publicEndpoints = [
    '/auth/customer/register',
    '/auth/customer/login',
    '/auth/delivery-partner/register',
    '/auth/delivery-partner/login',
    '/auth/restaurant/register',
    '/auth/restaurant/login',

    '/auth/customer/forget-password',
    '/auth/customer/verify-otp',
    '/auth/customer/reset-password',

    '/auth/delivery-partner/forget-password',
    '/auth/delivery-partner/verify-otp',
    '/auth/delivery-partner/reset-password',

    '/auth/restaurant/forget-password',
    '/auth/restaurant/verify-otp',
    '/auth/restaurant/reset-password'
  ];

  const isPublicEndpoint = publicEndpoints.some(endpoint => req.url.includes(endpoint));

  if (isPublicEndpoint) {
    return next(req).pipe(
      catchError((error: unknown) => throwError(() => error))
    );
  }

  const token = localStorage.getItem('token')?.trim();

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned).pipe(
      catchError((error: any) => {
        if (error?.status === 401 || error?.status === 403) {
          const loginRoute = authService.getUserRole() === 'RESTAURANT_OWNER'
            ? '/restaurant/auth'
            : authService.getUserRole() === 'DELIVERY_PARTNER'
              ? '/delivery-partner/auth'
              : authService.getUserRole() === 'ADMIN'
                ? '/welcome'
              : '/customer/auth';
          authService.clearInvalidSession();
          router.navigate([loginRoute], { queryParams: { session: 'expired' } });
        }

        return throwError(() => error);
      })
    );
  }

  return next(req).pipe(
    catchError((error: any) => {
      if (error?.status === 401 || error?.status === 403) {
        const loginRoute = authService.getUserRole() === 'RESTAURANT_OWNER'
          ? '/restaurant/auth'
          : authService.getUserRole() === 'DELIVERY_PARTNER'
            ? '/delivery-partner/auth'
            : authService.getUserRole() === 'ADMIN'
              ? '/welcome'
            : '/customer/auth';
        authService.clearInvalidSession();
        router.navigate([loginRoute], { queryParams: { session: 'expired' } });
      }

      return throwError(() => error);
    })
  );
};
