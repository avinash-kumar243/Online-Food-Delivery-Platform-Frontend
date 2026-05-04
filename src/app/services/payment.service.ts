import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, Payment } from '../models/app.models';

export interface RazorpayOrderPayload {
  paymentId: number;
  orderId: number;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  createCodPayment(payload: { orderId: number; customerId: number; amount: number }): Observable<Payment> {
    return this.http
      .post<ApiResponse<Payment>>(`${this.baseUrl}/payments/cod`, {
        orderId: payload.orderId,
        customerId: payload.customerId,
        amount: payload.amount
      })
      .pipe(map((response) => response.data));
  }

  createRazorpayOrder(payload: { orderId: number; customerId: number; amount: number; paymentMode: 'UPI' | 'CARD' | 'WALLET'; currency?: string }): Observable<RazorpayOrderPayload> {
    return this.http
      .post<ApiResponse<RazorpayOrderPayload>>(`${this.baseUrl}/payments/razorpay/create-order`, {
        orderId: payload.orderId,
        customerId: payload.customerId,
        amount: payload.amount,
        paymentMode: payload.paymentMode,
        currency: payload.currency ?? 'INR'
      })
      .pipe(map((response) => response.data));
  }

  verifyPayment(payload: { orderId: number; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }): Observable<Payment> {
    return this.http
      .post<ApiResponse<Payment>>(`${this.baseUrl}/payments/razorpay/verify`, payload)
      .pipe(map((response) => response.data));
  }

  getPaymentByOrder(orderId: number): Observable<Payment> {
    return this.http
      .get<ApiResponse<Payment>>(`${this.baseUrl}/payments/order/${orderId}`)
      .pipe(map((response) => response.data));
  }

  getPaymentHistory(customerId: number): Observable<Payment[]> {
    return this.http
      .get<ApiResponse<Payment[]>>(`${this.baseUrl}/payments/customer/${customerId}`)
      .pipe(map((response) => response.data));
  }

  getAllPaymentsForAdmin(): Observable<Payment[]> {
    return this.http
      .get<ApiResponse<Payment[]>>(`${this.baseUrl}/admin/payments`)
      .pipe(map((response) => response.data));
  }

  refundPayment(orderId: number, reason: string): Observable<Payment> {
    return this.http
      .post<ApiResponse<Payment>>(`${this.baseUrl}/payments/refund`, { orderId, reason })
      .pipe(map((response) => response.data));
  }
}
