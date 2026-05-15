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

  updateCustomerProfile(customerId: number, payload: {
    fullName: string;
    phone: string;
    profilePicUrl: string;
  }): Observable<CustomerProfile> {
    return this.http.put<CustomerProfile>(`${this.authBaseUrl}/auth/customer/profile/${customerId}`, payload);
  }

  getRestaurantOwnerProfile(ownerId: number): Observable<RestaurantOwnerProfile> {
    return this.http.get<RestaurantOwnerProfile>(`${this.authBaseUrl}/auth/restaurant/profile/${ownerId}`);
  }

  updateRestaurantOwnerProfile(
    ownerId: number,
    payload: {
      fullName: string;
      phone: string;
      restaurantName: string;
      restaurantAddress: string;
      profilePicUrl: string;
    }
  ): Observable<RestaurantOwnerProfile> {
    return this.http.put<RestaurantOwnerProfile>(`${this.authBaseUrl}/auth/restaurant/profile/${ownerId}`, payload);
  }

  getDeliveryPartnerProfile(partnerId: number): Observable<DeliveryPartner> {
    return this.http.get<DeliveryPartner>(`${this.authBaseUrl}/auth/delivery-partner/profile/${partnerId}`);
  }

  updateDeliveryPartnerProfile(partnerId: number, payload: {
    fullName: string;
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
    licenseNumber: string;
    profilePicUrl: string;
    isVerified: boolean;
    isOnline: boolean;
  }): Observable<DeliveryPartner> {
    return this.http.put<DeliveryPartner>(`${this.authBaseUrl}/auth/delivery-partner/profile/${partnerId}`, payload);
  }
}
