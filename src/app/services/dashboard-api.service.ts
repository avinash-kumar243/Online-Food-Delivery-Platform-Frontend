import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DeliverySummary, OrderSummary, ProfileSummary, Restaurant } from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.backendBaseUrl;

  getCustomerProfile(customerId: number): Observable<ProfileSummary> {
    return this.http.get<ProfileSummary>(`${this.baseUrl}/auth/customer/profile/${customerId}`);
  }

  getRestaurantOwnerProfile(ownerId: number): Observable<ProfileSummary> {
    return this.http.get<ProfileSummary>(`${this.baseUrl}/auth/restaurant/profile/${ownerId}`);
  }

  getDeliveryPartnerProfile(partnerId: number): Observable<ProfileSummary> {
    return this.http.get<ProfileSummary>(`${this.baseUrl}/auth/delivery-partner/profile/${partnerId}`);
  }

  browseRestaurants(query = ''): Observable<Restaurant[]> {
    const params = new HttpParams().set('name', query.trim());
    return this.http.get<Restaurant[]>(`${this.baseUrl}/restaurants/search`, { params });
  }

  getRestaurantsByOwner(ownerId: number): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>(`${this.baseUrl}/restaurants/owner/${ownerId}`);
  }

  registerRestaurant(restaurant: Restaurant): Observable<Restaurant> {
    return this.http.post<Restaurant>(`${this.baseUrl}/restaurants`, restaurant);
  }

  toggleRestaurantOpen(restaurantId: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/restaurants/toggleOpen/${restaurantId}`, {});
  }

  getCustomerOrders(customerId: number): Observable<OrderSummary[]> {
    return this.http.get<OrderSummary[]>(`${this.baseUrl}/orders/customer/${customerId}`);
  }

  getRestaurantOrders(restaurantId: number): Observable<OrderSummary[]> {
    return this.http.get<OrderSummary[]>(`${this.baseUrl}/orders/restaurant/${restaurantId}`);
  }

  getAvailableDeliveries(): Observable<DeliverySummary[]> {
    return this.http.get<DeliverySummary[]>(`${this.baseUrl}/deliveries/available`);
  }

  getAcceptedDeliveries(partnerId: number): Observable<DeliverySummary[]> {
    return this.http.get<DeliverySummary[]>(`${this.baseUrl}/deliveries/partner/${partnerId}/active`);
  }

  getDeliveryHistory(partnerId: number): Observable<DeliverySummary[]> {
    return this.http.get<DeliverySummary[]>(`${this.baseUrl}/deliveries/partner/${partnerId}/history`);
  }

  updateDeliveryAvailability(partnerId: number, online: boolean): Observable<{ online: boolean }> {
    return this.http.put<{ online: boolean }>(`${this.baseUrl}/deliveries/partner/${partnerId}/availability`, { online });
  }
}
