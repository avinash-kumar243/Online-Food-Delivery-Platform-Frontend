import { ShellNavItem } from '../models/app.models';
import { UserRole } from '../models/auth.models';

export const ROLE_NAV_ITEMS: Record<UserRole, ShellNavItem[]> = {
  CUSTOMER: [
    { label: 'Dashboard', path: '/customer/dashboard', icon: 'Home' },
    { label: 'Restaurants', path: '/customer/restaurants', icon: 'Fork' },
    { label: 'Cart', path: '/customer/cart', icon: 'Cart' },
    { label: 'Orders', path: '/customer/orders', icon: 'Order' },
    { label: 'Stats', path: '/customer/stats', icon: 'Trend' }
  ],
  RESTAURANT_OWNER: [
    { label: 'Dashboard', path: '/restaurant-owner/dashboard', icon: 'Home' },
    { label: 'Register Restaurant', path: '/restaurant-owner/register-restaurant', icon: 'Store' },
    { label: 'Menu', path: '/restaurant-owner/menu', icon: 'Menu' },
    { label: 'Orders', path: '/restaurant-owner/orders', icon: 'Order' },
    { label: 'Stats', path: '/restaurant-owner/stats', icon: 'Trend' }
  ],
  DELIVERY_PARTNER: [
    { label: 'Dashboard', path: '/delivery-partner/dashboard', icon: 'Home' },
    { label: 'Register', path: '/delivery-partner/register', icon: 'Profile' },
    { label: 'Available Orders', path: '/delivery-partner/available-orders', icon: 'Map' },
    { label: 'My Deliveries', path: '/delivery-partner/my-deliveries', icon: 'Scooter' },
    { label: 'Earnings', path: '/delivery-partner/earnings', icon: 'Wallet' }
  ],
  ADMIN: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: 'Home' },
    { label: 'Users', path: '/admin/users', icon: 'Users' },
    { label: 'Restaurant Approvals', path: '/admin/restaurants/approvals', icon: 'Store' },
    { label: 'Delivery Approvals', path: '/admin/delivery-partners/approvals', icon: 'Shield' },
    { label: 'Orders', path: '/admin/orders', icon: 'Order' },
    { label: 'Payments', path: '/admin/payments', icon: 'Wallet' }
  ]
};

export const ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: 'Customer',
  RESTAURANT_OWNER: 'Restaurant Owner',
  DELIVERY_PARTNER: 'Delivery Partner',
  ADMIN: 'Admin'
};
