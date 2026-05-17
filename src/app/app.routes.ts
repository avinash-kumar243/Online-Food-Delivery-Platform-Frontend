import { Routes } from '@angular/router';
import { CustomerAuthComponent } from './components/auth/customer-auth/customer-auth';
import { RestaurantAuthComponent } from './components/auth/restaurant-auth/restaurant-auth';
import { DeliveryPartnerAuthComponent } from './components/auth/delivery-partner-auth/delivery-partner-auth';
import { Welcome } from './components/welcome/welcome';
import { AppShellComponent } from './components/shell/app-shell.component';
import { authGuard } from './guards/auth.guard';
import { customerAuthGuard } from './guards/customer-auth.guard';
import { dashboardRoleGuard } from './guards/dashboard-role.guard';
import { DashboardRedirectComponent } from './pages/dashboard-redirect/dashboard-redirect.component';
import { AdminAnalyticsPageComponent } from './pages/admin/admin-analytics-page.component';
import { AdminAuthPageComponent } from './pages/admin/admin-auth-page.component';
import { AdminDashboardPageComponent } from './pages/admin/admin-dashboard-page.component';
import { AdminDeliveryPartnersPageComponent } from './pages/admin/admin-delivery-partners-page.component';
import { AdminOrdersPageComponent } from './pages/admin/admin-orders-page.component';
import { AdminPaymentsPageComponent } from './pages/admin/admin-payments-page.component';
import { AdminReviewsPageComponent } from './pages/admin/admin-reviews-page.component';
import { AdminRestaurantsPageComponent } from './pages/admin/admin-restaurants-page.component';
import { AdminUsersPageComponent } from './pages/admin/admin-users-page.component';
import { CustomerCartPageComponent } from './pages/customer/customer-cart-page.component';
import { CustomerDashboardPageComponent } from './pages/customer/customer-dashboard-page.component';
import { CustomerOrderDetailPageComponent } from './pages/customer/customer-order-detail-page.component';
import { CustomerOrdersPageComponent } from './pages/customer/customer-orders-page.component';
import { CustomerProfilePageComponent } from './pages/customer/customer-profile-page.component';
import { CustomerRestaurantsPageComponent } from './pages/customer/customer-restaurants-page.component';
import { CustomerStatsPageComponent } from './pages/customer/customer-stats-page.component';
import { RestaurantDetailPageComponent } from './pages/customer/restaurant-detail-page.component';
import { AvailableOrdersPageComponent } from './pages/delivery-partner/available-orders-page.component';
import { DeliveryPartnerDashboardPageComponent } from './pages/delivery-partner/delivery-partner-dashboard-page.component';
import { PartnerProfilePageComponent } from './pages/delivery-partner/partner-profile-page.component';
import { DeliveryRegistrationPageComponent } from './pages/delivery-partner/delivery-registration-page.component';
import { MyDeliveriesPageComponent } from './pages/delivery-partner/my-deliveries-page.component';
import { PartnerEarningsPageComponent } from './pages/delivery-partner/partner-earnings-page.component';
import { MenuItemFormPageComponent } from './pages/restaurant-owner/menu-item-form-page.component';
import { OwnerProfilePageComponent } from './pages/restaurant-owner/owner-profile-page.component';
import { OwnerMenuPageComponent } from './pages/restaurant-owner/owner-menu-page.component';
import { OwnerOrdersPageComponent } from './pages/restaurant-owner/owner-orders-page.component';
import { OwnerStatsPageComponent } from './pages/restaurant-owner/owner-stats-page.component';
import { RestaurantOwnerDashboardPageComponent } from './pages/restaurant-owner/restaurant-owner-dashboard-page.component';
import { RestaurantRegistrationPageComponent } from './pages/restaurant-owner/restaurant-registration-page.component';

