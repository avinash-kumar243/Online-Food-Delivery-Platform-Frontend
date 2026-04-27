import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Order, OrderStatus, PlaceOrderRequest } from '../models/app.models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.orderBaseUrl;

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
    return this.http.get<Order[]>(`${this.baseUrl}/orders/available`);
  }

  acceptDeliveryOrder(orderId: number, deliveryAgentId: number): Observable<Order> {
    return this.http.put<Order>(`${this.baseUrl}/orders/${orderId}/assign-agent`, { deliveryAgentId });
  }

  getDeliveryPartnerOrders(deliveryPartnerId: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders/delivery-agent/${deliveryPartnerId}`);
  }

  updateOrderStatus(orderId: number, orderStatus: OrderStatus): Observable<Order> {
    return this.http.put<Order>(`${this.baseUrl}/orders/${orderId}/status`, { orderStatus });
  }

  getAllOrdersForAdmin(): Observable<Order[]> {
    // TODO: backend needs a complete admin orders listing endpoint. Using active orders as a temporary best-effort feed.
    return this.http.get<Order[]>(`${this.baseUrl}/orders/active`);
  }
}
