import { Routes } from '@angular/router';
import { CustomerAuthComponent } from './components/auth/customer-auth/customer-auth';
import { RestaurantAuthComponent } from './components/auth/restaurant-auth/restaurant-auth';
import { DeliveryPartnerAuthComponent } from './components/auth/delivery-partner-auth/delivery-partner-auth';
import { Welcome} from './components/welcome/welcome';
import { Dashboard } from './components/dashboard/dashboard';

export const routes: Routes = [
     { path: 'welcome', component: Welcome },

    { path:'auth/customer', component: CustomerAuthComponent },
    { path: 'auth/restaurant', component: RestaurantAuthComponent },
    { path: 'auth/delivery-partner', component: DeliveryPartnerAuthComponent },

    { path: 'dashboard', component: Dashboard }
];
