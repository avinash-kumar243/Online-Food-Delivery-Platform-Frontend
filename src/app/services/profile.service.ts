import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CustomerProfile, DeliveryPartner, RestaurantOwnerProfile } from '../models/app.models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly authBaseUrl = environment.apiGatewayBaseUrl;

  getCustomerProfile(customerId: number): Observable<CustomerProfile> {
    return this.http.get<CustomerProfile>(`${this.authBaseUrl}/auth/customer/profile/${customerId}`);
  }

  getRestaurantOwnerProfile(ownerId: number): Observable<RestaurantOwnerProfile> {
    return this.http.get<RestaurantOwnerProfile>(`${this.authBaseUrl}/auth/restaurant/profile/${ownerId}`);
  }

  getDeliveryPartnerProfile(partnerId: number): Observable<DeliveryPartner> {
    return this.http.get<DeliveryPartner>(`${this.authBaseUrl}/auth/delivery-partner/profile/${partnerId}`);
  }

  updateDeliveryPartnerProfile(partnerId: number, payload: Record<string, unknown>): Observable<DeliveryPartner> {
    return this.http.put<DeliveryPartner>(`${this.authBaseUrl}/auth/delivery-partner/profile/${partnerId}`, payload);
  }
}
