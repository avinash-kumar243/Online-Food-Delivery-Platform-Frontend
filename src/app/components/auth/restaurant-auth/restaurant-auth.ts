import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-restaurant-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './restaurant-auth.html',
  styleUrls: ['./restaurant-auth.css']
})
export class RestaurantAuthComponent implements OnInit {
  isLoginMode = true;
  errorMessage = '';
  successMessage = '';

  forgotPasswordModalOpen = false;
  forgotStep: 'email' | 'otp' | 'reset' = 'email';
  otpTimer = 0;
  private otpInterval: any;

  currentRoleLabel = 'Restaurant';
  currentBackendRole = 'RESTAURANT_OWNER';

  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  authData = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    restaurantName: '',
    restaurantAddress: '',
    licenseNumber: '',
    businessRegistration: ''
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

      if (token && oauth2 === 'success') {
        this.authService.handleGoogleToken(token);
        this.successMessage = 'Google login successful! Redirecting...';

        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1000);
      }
    });
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
    this.stopOtpTimer();
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
    this.stopOtpTimer();
    this.clearMessages();
  }

  private startOtpTimer(seconds: number) {
    this.stopOtpTimer();
    this.otpTimer = seconds;

    this.otpInterval = setInterval(() => {
      if (this.otpTimer > 0) {
        this.otpTimer--;
      } else {
        this.stopOtpTimer();
      }
    }, 1000);
  }

  private stopOtpTimer() {
    if (this.otpInterval) {
      clearInterval(this.otpInterval);
      this.otpInterval = null;
    }
  }

  private isValidEmail(email: string): boolean {
    return /^(?=.*\d)(?=.*[^\w\s]).+@.+\..+$/.test(email);
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

    this.authService.forgotPassword(this.forgotPasswordData.email).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'OTP sent successfully';
        this.forgotStep = 'otp';
        this.startOtpTimer(res.expiryInSeconds || 60);
      },
      error: (err) => {
        this.errorMessage =
          err.error?.message || err.message || 'Account not found';
      }
    });
  }

  verifyOtp() {
    this.clearMessages();

    if (!this.forgotPasswordData.otp) {
      this.errorMessage = 'OTP is required!';
      return;
    }

    this.authService.verifyOtp(
      this.forgotPasswordData.email,
      this.forgotPasswordData.otp
    ).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'OTP verified successfully';
        this.forgotStep = 'reset';
        this.stopOtpTimer();
      },
      error: (err) => {
        this.errorMessage =
          err.error?.message || err.message || 'Invalid OTP';
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

    this.authService.resetPassword(
      this.forgotPasswordData.email,
      this.forgotPasswordData.password,
      this.forgotPasswordData.confirmPassword
    ).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Password reset successfully';

        setTimeout(() => {
          this.closeForgotPasswordModal();
          this.router.navigate(['/dashboard']);
        }, 1500);
      },
      error: (err) => {
        this.errorMessage =
          err.error?.message || err.message || 'Password reset failed';
      }
    });
  }

  onSubmit() {
    this.clearMessages();

    if (!this.authData.email || !this.authData.password) {
      this.errorMessage = 'Email and password are required!';
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

      if (!this.isValidEmail(this.authData.email)) {
        this.errorMessage =
          'Email must contain at least 1 digit, 1 special symbol, @ and .';
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

      // Use the correct endpoint for restaurant owner registration
      this.authService.register(signupData, '/restaurant/register').subscribe({
        next: () => {
          this.errorMessage = '';
          this.successMessage = 'Signup successful! Redirecting to login...';

          setTimeout(() => {
            this.clearMessages();
            this.router.navigate(['/dashboard']);
          }, 2000);
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

      // Use the correct endpoint for restaurant owner login
      this.authService.login(loginData, '/restaurant/login').subscribe({
        next: () => {
          this.errorMessage = '';
          this.successMessage = 'Login successful! Redirecting...';

          setTimeout(() => {
            this.clearMessages();
            this.router.navigate(['/dashboard']);
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
}
