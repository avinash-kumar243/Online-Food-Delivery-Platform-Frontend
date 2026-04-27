import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { DeliveryPartner, DeliveryRegistrationRequest, DashboardStats } from '../models/app.models';
import { ProfileService } from './profile.service';
import { OrderService } from './order.service';

@Injectable({ providedIn: 'root' })
export class DeliveryPartnerService {
  private readonly profileService = inject(ProfileService);
  private readonly orderService = inject(OrderService);

  registerDeliveryPartner(payload: DeliveryRegistrationRequest): Observable<DeliveryPartner> {
    // TODO: backend profile endpoint does not currently persist address or document uploads.
    return this.profileService.updateDeliveryPartnerProfile(payload.partnerId, {
      vehicleType: payload.vehicleType,
      vehicleNumber: payload.vehicleNumber,
      licenseNumber: payload.licenseNumber,
      isVerified: false,
      isOnline: false
    });
  }

  getMyDeliveryProfile(partnerId: number): Observable<DeliveryPartner> {
    return this.profileService.getDeliveryPartnerProfile(partnerId).pipe(
      map((profile) => ({
        ...profile,
        status: profile.isVerified ? 'APPROVED' : 'PENDING_APPROVAL'
      }))
    );
  }

  updateOnlineStatus(partnerId: number, isOnline: boolean): Observable<DeliveryPartner> {
    return this.profileService.updateDeliveryPartnerProfile(partnerId, { isOnline });
  }

  getPendingDeliveryPartnersForAdmin(): Observable<DeliveryPartner[]> {
    // TODO: backend needs an admin-facing list endpoint for delivery partner approvals.
    return throwError(() => new Error('Pending delivery partner approval endpoint is not available in backend yet.'));
  }

  approveDeliveryPartner(_partnerId: number): Observable<DeliveryPartner> {
    // TODO: backend needs an admin approval endpoint for delivery partners.
    return throwError(() => new Error('Delivery partner approval endpoint is not available in backend yet.'));
  }

  rejectDeliveryPartner(_partnerId: number, _reason: string): Observable<DeliveryPartner> {
    // TODO: backend needs an admin rejection endpoint with feedback support for delivery partners.
    return throwError(() => new Error('Delivery partner rejection endpoint is not available in backend yet.'));
  }

  getDeliveryStats(partnerId: number): Observable<DashboardStats> {
    return this.orderService.getDeliveryPartnerOrders(partnerId).pipe(
      map((orders) => {
        const completed = orders.filter((order) => order.orderStatus === 'DELIVERED');
        return {
          totalDeliveries: orders.length,
          completedOrders: completed.length,
          todayDeliveries: completed.filter((order) => new Date(order.orderDate).toDateString() === new Date().toDateString()).length,
          totalEarnings: completed.reduce((sum, order) => sum + Number(order.finalAmount || 0) * 0.1, 0),
          todayEarnings: completed
            .filter((order) => new Date(order.orderDate).toDateString() === new Date().toDateString())
            .reduce((sum, order) => sum + Number(order.finalAmount || 0) * 0.1, 0)
        };
      })
    );
  }
}
