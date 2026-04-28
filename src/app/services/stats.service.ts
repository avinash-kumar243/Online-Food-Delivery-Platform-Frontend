import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, switchMap } from 'rxjs';
import { CustomerStats, DashboardStats, Restaurant } from '../models/app.models';
import { OrderService } from './order.service';
import { PaymentService } from './payment.service';
import { RestaurantService } from './restaurant.service';
import { DeliveryPartnerService } from './delivery-partner.service';
import { AdminService } from './admin.service';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly orderService = inject(OrderService);
  private readonly paymentService = inject(PaymentService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly deliveryPartnerService = inject(DeliveryPartnerService);
  private readonly adminService = inject(AdminService);

  getCustomerStats(customerId: number): Observable<CustomerStats> {
    return forkJoin({
      orders: this.orderService.getCustomerOrders(customerId),
      payments: this.paymentService.getPaymentHistory(customerId),
      restaurants: this.restaurantService.getApprovedRestaurants()
    }).pipe(
      map(({ orders, payments, restaurants }) => {
        const deliveredOrders = orders.filter((order) => order.orderStatus === 'DELIVERED');
        const favoriteRestaurants = this.getFavoriteRestaurants(restaurants, orders);
        return {
          totalOrders: orders.length,
          totalAmountSpent: payments.filter((payment) => payment.status === 'PAID').reduce((sum, item) => sum + Number(item.amount), 0),
          cancelledOrders: orders.filter((order) => order.orderStatus === 'CANCELLED').length,
          recentOrders: [...orders].sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()).slice(0, 5),
          favoriteRestaurants,
          completedOrders: deliveredOrders.length
        };
      })
    );
  }

  getRestaurantOwnerStats(restaurantId: number): Observable<DashboardStats> {
    return this.orderService.getRestaurantOrders(restaurantId).pipe(
      map((orders) => ({
        totalOrders: orders.length,
        todayOrders: orders.filter((order) => new Date(order.orderDate).toDateString() === new Date().toDateString()).length,
        totalRevenue: orders.filter((order) => order.orderStatus === 'DELIVERED').reduce((sum, order) => sum + Number(order.finalAmount), 0),
        pendingOrders: orders.filter((order) => !['DELIVERED', 'CANCELLED'].includes(order.orderStatus)).length,
        completedOrders: orders.filter((order) => order.orderStatus === 'DELIVERED').length
      }))
    );
  }

  getDeliveryPartnerStats(partnerId: number): Observable<DashboardStats> {
    return this.deliveryPartnerService.getMyDeliveryProfile(partnerId).pipe(
      switchMap((profile) => this.orderService.getDeliveryPartnerOrders(profile.agentId ?? profile.partnerId).pipe(
        map((orders) => ({
          totalDeliveries: orders.filter((order) => order.orderStatus === 'DELIVERED').length,
          todayDeliveries: orders.filter((order) => order.orderStatus === 'DELIVERED' && new Date(order.orderDate).toDateString() === new Date().toDateString()).length,
          totalEarnings: orders.filter((order) => order.orderStatus === 'DELIVERED').reduce((sum, order) => sum + Number(order.finalAmount) * 0.12, 0),
          todayEarnings: orders.filter((order) => order.orderStatus === 'DELIVERED' && new Date(order.orderDate).toDateString() === new Date().toDateString()).reduce((sum, order) => sum + Number(order.finalAmount) * 0.12, 0),
          pendingOrders: orders.filter((order) => !['DELIVERED', 'CANCELLED'].includes(order.orderStatus)).length
        }))
      ))
    );
  }

  getAdminStats(): Observable<DashboardStats> {
    return this.adminService.getDashboardStats();
  }

  private getFavoriteRestaurants(restaurants: Restaurant[], orders: Array<{ restaurantId: number }>): Restaurant[] {
    const counts = new Map<number, number>();
    orders.forEach((order) => counts.set(order.restaurantId, (counts.get(order.restaurantId) ?? 0) + 1));
    return restaurants
      .filter((restaurant) => counts.has(restaurant.restaurantId))
      .sort((a, b) => (counts.get(b.restaurantId) ?? 0) - (counts.get(a.restaurantId) ?? 0))
      .slice(0, 3);
  }
}
