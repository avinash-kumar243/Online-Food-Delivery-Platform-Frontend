import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CurrentUser } from '../../models/auth.models';
import { CustomerDashboardComponent } from './customer-dashboard.component';
import { RestoDashboardComponent } from './resto-dashboard.component';
import { DeliveryDashboardComponent } from './delivery-dashboard.component';

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [CommonModule, CustomerDashboardComponent, RestoDashboardComponent, DeliveryDashboardComponent],
  templateUrl: './dashboard-shell.component.html',
  styleUrls: ['./dashboard-shell.component.css']
})
export class DashboardShellComponent implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  currentUser: CurrentUser | null = null;
  roleLabel = '';

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const token = params['token'];
      const oauth2 = params['oauth2'];
      const userType = params['userType'];

      if (token && oauth2 === 'success') {
        this.authService.handleGoogleToken(token, userType);
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      }

      this.resolveUser();
    });
  }

  logout(): void {
    this.authService.logout();
  }

  private resolveUser(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (!this.currentUser) {
      this.router.navigate(['/customer/auth']);
      return;
    }

    this.roleLabel = {
      CUSTOMER: 'Customer',
      RESTAURANT_OWNER: 'Restaurant Owner',
      DELIVERY_PARTNER: 'Delivery Partner',
      ADMIN: 'Admin'
    }[this.currentUser.role] ?? 'QuickBite User';
  }
}
