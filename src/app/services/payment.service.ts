import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
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
  private readonly baseUrl = environment.paymentBaseUrl;
  private readonly fallbackBaseUrl = environment.paymentServiceDirectBaseUrl ?? this.baseUrl;

  createCodPayment(payload: { orderId: number; customerId: number; amount: number }): Observable<Payment> {
    return this.http
      .post<ApiResponse<Payment>>(`${this.baseUrl}/api/v1/payments/cod`, {
        orderId: payload.orderId,
        customerId: payload.customerId,
        amount: payload.amount
      })
      .pipe(
        map((response) => response.data),
        catchError((error) => this.retryDirect(
          () => this.http.post<ApiResponse<Payment>>(`${this.fallbackBaseUrl}/api/v1/payments/cod`, {
            orderId: payload.orderId,
            customerId: payload.customerId,
            amount: payload.amount
          }).pipe(map((response) => response.data)),
          error
        ))
      );
  }

  createRazorpayOrder(payload: { orderId: number; customerId: number; amount: number; paymentMode: 'UPI' | 'CARD' | 'WALLET'; currency?: string }): Observable<RazorpayOrderPayload> {
    return this.http
      .post<ApiResponse<RazorpayOrderPayload>>(`${this.baseUrl}/api/v1/payments/razorpay/create-order`, {
        orderId: payload.orderId,
        customerId: payload.customerId,
        amount: payload.amount,
        paymentMode: payload.paymentMode,
        currency: payload.currency ?? 'INR'
      })
      .pipe(
        map((response) => response.data),
        catchError((error) => this.retryDirect(
          () => this.http.post<ApiResponse<RazorpayOrderPayload>>(`${this.fallbackBaseUrl}/api/v1/payments/razorpay/create-order`, {
            orderId: payload.orderId,
            customerId: payload.customerId,
            amount: payload.amount,
            paymentMode: payload.paymentMode,
            currency: payload.currency ?? 'INR'
          }).pipe(map((response) => response.data)),
          error
        ))
      );
  }

  verifyPayment(payload: { orderId: number; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }): Observable<Payment> {
    return this.http
      .post<ApiResponse<Payment>>(`${this.baseUrl}/api/v1/payments/razorpay/verify`, payload)
      .pipe(
        map((response) => response.data),
        catchError((error) => this.retryDirect(
          () => this.http.post<ApiResponse<Payment>>(`${this.fallbackBaseUrl}/api/v1/payments/razorpay/verify`, payload)
            .pipe(map((response) => response.data)),
          error
        ))
      );
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
    return this.http
      .get<ApiResponse<Payment[]>>(`${this.baseUrl}/api/v1/admin/payments`)
      .pipe(map((response) => response.data));
  }

  refundPayment(orderId: number, reason: string): Observable<Payment> {
    return this.http
      .post<ApiResponse<Payment>>(`${this.baseUrl}/api/v1/payments/refund`, { orderId, reason })
      .pipe(map((response) => response.data));
  }

  private retryDirect<T>(request: () => Observable<T>, error: { status?: number }): Observable<T> {
    if (error?.status !== 0 || this.fallbackBaseUrl === this.baseUrl) {
      return throwError(() => error);
    }

    return request();
  }
}
