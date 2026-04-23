import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError } from 'rxjs';
import { throwError } from 'rxjs';
import { environment } from '../../environments/environment.prod';

interface AuthResponse {
  token: string;
  message: string;
}

interface OtpResponse {
  message: string;
  email: string;
  expiryInSeconds: number;
}

interface MessageResponse {
  message: string;
  token?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private backendBaseUrl = environment.backendBaseUrl;
  private apiUrl = `${this.backendBaseUrl}/auth`;

  register(userData: any, endpoint: string = '/register'): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}${endpoint}`, userData).pipe(
      tap((response: AuthResponse) => {
        if (response.token && response.token.trim()) {
          localStorage.setItem('token', response.token.trim());

          if (endpoint.includes('/customer/')) {
            localStorage.setItem('userRole', 'customer');
          } else if (endpoint.includes('/restaurant/')) {
            localStorage.setItem('userRole', 'restaurant');
          } else if (endpoint.includes('/delivery-partner/')) {
            localStorage.setItem('userRole', 'delivery-partner');
          }
        }
      }),
      catchError((error: any) => {
        return throwError(() => error);
      })
    );
  }

  login(credentials: any, endpoint: string = '/login'): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}${endpoint}`, credentials).pipe(
      tap((response: AuthResponse) => {
        if (response.token && response.token.trim()) {
          localStorage.setItem('token', response.token.trim());

          if (endpoint.includes('/customer/')) {
            localStorage.setItem('userRole', 'customer');
          } else if (endpoint.includes('/restaurant/')) {
            localStorage.setItem('userRole', 'restaurant');
          } else if (endpoint.includes('/delivery-partner/')) {
            localStorage.setItem('userRole', 'delivery-partner');
          }
        }
      }),
      catchError((error: any) => {
        return throwError(() => error);
      })
    );
  }

  loginWithGoogle(role: string): void {
    window.location.href = `${this.backendBaseUrl}/oauth2/authorization/google?appRole=${role}`;
  }

  handleGoogleToken(token: string, userType?: string): void {
    localStorage.setItem('token', token);

    if (userType === 'CUSTOMER') {
      localStorage.setItem('userRole', 'customer');
    } else if (userType === 'RESTAURANT_OWNER') {
      localStorage.setItem('userRole', 'restaurant');
    } else if (userType === 'DELIVERY_AGENT') {
      localStorage.setItem('userRole', 'delivery-partner');
    }
  }

  forgotPassword(rolePath: string, email: string): Observable<OtpResponse> {
    return this.http.post<OtpResponse>(`${this.apiUrl}/${rolePath}/forget-password`, { email }).pipe(
      catchError((error: any) => {
        return throwError(() => error);
      })
    );
  }

  verifyOtp(rolePath: string, email: string, otp: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/${rolePath}/verify-otp`, { email, otp }).pipe(
      catchError((error: any) => {
        return throwError(() => error);
      })
    );
  }

  resetPassword(rolePath: string, email: string, newPassword: string, confirmPassword: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/${rolePath}/reset-password`, {
      email,
      newPassword,
      confirmPassword
    }).pipe(
      catchError((error: any) => {
        return throwError(() => error);
      })
    );
  }

  logout() {
    const userRole = localStorage.getItem('userRole');

    localStorage.removeItem('token');
    localStorage.removeItem('userRole');

    if (userRole === 'restaurant') {
      this.router.navigate(['/restaurant/auth']);
    } else if (userRole === 'delivery-partner') {
      this.router.navigate(['/delivery-partner/auth']);
    } else {
      this.router.navigate(['/customer/auth']);
    }
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken() {
    return localStorage.getItem('token');
  }

  getUserRole() {
    return localStorage.getItem('userRole');
  }
}