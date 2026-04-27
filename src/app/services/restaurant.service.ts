import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Restaurant, RestaurantRegistrationRequest } from '../models/app.models';

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

    return this.http.get<Restaurant[]>(url).pipe(
      map((items) =>
        items
          .filter((item) => item.isApproved)
          .map((item) => ({
            ...item,
            status: item.isApproved ? 'APPROVED' : 'PENDING_APPROVAL'
          }))
      )
    );
  }

  getRestaurantById(id: number): Observable<Restaurant> {
    return this.http.get<Restaurant>(`${this.baseUrl}/restaurants/${id}`).pipe(
      map((item) => ({
        ...item,
        status: item.isApproved ? 'APPROVED' : 'PENDING_APPROVAL'
      }))
    );
  }

  registerRestaurant(payload: RestaurantRegistrationRequest): Observable<Restaurant> {
    return this.http.post<Restaurant>(`${this.baseUrl}/restaurants`, payload);
  }

  getMyRestaurant(ownerId: number): Observable<Restaurant | null> {
    return this.http.get<Restaurant[]>(`${this.baseUrl}/restaurants/owner/${ownerId}`).pipe(
      map((restaurants) => restaurants[0] ?? null)
    );
  }

  getMyRestaurants(ownerId: number): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>(`${this.baseUrl}/restaurants/owner/${ownerId}`);
  }

  getPendingRestaurantsForAdmin(): Observable<Restaurant[]> {
    // TODO: backend needs an admin-facing list endpoint for all/pending restaurants.
    return throwError(() => new Error('Pending restaurant approval endpoint is not available in backend yet.'));
  }

  approveRestaurant(restaurantId: number): Observable<Restaurant> {
    return this.http.patch<Restaurant>(`${this.baseUrl}/restaurants/${restaurantId}/approve`, { approved: true });
  }

  rejectRestaurant(restaurantId: number, _reason: string): Observable<Restaurant> {
    // TODO: backend currently supports only approved=true/false and no rejection feedback field.
    return this.http.patch<Restaurant>(`${this.baseUrl}/restaurants/${restaurantId}/approve`, { approved: false });
  }

  updateRestaurantStatus(restaurantId: number, open: boolean): Observable<Restaurant> {
    return this.http.patch<Restaurant>(`${this.baseUrl}/restaurants/${restaurantId}/toggle-status`, { open });
  }

  searchNearby(latitude: number, longitude: number): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>(`${this.baseUrl}/restaurants/nearby?latitude=${latitude}&longitude=${longitude}`);
  }
}
