import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);
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

  const token = authService.getToken()?.trim();

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned).pipe(
      catchError((error: any) => {
        if (error?.status === 401 || error?.status === 403) {
          const loginRoute = resolveLoginRoute(authService);
          const sessionReason = resolveSessionReason(error);
          const userMessage = resolveUserMessage(error);
          authService.clearInvalidSession();
          if (userMessage) {
            notificationService.error(userMessage);
          }
          router.navigate([loginRoute], { queryParams: { session: sessionReason } });
        }

        return throwError(() => error);
      })
    );
  }

  return next(req).pipe(
    catchError((error: any) => {
      if (error?.status === 401 || error?.status === 403) {
        const loginRoute = resolveLoginRoute(authService);
        const sessionReason = resolveSessionReason(error);
        const userMessage = resolveUserMessage(error);
        authService.clearInvalidSession();
        if (userMessage) {
          notificationService.error(userMessage);
        }
        router.navigate([loginRoute], { queryParams: { session: sessionReason } });
      }

      return throwError(() => error);
    })
  );
};

function resolveLoginRoute(authService: AuthService): string {
  return authService.getUserRole() === 'RESTAURANT_OWNER'
    ? '/restaurant/auth'
    : authService.getUserRole() === 'DELIVERY_PARTNER'
      ? '/delivery-partner/auth'
      : authService.getUserRole() === 'ADMIN'
        ? '/welcome'
        : '/customer/auth';
}

function resolveSessionReason(error: any): string {
  const message = getErrorMessage(error).toLowerCase();
  if (message.includes('suspended')) {
    return 'suspended';
  }
  if (message.includes('deleted') || message.includes('no longer exists')) {
    return 'deleted';
  }
  return 'expired';
}

function resolveUserMessage(error: any): string | null {
  const message = getErrorMessage(error);
  if (!message) {
    return null;
  }

  const normalized = message.toLowerCase();
  if (normalized.includes('suspended')) {
    return 'Your account has been suspended. Please contact support.';
  }
  if (normalized.includes('deleted') || normalized.includes('no longer exists')) {
    return 'Your account no longer exists.';
  }
  return null;
}

function getErrorMessage(error: any): string {
  return String(
    error?.error?.message
    ?? error?.error?.details
    ?? error?.message
    ?? ''
  );
}
