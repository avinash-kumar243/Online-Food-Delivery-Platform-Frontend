import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Order, OrderStatus, PlaceOrderRequest } from '../models/app.models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  placeOrder(payload: PlaceOrderRequest): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/orders/place`, payload);
  }

  getCustomerOrders(customerId: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders/customer/${customerId}`);
  }

  getOrderById(orderId: number): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/orders/${orderId}`);
  }

  getRestaurantOrders(restaurantId: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders/restaurant/${restaurantId}`);
  }

  getAvailableDeliveryOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders/delivery/available`);
  }

  acceptDeliveryOrder(orderId: number, deliveryAgentId: number): Observable<Order> {
    return this.http.put<Order>(`${this.baseUrl}/orders/${orderId}/assign-agent`, { deliveryAgentId });
  }

  getDeliveryPartnerOrders(agentId: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders/agent/${agentId}`);
  }

  updateOrderStatus(orderId: number, orderStatus: OrderStatus): Observable<Order> {
    return this.http.put<Order>(`${this.baseUrl}/orders/${orderId}/status`, { orderStatus });
  }

  cancelOrder(orderId: number): Observable<Order> {
    return this.http.put<Order>(`${this.baseUrl}/orders/${orderId}/cancel`, {});
  }

  getAllOrdersForAdmin(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/admin/orders`);
  }
}