export const routes: Routes = [
  { path: '', redirectTo: '/welcome', pathMatch: 'full' },
  { path: 'welcome', component: Welcome },

  { path: 'customer/auth', component: CustomerAuthComponent },
  { path: 'restaurant/auth', component: RestaurantAuthComponent },
  { path: 'delivery-partner/auth', component: DeliveryPartnerAuthComponent },
  { path: 'admin/auth', component: AdminAuthPageComponent },

  { path: 'dashboard', component: DashboardRedirectComponent },
  { path: 'dashboard/customer', redirectTo: '/customer/dashboard', pathMatch: 'full' },
  { path: 'dashboard/restaurant-owner', redirectTo: '/restaurant-owner/dashboard', pathMatch: 'full' },
  { path: 'dashboard/delivery-partner', redirectTo: '/delivery-partner/dashboard', pathMatch: 'full' },
  { path: 'dashboard/admin', redirectTo: '/admin/dashboard', pathMatch: 'full' },
  {
    path: 'customer',
    component: AppShellComponent,
    data: { role: 'CUSTOMER' },
    children: [
      { path: 'dashboard', component: CustomerDashboardPageComponent },
      { path: 'restaurants', component: CustomerRestaurantsPageComponent },
      { path: 'restaurants/:restaurantId', component: RestaurantDetailPageComponent },
      { path: 'cart', component: CustomerCartPageComponent, canActivate: [customerAuthGuard] },
      { path: 'orders', component: CustomerOrdersPageComponent, canActivate: [customerAuthGuard] },
      { path: 'orders/:orderId', component: CustomerOrderDetailPageComponent, canActivate: [customerAuthGuard] },
      { path: 'stats', component: CustomerStatsPageComponent, canActivate: [customerAuthGuard] },
      { path: 'profile', component: CustomerProfilePageComponent, canActivate: [customerAuthGuard] },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'restaurant-owner',
    component: AppShellComponent,
    canActivate: [authGuard, dashboardRoleGuard],
    data: { role: 'RESTAURANT_OWNER' },
    children: [
      { path: 'dashboard', component: RestaurantOwnerDashboardPageComponent },
      { path: 'register-restaurant', component: RestaurantRegistrationPageComponent },
      { path: 'menu', component: OwnerMenuPageComponent },
      { path: 'menu/add', component: MenuItemFormPageComponent },
      { path: 'menu/edit/:itemId', component: MenuItemFormPageComponent },
      { path: 'orders', component: OwnerOrdersPageComponent },
      { path: 'stats', component: OwnerStatsPageComponent },
      { path: 'profile', component: OwnerProfilePageComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'delivery-partner',
    component: AppShellComponent,
    canActivate: [authGuard, dashboardRoleGuard],
    data: { role: 'DELIVERY_PARTNER' },
    children: [
      { path: 'dashboard', component: DeliveryPartnerDashboardPageComponent },
      { path: 'register', component: DeliveryRegistrationPageComponent },
      { path: 'available-orders', component: AvailableOrdersPageComponent },
      { path: 'my-deliveries', component: MyDeliveriesPageComponent },
      { path: 'earnings', component: PartnerEarningsPageComponent },
      { path: 'profile', component: PartnerProfilePageComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'admin',
    component: AppShellComponent,
    canActivate: [authGuard, dashboardRoleGuard],
    data: { role: 'ADMIN' },
    children: [
      { path: 'dashboard', component: AdminDashboardPageComponent },
      { path: 'users', component: AdminUsersPageComponent },
      { path: 'restaurants', component: AdminRestaurantsPageComponent, data: { pendingOnly: false } },
      { path: 'restaurants/pending', component: AdminRestaurantsPageComponent, data: { pendingOnly: true } },
      { path: 'delivery-partners', component: AdminDeliveryPartnersPageComponent, data: { pendingOnly: false } },
      { path: 'delivery-partners/pending', component: AdminDeliveryPartnersPageComponent, data: { pendingOnly: true } },
      { path: 'orders', component: AdminOrdersPageComponent },
      { path: 'payments', component: AdminPaymentsPageComponent },
      { path: 'reviews', component: AdminReviewsPageComponent },
      { path: 'analytics', component: AdminAnalyticsPageComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '/welcome' }
];
