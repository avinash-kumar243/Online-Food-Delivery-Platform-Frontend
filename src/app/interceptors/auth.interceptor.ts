import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const publicEndpoints = [
    '/auth/customer/register',
    '/auth/customer/login',
    '/auth/delivery-partner/register',
    '/auth/delivery-partner/login',
    '/auth/restaurant/register',
    '/auth/restaurant/login',
    '/auth/forgot-password',
    '/auth/verify-otp',
    '/auth/reset-password'
  ];

  const isPublicEndpoint = publicEndpoints.some(endpoint => req.url.includes(endpoint));

  if (isPublicEndpoint) {
    return next(req);
  }

  const token = localStorage.getItem('token')?.trim();

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};