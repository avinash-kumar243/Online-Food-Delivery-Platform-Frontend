import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Order, OrderStatus, PlaceOrderRequest } from '../models/app.models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.orderBaseUrl;
  private readonly fallbackBaseUrl = environment.orderServiceDirectBaseUrl ?? this.baseUrl;

  placeOrder(payload: PlaceOrderRequest): Observable<Order> {
    return this.postWithFallback('/orders/place', payload);
  }

  getCustomerOrders(customerId: number): Observable<Order[]> {
    return this.getWithFallback(`/orders/customer/${customerId}`);
  }

  getOrderById(orderId: number): Observable<Order> {
    return this.getWithFallback(`/orders/${orderId}`);
  }

  getRestaurantOrders(restaurantId: number): Observable<Order[]> {
    return this.getWithFallback(`/orders/restaurant/${restaurantId}`);
  }

  getAvailableDeliveryOrders(): Observable<Order[]> {
    return this.getWithFallback('/orders/delivery/available');
  }

  acceptDeliveryOrder(orderId: number, deliveryAgentId: number): Observable<Order> {
    return this.putWithFallback(`/orders/${orderId}/assign-agent`, { deliveryAgentId });
  }

  getDeliveryPartnerOrders(agentId: number): Observable<Order[]> {
    return this.getWithFallback(`/orders/agent/${agentId}`);
  }

  updateOrderStatus(orderId: number, orderStatus: OrderStatus): Observable<Order> {
    return this.putWithFallback(`/orders/${orderId}/status`, { orderStatus });
  }

  cancelOrder(orderId: number): Observable<Order> {
    return this.putWithFallback(`/orders/${orderId}/cancel`, {});
  }

  getAllOrdersForAdmin(): Observable<Order[]> {
    return this.http.get<Order[]>(`${environment.apiGatewayBaseUrl}/api/v1/admin/orders`);
  }

  private getWithFallback<T>(path: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`).pipe(
      catchError((error) => this.retryDirect(() => this.http.get<T>(`${this.fallbackBaseUrl}${path}`), error))
    );
  }

  private postWithFallback<T>(path: string, payload: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, payload).pipe(
      catchError((error) => this.retryDirect(() => this.http.post<T>(`${this.fallbackBaseUrl}${path}`, payload), error))
    );
  }

  private putWithFallback<T>(path: string, payload: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, payload).pipe(
      catchError((error) => this.retryDirect(() => this.http.put<T>(`${this.fallbackBaseUrl}${path}`, payload), error))
    );
  }

  private retryDirect<T>(request: () => Observable<T>, error: { status?: number }): Observable<T> {
    if (error?.status !== 0 || this.fallbackBaseUrl === this.baseUrl) {
      return throwError(() => error);
    }

    return request();
  }
}
