import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export interface AuthPromptState {
  title: string;
  message: string;
  returnUrl: string;
}

@Injectable({ providedIn: 'root' })
export class CustomerAccessService {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly promptState = signal<AuthPromptState | null>(null);

  readonly authPrompt = computed(() => this.promptState());

  isCustomerLoggedIn(): boolean {
    return this.authService.isLoggedIn() && this.authService.getUserRole() === 'CUSTOMER';
  }

  requestAuth(returnUrl: string, message = 'Please login or sign up to continue.'): void {
    this.promptState.set({
      title: 'Continue your order',
      message,
      returnUrl
    });
  }

  closePrompt(): void {
    this.promptState.set(null);
  }

  goToLogin(): void {
    const returnUrl = this.promptState()?.returnUrl ?? '/customer/dashboard';
    this.closePrompt();
    this.router.navigate(['/customer/auth'], { queryParams: { returnUrl, mode: 'login' } });
  }

  goToSignup(): void {
    const returnUrl = this.promptState()?.returnUrl ?? '/customer/dashboard';
    this.closePrompt();
    this.router.navigate(['/customer/auth'], { queryParams: { returnUrl, mode: 'signup' } });
  }
}
