import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiResponse,
  AdminDeliveryPartnerRecord,
  AdminRestaurantRecord,
  AdminUserRecord,
  DashboardStats,
  Order,
  Payment
} from '../models/app.models';
import { UserRole } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getDashboardStats(): Observable<DashboardStats> {
    return forkJoin({
      users: this.getUsers(),
      restaurants: this.getAllRestaurants(),
      pendingRestaurants: this.getPendingRestaurants(),
      pendingAgents: this.getPendingDeliveryPartners(),
      orders: this.getAllOrders(),
      payments: this.getAllPayments()
    }).pipe(
      map(({ users, restaurants, pendingRestaurants, pendingAgents, orders, payments }) => ({
        totalCustomers: users.filter((user) => user.role === 'CUSTOMER').length,
        totalRestaurantOwners: users.filter((user) => user.role === 'RESTAURANT_OWNER').length,
        totalDeliveryPartners: users.filter((user) => user.role === 'DELIVERY_PARTNER').length,
        totalRestaurants: restaurants.length,
        pendingRestaurantApprovals: pendingRestaurants.length,
        pendingDeliveryPartnerApprovals: pendingAgents.length,
        totalOrders: orders.length,
        totalRevenue: payments.filter((payment) => payment.status === 'PAID').reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
        pendingOrders: orders.filter((order) => ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(order.orderStatus)).length,
        completedOrders: orders.filter((order) => order.orderStatus === 'DELIVERED').length,
        totalPayments: payments.length,
        totalReviews: 0
      }))
    );
  }

  getUsers(role?: UserRole): Observable<AdminUserRecord[]> {
    const url = role
      ? `${this.baseUrl}/admin/users/role/${role}`
      : `${this.baseUrl}/admin/users`;
    return this.http.get<Array<{
      userId: number;
      fullName: string;
      email: string;
      phone?: string | null;
      role: UserRole;
      status: string;
      isActive: boolean;
    }>>(url).pipe(
      map((items) => items.map((item) => ({
        id: item.userId,
        fullName: item.fullName,
        email: item.email,
        phone: item.phone,
        role: item.role,
        status: item.status,
        isActive: item.isActive
      })))
    );
  }

  suspendUser(userId: number, role: UserRole): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/admin/users/${userId}/suspend?role=${role}`, {});
  }

  reactivateUser(userId: number, role: UserRole): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/admin/users/${userId}/reactivate?role=${role}`, {});
  }

  deleteUser(userId: number, role: UserRole): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/admin/users/${userId}?role=${role}`);
  }

  getPendingRestaurants(): Observable<AdminRestaurantRecord[]> {
    return this.http.get<AdminRestaurantRecord[]>(`${this.baseUrl}/admin/restaurants/pending`);
  }

  getAllRestaurants(): Observable<AdminRestaurantRecord[]> {
    return this.http.get<AdminRestaurantRecord[]>(`${this.baseUrl}/admin/restaurants/all`);
  }

  approveRestaurant(restaurantId: number, adminId: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/admin/restaurants/${restaurantId}/approve`, { adminId });
  }

  rejectRestaurant(restaurantId: number, adminId: number, feedback: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/admin/restaurants/${restaurantId}/reject`, { adminId, feedback });
  }

  getPendingDeliveryPartners(): Observable<AdminDeliveryPartnerRecord[]> {
    return this.http.get<AdminDeliveryPartnerRecord[]>(`${this.baseUrl}/admin/agents/pending`);
  }

  getAllDeliveryPartners(): Observable<AdminDeliveryPartnerRecord[]> {
    return this.http.get<AdminDeliveryPartnerRecord[]>(`${this.baseUrl}/admin/agents/all`);
  }

  approveDeliveryPartner(agentId: number, adminId: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/admin/agents/${agentId}/verify`, { adminId });
  }

  rejectDeliveryPartner(agentId: number, adminId: number, feedback: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/admin/agents/${agentId}/reject`, { adminId, feedback });
  }

  getAllOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/admin/orders`);
  }

  getAllPayments(): Observable<Payment[]> {
    return this.http.get<ApiResponse<Payment[]>>(`${this.baseUrl}/admin/payments`).pipe(map((response) => response.data));
  }
}
