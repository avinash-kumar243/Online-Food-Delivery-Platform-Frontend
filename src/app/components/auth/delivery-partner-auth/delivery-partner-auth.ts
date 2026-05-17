import { Component, ChangeDetectorRef, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-delivery-partner-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './delivery-partner-auth.html',
  styleUrls: ['./delivery-partner-auth.css']
})
export class DeliveryPartnerAuthComponent implements OnInit, OnDestroy {
  isLoginMode = true;
  errorMessage = '';
  successMessage = '';

  forgotPasswordModalOpen = false;
  forgotStep: 'email' | 'otp' | 'reset' = 'email';

  otpTimer = 0;
  resendCooldown = 0;

  isSendingOtp = false;
  isVerifyingOtp = false;
  isResettingPassword = false;
  isSubmittingAuth = false;

  private otpInterval: any;
  private resendCooldownInterval: any;

  currentRoleLabel = 'Delivery Partner';
  currentBackendRole = 'DELIVERY_AGENT';
  currentRolePath = 'delivery-partner';

  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  authData = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  };

  forgotPasswordData = {
    email: '',
    otp: '',
    password: '',
    confirmPassword: ''
  };

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const oauth2 = params['oauth2'];
      const userType = params['userType'];
      const userId = params['userId'] ? Number(params['userId']) : null;
      const reason = params['reason'];

      if (token && oauth2 === 'success') {
        this.authService.handleGoogleToken(token, userType, Number.isFinite(userId) ? userId : null);
        this.successMessage = 'Google login successful! Redirecting...';

        setTimeout(() => {
          this.navigateAfterAuth();
        }, 1000);
      } else if (oauth2 === 'failed') {
        this.errorMessage = reason || 'Google login failed. Please try again.';
      }
    });
  }

  ngOnDestroy(): void {
    this.stopOtpTimer();
    this.stopResendCooldown();
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.clearMessages();
  }

  loginWithGoogle() {
    this.clearMessages();
    this.authService.loginWithGoogle(this.currentBackendRole);
  }

  openForgotPasswordModal() {
    this.clearMessages();
    this.forgotPasswordModalOpen = true;
    this.forgotStep = 'email';
    this.forgotPasswordData = {
      email: '',
      otp: '',
      password: '',
      confirmPassword: ''
    };
    this.isSendingOtp = false;
    this.isVerifyingOtp = false;
    this.isResettingPassword = false;
    this.stopOtpTimer();
    this.stopResendCooldown();
    this.cdr.detectChanges();
  }

  closeForgotPasswordModal() {
    this.forgotPasswordModalOpen = false;
    this.forgotStep = 'email';
    this.forgotPasswordData = {
      email: '',
      otp: '',
      password: '',
      confirmPassword: ''
    };
    this.isSendingOtp = false;
    this.isVerifyingOtp = false;
    this.isResettingPassword = false;
    this.stopOtpTimer();
    this.stopResendCooldown();
    this.clearMessages();
    this.cdr.detectChanges();
  }

  private startOtpTimer(seconds: number) {
    this.stopOtpTimer();
    this.otpTimer = seconds;
    this.cdr.detectChanges();

    this.otpInterval = setInterval(() => {
      if (this.otpTimer > 0) {
        this.otpTimer--;
        if (this.otpTimer === 0 && this.forgotStep === 'otp') {
          this.errorMessage = 'Wrong otp. Please send otp again.';
          this.successMessage = '';
        }
      } else {
        this.stopOtpTimer();
        if (this.forgotStep === 'otp') {
          this.errorMessage = 'Wrong otp. Please send otp again.';
          this.successMessage = '';
        }
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  private stopOtpTimer() {
    if (this.otpInterval) {
      clearInterval(this.otpInterval);
      this.otpInterval = null;
    }
    this.otpTimer = 0;
    this.cdr.detectChanges();
  }

  private startResendCooldown(seconds: number) {
    this.stopResendCooldown();
    this.resendCooldown = seconds;
    this.cdr.detectChanges();

    this.resendCooldownInterval = setInterval(() => {
      if (this.resendCooldown > 0) {
        this.resendCooldown--;
      } else {
        this.stopResendCooldown();
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  private stopResendCooldown() {
    if (this.resendCooldownInterval) {
      clearInterval(this.resendCooldownInterval);
      this.resendCooldownInterval = null;
    }
    this.resendCooldown = 0;
    this.cdr.detectChanges();
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidPassword(password: string): boolean {
    return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^\w\s]).{8,}$/.test(password);
  }

  sendOtp() {
    this.clearMessages();

    if (!this.forgotPasswordData.email) {
      this.errorMessage = 'Email is required!';
      return;
    }

    if (!this.isValidEmail(this.forgotPasswordData.email)) {
      this.errorMessage = 'Enter a valid email address!';
      return;
    }

    if (this.isSendingOtp || this.resendCooldown > 0) {
      return;
    }

    this.isSendingOtp = true;
    this.startResendCooldown(3);

    this.authService
      .forgotPassword(this.currentRolePath, this.forgotPasswordData.email)
      .pipe(
        finalize(() => {
          this.isSendingOtp = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          this.successMessage = res.message || 'OTP sent to your email';
          this.forgotStep = 'otp';
          this.forgotPasswordData.otp = '';
          this.startOtpTimer(60);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || err.message || 'Account not found';
          this.cdr.detectChanges();
        }
      });
  }

  resendOtp() {
    if (this.isSendingOtp || this.resendCooldown > 0) {
      return;
    }

    this.clearMessages();
    this.sendOtp();
  }

  verifyOtp() {
    this.clearMessages();

    if (!this.forgotPasswordData.otp) {
      this.errorMessage = 'OTP is required!';
      return;
    }

    if (this.isVerifyingOtp) {
      return;
    }

    this.isVerifyingOtp = true;

    this.authService
      .verifyOtp(
        this.currentRolePath,
        this.forgotPasswordData.email,
        this.forgotPasswordData.otp
      )
      .pipe(
        finalize(() => {
          this.isVerifyingOtp = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          this.successMessage = res.message || 'OTP verified successfully';
          this.forgotStep = 'reset';
          this.forgotPasswordData.password = '';
          this.forgotPasswordData.confirmPassword = '';
          this.stopOtpTimer();
          this.stopResendCooldown();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || err.message || 'Wrong otp. Please send otp again.';
          this.successMessage = '';
          this.cdr.detectChanges();
        }
      });
  }

  submitNewPassword() {
    this.clearMessages();

    if (!this.forgotPasswordData.password || !this.forgotPasswordData.confirmPassword) {
      this.errorMessage = 'Password and confirm password are required!';
      return;
    }

    if (!this.isValidPassword(this.forgotPasswordData.password)) {
      this.errorMessage =
        'Password must contain at least 1 uppercase, 1 lowercase, 1 digit, 1 special symbol, and be at least 8 characters long.';
      return;
    }

    if (this.forgotPasswordData.password !== this.forgotPasswordData.confirmPassword) {
      this.errorMessage = 'Passwords do not match!';
      return;
    }

    if (this.isResettingPassword) {
      return;
    }

    this.isResettingPassword = true;

    this.authService
      .resetPassword(
        this.currentRolePath,
        this.forgotPasswordData.email,
        this.forgotPasswordData.password,
        this.forgotPasswordData.confirmPassword
      )
      .pipe(
        finalize(() => {
          this.isResettingPassword = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          this.successMessage = res.message || 'Password reset successfully';

          setTimeout(() => {
            this.closeForgotPasswordModal();
            this.router.navigate(['/delivery-partner/auth']);
          }, 1200);
        },
        error: (err) => {
          this.errorMessage = err.error?.message || err.message || 'Password reset failed';
        }
      });
  }

  onSubmit() {
    this.clearMessages();

    if (this.isSubmittingAuth) {
      return;
    }

    if (!this.authData.email || !this.authData.password) {
      this.errorMessage = 'Email and password are required!';
      return;
    }

    if (!this.isValidEmail(this.authData.email)) {
      this.errorMessage = 'Enter a valid email address!';
      return;
    }

    if (!this.isLoginMode) {
      if (!this.authData.fullName) {
        this.errorMessage = 'Full name is required!';
        return;
      }

      if (!this.authData.phone) {
        this.errorMessage = 'Phone number is required!';
        return;
      }

      if (!/^\d{10}$/.test(this.authData.phone)) {
        this.errorMessage = 'Phone number must be exactly 10 digits!';
        return;
      }

      if (!this.isValidPassword(this.authData.password)) {
        this.errorMessage =
          'Password must contain at least 1 uppercase, 1 lowercase, 1 digit, 1 special symbol, and be at least 8 characters long.';
        return;
      }

      if (this.authData.password !== this.authData.confirmPassword) {
        this.errorMessage = 'Passwords do not match!';
        return;
      }

      const signupData = {
        fullName: this.authData.fullName,
        email: this.authData.email,
        password: this.authData.password,
        phone: this.authData.phone
      };

      this.isSubmittingAuth = true;
      this.authService.register(signupData, '/delivery-partner/register').pipe(
        finalize(() => {
          this.isSubmittingAuth = false;
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: () => {
          this.errorMessage = '';
          this.successMessage = 'Signup successful! Redirecting...';

          setTimeout(() => {
            this.clearMessages();
            this.navigateAfterAuth();
          }, 1500);
        },
        error: (err) => {
          this.successMessage = '';
          this.errorMessage =
            err.error?.message || err?.error?.error || err.message || 'Signup failed. Please try again.';
        }
      });
    } else {
      const loginData = {
        email: this.authData.email,
        password: this.authData.password
      };

      this.isSubmittingAuth = true;
      this.authService.login(loginData, '/delivery-partner/login').pipe(
        finalize(() => {
          this.isSubmittingAuth = false;
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: () => {
          this.errorMessage = '';
          this.successMessage = 'Login successful! Redirecting...';

          setTimeout(() => {
            this.clearMessages();
            this.navigateAfterAuth();
          }, 1000);
        },
        error: (err) => {
          this.successMessage = '';
          this.errorMessage =
            err.error?.message || err.message || 'Login failed. Invalid credentials.';
        }
      });
    }
  }

  private navigateAfterAuth(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.authService.redirectToDashboard(returnUrl);
  }
}
