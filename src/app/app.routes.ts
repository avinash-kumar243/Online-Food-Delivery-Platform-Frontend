import { Routes } from '@angular/router';
import { CustomerAuthComponent } from './components/auth/customer-auth/customer-auth';
import { RestaurantAuthComponent } from './components/auth/restaurant-auth/restaurant-auth';
import { DeliveryPartnerAuthComponent } from './components/auth/delivery-partner-auth/delivery-partner-auth';
import { Welcome } from './components/welcome/welcome';
import { authGuard } from './guards/auth.guard';
import { dashboardRoleGuard } from './guards/dashboard-role.guard';
import { DashboardRedirectComponent } from './pages/dashboard-redirect/dashboard-redirect.component';
import { CustomerDashboardComponent } from './pages/customer-dashboard/customer-dashboard.component';
import { RestaurantOwnerDashboardComponent } from './pages/restaurant-owner-dashboard/restaurant-owner-dashboard.component';
import { DeliveryPartnerDashboardComponent } from './pages/delivery-partner-dashboard/delivery-partner-dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: '/welcome', pathMatch: 'full' },
  { path: 'welcome', component: Welcome },

  { path: 'customer/auth', component: CustomerAuthComponent },
  { path: 'restaurant/auth', component: RestaurantAuthComponent },
  { path: 'delivery-partner/auth', component: DeliveryPartnerAuthComponent },

  { path: 'dashboard', component: DashboardRedirectComponent },
  {
    path: 'dashboard/customer',
    component: CustomerDashboardComponent,
    canActivate: [authGuard, dashboardRoleGuard],
    data: { role: 'CUSTOMER' }
  },
  {
    path: 'dashboard/restaurant-owner',
    component: RestaurantOwnerDashboardComponent,
    canActivate: [authGuard, dashboardRoleGuard],
    data: { role: 'RESTAURANT_OWNER' }
  },
  {
    path: 'dashboard/delivery-partner',
    component: DeliveryPartnerDashboardComponent,
    canActivate: [authGuard, dashboardRoleGuard],
    data: { role: 'DELIVERY_PARTNER' }
  },
  { path: '**', redirectTo: '/welcome' }
];
