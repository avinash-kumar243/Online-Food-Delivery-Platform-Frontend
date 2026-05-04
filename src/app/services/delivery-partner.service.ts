import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AdminDeliveryPartnerRecord,
  DeliveryPartner,
  DeliveryRegistrationRequest
} from '../models/app.models';

interface DeliveryAgentApiResponse {
  agentId: number;
  userId: number;
  fullName: string;
  phone: string;
  vehicleType: string;
  vehicleNumber: string;
  currentLatitude: number;
  currentLongitude: number;
  isAvailable: boolean;
  isVerified: boolean;
  verificationStatus: string;
  avgRating: number;
  totalDeliveries: number;
  activeOrderId?: number | null;
  rejectionReason?: string | null;
  reviewedByAdminId?: number | null;
  reviewedAt?: string | null;
  submittedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class DeliveryPartnerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  registerDeliveryPartner(payload: DeliveryRegistrationRequest, fullName: string, phone: string): Observable<DeliveryPartner> {
    return this.http.post<DeliveryAgentApiResponse>(`${this.baseUrl}/agents/register`, {
      userId: payload.partnerId,
      fullName,
      phone,
      vehicleType: payload.vehicleType,
      vehicleNumber: payload.vehicleNumber,
      currentLatitude: 0,
      currentLongitude: 0
    }).pipe(map((response) => this.toPartner(response)));
  }

  getMyDeliveryProfile(partnerId: number): Observable<DeliveryPartner> {
    return this.http.get<DeliveryAgentApiResponse>(`${this.baseUrl}/agents/user/${partnerId}`).pipe(map((response) => this.toPartner(response)));
  }

  updateOnlineStatus(agentId: number, isOnline: boolean): Observable<DeliveryPartner> {
    return this.http.put<{ agentId: number; available: boolean; activeOrderId?: number | null }>(
      `${this.baseUrl}/agents/${agentId}/availability?available=${isOnline}`,
      {}
    ).pipe(switchMap(() => this.http.get<DeliveryAgentApiResponse>(`${this.baseUrl}/agents/${agentId}`)), map((response) => this.toPartner(response)));
  }

  acceptOrder(agentId: number, orderId: number): Observable<DeliveryPartner> {
    return this.http.post<DeliveryAgentApiResponse>(`${this.baseUrl}/agents/${agentId}/accept-order/${orderId}`, {}).pipe(
      map((response) => this.toPartner(response))
    );
  }

  completeDelivery(agentId: number): Observable<DeliveryPartner> {
    return this.http.post<DeliveryAgentApiResponse>(`${this.baseUrl}/agents/${agentId}/complete-delivery`, {}).pipe(
      map((response) => this.toPartner(response))
    );
  }

  getPendingDeliveryPartnersForAdmin(): Observable<AdminDeliveryPartnerRecord[]> {
    return this.http.get<AdminDeliveryPartnerRecord[]>(`${this.baseUrl}/admin/agents/pending`);
  }

  getAllDeliveryPartnersForAdmin(): Observable<AdminDeliveryPartnerRecord[]> {
    return this.http.get<AdminDeliveryPartnerRecord[]>(`${this.baseUrl}/admin/agents/all`);
  }

  approveDeliveryPartner(agentId: number, adminId: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/admin/agents/${agentId}/verify`, { adminId });
  }

  rejectDeliveryPartner(agentId: number, adminId: number, feedback: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/admin/agents/${agentId}/reject`, { adminId, feedback });
  }

  private toPartner(response: DeliveryAgentApiResponse): DeliveryPartner {
    return {
      partnerId: response.agentId,
      agentId: response.agentId,
      userId: response.userId,
      fullName: response.fullName,
      email: '',
      phone: response.phone,
      vehicleType: response.vehicleType,
      vehicleNumber: response.vehicleNumber,
      isVerified: response.isVerified,
      isOnline: response.isAvailable,
      verificationStatus: response.verificationStatus,
      status: response.verificationStatus === 'REJECTED' ? 'REJECTED' : response.isVerified ? 'VERIFIED' : 'PENDING_APPROVAL',
      rejectionReason: response.rejectionReason,
      reviewedByAdminId: response.reviewedByAdminId ?? null,
      reviewedAt: response.reviewedAt ?? null,
      submittedAt: response.submittedAt ?? null,
      rating: response.avgRating
    };
  }
}
