import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { AdminRestaurantRecord, Restaurant, RestaurantRegistrationRequest } from '../models/app.models';

@Injectable({ providedIn: 'root' })
export class RestaurantService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.restaurantBaseUrl;

  getApprovedRestaurants(filters?: { name?: string; city?: string; cuisine?: string }): Observable<Restaurant[]> {
    const params = new URLSearchParams();
    if (filters?.name) params.set('name', filters.name);
    if (filters?.city) params.set('city', filters.city);
    if (filters?.cuisine) params.set('cuisine', filters.cuisine);
    const query = params.toString();
    const url = query ? `${this.baseUrl}/restaurants/search?${query}` : `${this.baseUrl}/restaurants/search`;

    return this.http.get<Restaurant[]>(url).pipe(map((items) => items.map((item) => this.withStatus(item))));
  }

  getRestaurantById(id: number): Observable<Restaurant> {
    return this.http.get<Restaurant>(`${this.baseUrl}/restaurants/${id}`).pipe(
      map((item) => this.withStatus(item))
    );
  }

  registerRestaurant(payload: RestaurantRegistrationRequest): Observable<Restaurant> {
    return this.http.post<Restaurant>(`${this.baseUrl}/restaurants`, payload);
  }

  getMyRestaurant(ownerId: number): Observable<Restaurant | null> {
    return this.http.get<Restaurant[]>(`${this.baseUrl}/restaurants/owner/${ownerId}`).pipe(
      map((restaurants) => restaurants.map((restaurant) => this.withStatus(restaurant))[0] ?? null)
    );
  }

  getMyRestaurants(ownerId: number): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>(`${this.baseUrl}/restaurants/owner/${ownerId}`);
  }

  getPendingRestaurantsForAdmin(): Observable<AdminRestaurantRecord[]> {
    return this.http.get<AdminRestaurantRecord[]>(`${environment.apiGatewayBaseUrl}/api/v1/admin/restaurants/pending`);
  }

  getAllRestaurantsForAdmin(): Observable<AdminRestaurantRecord[]> {
    return this.http.get<AdminRestaurantRecord[]>(`${environment.apiGatewayBaseUrl}/api/v1/admin/restaurants/all`);
  }

  approveRestaurant(restaurantId: number, adminId: number): Observable<void> {
    return this.http.put<void>(`${environment.apiGatewayBaseUrl}/api/v1/admin/restaurants/${restaurantId}/approve`, { adminId });
  }

  rejectRestaurant(restaurantId: number, adminId: number, feedback: string): Observable<void> {
    return this.http.put<void>(`${environment.apiGatewayBaseUrl}/api/v1/admin/restaurants/${restaurantId}/reject`, { adminId, feedback });
  }

  updateRestaurantStatus(restaurantId: number, open: boolean): Observable<Restaurant> {
    return this.http.patch<Restaurant>(`${this.baseUrl}/restaurants/${restaurantId}/toggle-status`, { open });
  }

  searchNearby(latitude: number, longitude: number): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>(`${this.baseUrl}/restaurants/nearby?lat=${latitude}&lng=${longitude}&radiusKm=5`);
  }

  private withStatus(restaurant: Restaurant): Restaurant {
    return {
      ...restaurant,
      status: restaurant.approvalStatus === 'REJECTED'
        ? 'REJECTED'
        : restaurant.isApproved
          ? 'APPROVED'
          : 'PENDING_APPROVAL'
    };
  }
}
