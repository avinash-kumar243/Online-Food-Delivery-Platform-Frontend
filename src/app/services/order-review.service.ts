import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { DeliveryReviewDTO, FoodReviewDTO, Review } from '../models/app.models';

@Injectable({ providedIn: 'root' })
export class OrderReviewService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.reviewBaseUrl;
  private readonly fallbackBaseUrl = environment.reviewServiceDirectBaseUrl ?? this.baseUrl;

  postFoodReview(review: FoodReviewDTO): Observable<Review> {
    return this.postWithFallback('/api/v1/reviews/food', review);
  }

  postDeliveryReview(review: DeliveryReviewDTO): Observable<Review> {
    return this.postWithFallback('/api/v1/reviews/delivery', review);
  }

  getCustomerReviews(customerId: number): Observable<Review[]> {
    return this.getWithFallback(`/api/v1/reviews/customers/${customerId}`);
  }

  getOrderReviews(orderId: number): Observable<Review[]> {
    return this.getWithFallback(`/api/v1/reviews/orders/${orderId}`);
  }

  getRestaurantReviews(restaurantId: number): Observable<Review[]> {
    return this.getWithFallback(`/api/v1/reviews/restaurants/${restaurantId}`);
  }

  getDeliveryReviews(agentId: number): Observable<Review[]> {
    return this.getWithFallback(`/api/v1/reviews/agents/${agentId}`);
  }

  getAllReviews(): Observable<Review[]> {
    return this.getWithFallback('/api/v1/reviews/admin');
  }

  getAverageFoodRating(restaurantId: number): Observable<number> {
    return this.getWithFallback(`/api/v1/reviews/restaurants/${restaurantId}/average`);
  }

  getAverageDeliveryRating(agentId: number): Observable<number> {
    return this.getWithFallback(`/api/v1/reviews/agents/${agentId}/average`);
  }

  private getWithFallback<T>(path: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`).pipe(
      catchError((error) => this.retryDirect(() => this.http.get<T>(`${this.fallbackBaseUrl}${path}`), error))
    );
  }

  private postWithFallback<T>(path: string, payload: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, payload).pipe(
      catchError((error) => this.retryDirect(() => this.http.post<T>(`${this.fallbackBaseUrl}${path}`, payload), error))
    );
  }

  private retryDirect<T>(request: () => Observable<T>, error: { status?: number }): Observable<T> {
    const status = error?.status ?? 0;
    const shouldRetryDirect = [0, 404, 502, 503, 504].includes(status);

    if (!shouldRetryDirect || this.fallbackBaseUrl === this.baseUrl) {
      return throwError(() => error);
    }

    return request();
  }
}
