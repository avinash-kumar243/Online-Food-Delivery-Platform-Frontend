import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, throwError } from 'rxjs';
import { AdminUserRecord, DashboardStats } from '../models/app.models';
import { OrderService } from './order.service';
import { PaymentService } from './payment.service';
import { RestaurantService } from './restaurant.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly orderService = inject(OrderService);
  private readonly paymentService = inject(PaymentService);
  private readonly restaurantService = inject(RestaurantService);

  getDashboardStats(): Observable<DashboardStats> {
    return forkJoin({
      orders: this.orderService.getAllOrdersForAdmin(),
      payments: this.paymentService.getAllPaymentsForAdmin(),
      restaurants: this.restaurantService.getApprovedRestaurants()
    }).pipe(
      map(({ orders, payments, restaurants }) => ({
        totalOrders: orders.length,
        totalRevenue: payments.filter((payment) => payment.status === 'PAID').reduce((sum, payment) => sum + Number(payment.amount), 0),
        totalPayments: payments.length,
        refundCount: payments.filter((payment) => payment.status === 'REFUNDED').length,
        totalRestaurants: restaurants.length
      }))
    );
  }

  getUsers(): Observable<AdminUserRecord[]> {
    // TODO: backend needs an admin user-management endpoint to list platform users.
    return throwError(() => new Error('User management endpoint is not available in backend yet.'));
  }

  suspendUser(_userId: number): Observable<void> {
    // TODO: backend needs an admin suspend user endpoint.
    return throwError(() => new Error('Suspend user endpoint is not available in backend yet.'));
  }

  reactivateUser(_userId: number): Observable<void> {
    // TODO: backend needs an admin reactivate user endpoint.
    return throwError(() => new Error('Reactivate user endpoint is not available in backend yet.'));
  }

  deleteUser(_userId: number): Observable<void> {
    // TODO: backend needs an admin delete user endpoint.
    return throwError(() => new Error('Delete user endpoint is not available in backend yet.'));
  }

  getPlatformStats(): Observable<DashboardStats> {
    return this.getDashboardStats();
  }
}
