import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, Payment } from '../models/app.models';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.paymentBaseUrl;

  createCodPayment(payload: { orderId: number; customerId: number; amount: number }): Observable<Payment> {
    return this.http
      .post<ApiResponse<Payment>>(`${this.baseUrl}/api/v1/payments/cod`, {
        orderId: payload.orderId,
        customerId: payload.customerId,
        amount: payload.amount
      })
      .pipe(map((response) => response.data));
  }

  createRazorpayOrder(payload: { orderId: number; customerId: number; amount: number; currency?: string }): Observable<{ orderId: string; amount: number; currency: string }> {
    return this.http
      .post<ApiResponse<{ orderId: string; amount: number; currency: string }>>(`${this.baseUrl}/api/v1/payments/razorpay/create-order`, {
        orderId: payload.orderId,
        customerId: payload.customerId,
        amount: payload.amount,
        currency: payload.currency ?? 'INR'
      })
      .pipe(map((response) => response.data));
  }

  verifyPayment(payload: { orderId: number; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
    return this.http
      .post<ApiResponse<Payment>>(`${this.baseUrl}/api/v1/payments/razorpay/verify`, payload)
      .pipe(map((response) => response.data));
  }

  getPaymentByOrder(orderId: number): Observable<Payment> {
    return this.http
      .get<ApiResponse<Payment>>(`${this.baseUrl}/api/v1/payments/order/${orderId}`)
      .pipe(map((response) => response.data));
  }

  getPaymentHistory(customerId: number): Observable<Payment[]> {
    return this.http
      .get<ApiResponse<Payment[]>>(`${this.baseUrl}/api/v1/payments/customer/${customerId}`)
      .pipe(map((response) => response.data));
  }

  getAllPaymentsForAdmin(): Observable<Payment[]> {
    return forkJoin([
      this.http.get<ApiResponse<Payment[]>>(`${this.baseUrl}/api/v1/payments/status/PENDING`),
      this.http.get<ApiResponse<Payment[]>>(`${this.baseUrl}/api/v1/payments/status/PAID`),
      this.http.get<ApiResponse<Payment[]>>(`${this.baseUrl}/api/v1/payments/status/FAILED`),
      this.http.get<ApiResponse<Payment[]>>(`${this.baseUrl}/api/v1/payments/status/REFUNDED`),
      this.http.get<ApiResponse<Payment[]>>(`${this.baseUrl}/api/v1/payments/status/REFUND_PENDING`)
    ]).pipe(
      map((responses) => {
        const paymentMap = new Map<number, Payment>();
        responses.flatMap((item) => item.data).forEach((payment) => paymentMap.set(payment.paymentId, payment));
        return Array.from(paymentMap.values()).sort((a, b) => (b.paymentId ?? 0) - (a.paymentId ?? 0));
      })
    );
  }

  refundPayment(orderId: number, reason: string): Observable<Payment> {
    return this.http
      .post<ApiResponse<Payment>>(`${this.baseUrl}/api/v1/payments/refund`, { orderId, reason })
      .pipe(map((response) => response.data));
  }
}
