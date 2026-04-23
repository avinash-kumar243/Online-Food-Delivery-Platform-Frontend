import { Routes } from '@angular/router';
import { CustomerAuthComponent } from './components/auth/customer-auth/customer-auth';
import { RestaurantAuthComponent } from './components/auth/restaurant-auth/restaurant-auth';
import { DeliveryPartnerAuthComponent } from './components/auth/delivery-partner-auth/delivery-partner-auth';
import { Welcome} from './components/welcome/welcome';
import { Dashboard } from './components/dashboard/dashboard';

export const routes: Routes = [
  { path: '', redirectTo: '/welcome', pathMatch: 'full' },
  { path: 'welcome', component: Welcome },

  { path:'customer/auth', component: CustomerAuthComponent },
  { path: 'restaurant/auth', component: RestaurantAuthComponent },
  { path: 'delivery-partner/auth', component: DeliveryPartnerAuthComponent },

  { path: 'dashboard', component: Dashboard }
];