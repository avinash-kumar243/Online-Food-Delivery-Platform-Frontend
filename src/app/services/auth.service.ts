import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, CurrentUser, MessageResponse, OtpResponse, UserRole } from '../models/auth.models';
import { DASHBOARD_ROUTE_BY_ROLE } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly TOKEN_KEY = 'token';
  private static readonly ROLE_KEY = 'userRole';
  private static readonly EMAIL_KEY = 'authEmail';
  private static readonly USER_ID_KEY = 'authUserId';

  private http = inject(HttpClient);
  private router = inject(Router);
  private backendBaseUrl = environment.authBaseUrl ?? environment.backendBaseUrl;
  private apiUrl = `${this.backendBaseUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<CurrentUser | null>(this.resolveCurrentUser());

  currentUser$ = this.currentUserSubject.asObservable();

  register(userData: any, endpoint: string = '/register'): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}${endpoint}`, userData).pipe(
      tap((response: AuthResponse) => {
        this.persistAuthResponse(response, this.roleFromEndpoint(endpoint));
      }),
      catchError((error: any) => {
        return throwError(() => error);
      })
    );
  }

  login(credentials: any, endpoint: string = '/login'): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}${endpoint}`, credentials).pipe(
      tap((response: AuthResponse) => {
        this.persistAuthResponse(response, this.roleFromEndpoint(endpoint));
      }),
      catchError((error: any) => {
        return throwError(() => error);
      })
    );
  }

  loginWithGoogle(role: string): void {
    window.location.href = `${this.backendBaseUrl}/oauth2/authorization/google?appRole=${role}`;
  }

  handleGoogleToken(token: string, userType?: string, userId?: number | null): void {
    const role = this.normalizeRole(userType) ?? this.normalizeRole(this.storage.getItem(AuthService.ROLE_KEY)) ?? this.getRoleFromToken(token);
    this.persistSession(token, role ?? 'CUSTOMER', undefined, userId ?? undefined);
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
    const userRole = this.storage.getItem(AuthService.ROLE_KEY);

    this.clearStoredSession();
    this.currentUserSubject.next(null);

    if (userRole === 'ADMIN') {
      this.router.navigate(['/welcome']);
    } else if (userRole === 'RESTAURANT_OWNER' || userRole === 'restaurant') {
      this.router.navigate(['/restaurant/auth']);
    } else if (userRole === 'DELIVERY_PARTNER' || userRole === 'DELIVERY_AGENT' || userRole === 'delivery-partner') {
      this.router.navigate(['/delivery-partner/auth']);
    } else {
      this.router.navigate(['/customer/auth']);
    }
  }

  isLoggedIn(): boolean {
    const token = this.storage.getItem(AuthService.TOKEN_KEY);
    return !!token && !this.isTokenExpired(token);
  }

  getToken() {
    return this.storage.getItem(AuthService.TOKEN_KEY);
  }

  getUserRole(): UserRole | null {
    return this.resolveCurrentUser()?.role ?? null;
  }

  getCurrentUser(): CurrentUser | null {
    return this.resolveCurrentUser();
  }

  getDashboardRoute(role: UserRole | null = this.getUserRole()): string {
    return role ? DASHBOARD_ROUTE_BY_ROLE[role] : DASHBOARD_ROUTE_BY_ROLE.CUSTOMER;
  }

  redirectToDashboard(returnUrl?: string | null): void {
    const target = returnUrl?.trim() || this.getDashboardRoute();
    this.router.navigateByUrl(target);
  }

  clearInvalidSession(): void {
    this.clearStoredSession();
    this.currentUserSubject.next(null);
  }

  private persistAuthResponse(response: AuthResponse, fallbackRole: UserRole): void {
    if (!response.token?.trim()) {
      return;
    }

    const role = this.normalizeRole(response.role ?? response.userRole ?? response.userType) ?? fallbackRole;
    const id = response.id ?? response.userId ?? response.customerId ?? response.ownerId ?? response.partnerId;
    this.persistSession(response.token.trim(), role, response.email, id);
  }

  private persistSession(token: string, role: UserRole, email?: string, id?: number): void {
    this.storage.setItem(AuthService.TOKEN_KEY, token.trim());
    this.storage.setItem(AuthService.ROLE_KEY, role);

    const tokenEmail = this.getEmailFromToken(token);
    const resolvedEmail = email ?? tokenEmail;
    if (resolvedEmail) {
      this.storage.setItem(AuthService.EMAIL_KEY, resolvedEmail);
    }

    const tokenId = this.getIdFromToken(token);
    const resolvedId = id ?? tokenId;
    if (resolvedId !== null && resolvedId !== undefined && Number.isFinite(Number(resolvedId))) {
      this.storage.setItem(AuthService.USER_ID_KEY, String(resolvedId));
    }

    this.currentUserSubject.next(this.resolveCurrentUser());
  }

  private resolveCurrentUser(): CurrentUser | null {
    const token = this.storage.getItem(AuthService.TOKEN_KEY)?.trim();
    if (!token || this.isTokenExpired(token)) {
      return null;
    }

    const role = this.normalizeRole(this.storage.getItem(AuthService.ROLE_KEY)) ?? this.getRoleFromToken(token);
    if (!role) {
      return null;
    }

    const storedId = this.storage.getItem(AuthService.USER_ID_KEY);
    const parsedId = storedId ? Number(storedId) : this.getIdFromToken(token);

    return {
      token,
      role,
      email: this.storage.getItem(AuthService.EMAIL_KEY) ?? this.getEmailFromToken(token),
      id: Number.isFinite(parsedId) ? parsedId : null
    };
  }

  private clearStoredSession(): void {
    this.storage.removeItem(AuthService.TOKEN_KEY);
    this.storage.removeItem(AuthService.ROLE_KEY);
    this.storage.removeItem(AuthService.EMAIL_KEY);
    this.storage.removeItem(AuthService.USER_ID_KEY);
    localStorage.removeItem(AuthService.TOKEN_KEY);
    localStorage.removeItem(AuthService.ROLE_KEY);
    localStorage.removeItem(AuthService.EMAIL_KEY);
    localStorage.removeItem(AuthService.USER_ID_KEY);
  }

  private get storage(): Storage {
    this.migrateLegacySession();
    return sessionStorage;
  }

  private migrateLegacySession(): void {
    if (sessionStorage.getItem(AuthService.TOKEN_KEY)) {
      return;
    }

    const legacyToken = localStorage.getItem(AuthService.TOKEN_KEY);
    if (!legacyToken) {
      return;
    }

    const legacyRole = localStorage.getItem(AuthService.ROLE_KEY);
    const legacyEmail = localStorage.getItem(AuthService.EMAIL_KEY);
    const legacyUserId = localStorage.getItem(AuthService.USER_ID_KEY);

    sessionStorage.setItem(AuthService.TOKEN_KEY, legacyToken);
    if (legacyRole) {
      sessionStorage.setItem(AuthService.ROLE_KEY, legacyRole);
    }
    if (legacyEmail) {
      sessionStorage.setItem(AuthService.EMAIL_KEY, legacyEmail);
    }
    if (legacyUserId) {
      sessionStorage.setItem(AuthService.USER_ID_KEY, legacyUserId);
    }

    localStorage.removeItem(AuthService.TOKEN_KEY);
    localStorage.removeItem(AuthService.ROLE_KEY);
    localStorage.removeItem(AuthService.EMAIL_KEY);
    localStorage.removeItem(AuthService.USER_ID_KEY);
  }

  private roleFromEndpoint(endpoint: string): UserRole {
    if (endpoint.includes('/admin/')) return 'ADMIN';
    if (endpoint.includes('/restaurant/')) return 'RESTAURANT_OWNER';
    if (endpoint.includes('/delivery-partner/')) return 'DELIVERY_PARTNER';
    return 'CUSTOMER';
  }

  private normalizeRole(role?: string | null): UserRole | null {
    const normalized = role?.trim().toUpperCase().replace(/-/g, '_');
    if (!normalized) return null;
    if (normalized === 'ADMIN') return 'ADMIN';
    if (normalized === 'CUSTOMER') return 'CUSTOMER';
    if (normalized === 'RESTAURANT' || normalized === 'RESTAURANT_OWNER') return 'RESTAURANT_OWNER';
    if (normalized === 'DELIVERY_AGENT' || normalized === 'DELIVERY_PARTNER') return 'DELIVERY_PARTNER';
    return null;
  }

  private getRoleFromToken(token: string): UserRole | null {
    const payload = this.decodeJwtPayload(token);
    return this.normalizeRole(payload?.['role'] as string | undefined)
      ?? this.normalizeRole(payload?.['userRole'] as string | undefined)
      ?? this.normalizeRole(payload?.['userType'] as string | undefined);
  }

  private getEmailFromToken(token: string): string | null {
    const payload = this.decodeJwtPayload(token);
    const email = payload?.['sub'] ?? payload?.['email'];
    return typeof email === 'string' ? email : null;
  }

  private getIdFromToken(token: string): number | null {
    const payload = this.decodeJwtPayload(token);
    const id = payload?.['id'] ?? payload?.['userId'] ?? payload?.['customerId'] ?? payload?.['ownerId'] ?? payload?.['partnerId'];
    const parsed = Number(id);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodeJwtPayload(token);
    const exp = Number(payload?.['exp']);
    return Number.isFinite(exp) && Date.now() >= exp * 1000;
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join('')
      );
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
