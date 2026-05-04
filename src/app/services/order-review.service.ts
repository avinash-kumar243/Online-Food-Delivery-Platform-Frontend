import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DeliveryReviewDTO, FoodReviewDTO, Review } from '../models/app.models';

@Injectable({ providedIn: 'root' })
export class OrderReviewService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  postFoodReview(review: FoodReviewDTO): Observable<Review> {
    return this.http.post<Review>(`${this.baseUrl}/reviews/food`, review);
  }

  postDeliveryReview(review: DeliveryReviewDTO): Observable<Review> {
    return this.http.post<Review>(`${this.baseUrl}/reviews/delivery`, review);
  }

  getCustomerReviews(customerId: number): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.baseUrl}/reviews/customers/${customerId}`);
  }

  getOrderReviews(orderId: number): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.baseUrl}/reviews/orders/${orderId}`);
  }

  getRestaurantReviews(restaurantId: number): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.baseUrl}/reviews/restaurants/${restaurantId}`);
  }

  getDeliveryReviews(agentId: number): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.baseUrl}/reviews/agents/${agentId}`);
  }

  getAllReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.baseUrl}/reviews/admin`);
  }

  getAverageFoodRating(restaurantId: number): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/reviews/restaurants/${restaurantId}/average`);
  }

  getAverageDeliveryRating(agentId: number): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/reviews/agents/${agentId}/average`);
  }
}
