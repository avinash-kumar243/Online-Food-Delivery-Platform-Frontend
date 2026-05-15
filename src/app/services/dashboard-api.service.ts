import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DeliverySummary, OrderSummary, ProfileSummary, Restaurant } from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly gatewayBaseUrl = environment.apiGatewayBaseUrl;
  private readonly apiBaseUrl = environment.apiBaseUrl;

  getCustomerProfile(customerId: number): Observable<ProfileSummary> {
    return this.http.get<ProfileSummary>(`${this.gatewayBaseUrl}/auth/customer/profile/${customerId}`);
  }

  getRestaurantOwnerProfile(ownerId: number): Observable<ProfileSummary> {
    return this.http.get<ProfileSummary>(`${this.gatewayBaseUrl}/auth/restaurant/profile/${ownerId}`);
  }

  getDeliveryPartnerProfile(partnerId: number): Observable<ProfileSummary> {
    return this.http.get<ProfileSummary>(`${this.gatewayBaseUrl}/auth/delivery-partner/profile/${partnerId}`);
  }

  browseRestaurants(query = ''): Observable<Restaurant[]> {
    const params = new HttpParams().set('name', query.trim());
    return this.http.get<Restaurant[]>(`${this.apiBaseUrl}/restaurants/search`, { params });
  }

  getRestaurantsByOwner(ownerId: number): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>(`${this.apiBaseUrl}/restaurants/owner/${ownerId}`);
  }

  registerRestaurant(restaurant: Restaurant): Observable<Restaurant> {
    return this.http.post<Restaurant>(`${this.apiBaseUrl}/restaurants`, restaurant);
  }

  toggleRestaurantOpen(restaurantId: number, open: boolean): Observable<Restaurant> {
    return this.http.patch<Restaurant>(`${this.apiBaseUrl}/restaurants/${restaurantId}/toggle-status`, { open });
  }

  getCustomerOrders(customerId: number): Observable<OrderSummary[]> {
    return this.http.get<OrderSummary[]>(`${this.apiBaseUrl}/orders/customer/${customerId}`);
  }

  getRestaurantOrders(restaurantId: number): Observable<OrderSummary[]> {
    return this.http.get<OrderSummary[]>(`${this.apiBaseUrl}/orders/restaurant/${restaurantId}`);
  }

  getAvailableDeliveries(): Observable<DeliverySummary[]> {
    return this.http.get<DeliverySummary[]>(`${this.gatewayBaseUrl}/deliveries/available`);
  }

  getAcceptedDeliveries(partnerId: number): Observable<DeliverySummary[]> {
    return this.http.get<DeliverySummary[]>(`${this.gatewayBaseUrl}/deliveries/partner/${partnerId}/active`);
  }

  getDeliveryHistory(partnerId: number): Observable<DeliverySummary[]> {
    return this.http.get<DeliverySummary[]>(`${this.gatewayBaseUrl}/deliveries/partner/${partnerId}/history`);
  }

  updateDeliveryAvailability(partnerId: number, online: boolean): Observable<{ online: boolean }> {
    return this.http.put<{ online: boolean }>(`${this.gatewayBaseUrl}/deliveries/partner/${partnerId}/availability`, { online });
  }
}

