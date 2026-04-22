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

  handleGoogleToken(token: string): void {
    localStorage.setItem('token', token);
  }


  forgotPassword(email: string): Observable<OtpResponse> {
    return this.http.post<OtpResponse>(`${this.apiUrl}/forgot-password`, { email }).pipe(
      catchError((error: any) => {
        return throwError(() => error);
      })
    );
  }

  verifyOtp(email: string, otp: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/verify-otp`, { email, otp }).pipe(
      catchError((error: any) => {
        return throwError(() => error);
      })
    );
  }

  resetPassword(email: string, password: string, confirmPassword: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/reset-password`, {
      email,
      password,
      confirmPassword
    }).pipe(
      catchError((error: any) => {
        return throwError(() => error);
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/auth/customer']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken() {
    return localStorage.getItem('token');
  }
}
