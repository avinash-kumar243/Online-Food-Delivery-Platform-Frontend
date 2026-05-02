import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AddToCartRequest, Cart } from '../models/app.models';
import { roundCurrency } from './api.utils';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.cartBaseUrl;
  private readonly fallbackBaseUrl = environment.cartServiceDirectBaseUrl ?? this.baseUrl;

  getCart(customerId: number): Observable<Cart> {
    return this.getWithFallback(`/cart/${customerId}`);
  }

  addToCart(payload: AddToCartRequest): Observable<Cart> {
    return this.postWithFallback('/cart/add', payload);
  }

  updateQuantity(customerId: number, itemId: number, quantity: number): Observable<Cart> {
    return this.putWithFallback('/cart/update-quantity', {
      customerId,
      itemId,
      quantity
    });
  }

  updateQuantityByMenuItem(customerId: number, menuItemId: number, quantity: number): Observable<Cart> {
    return this.putWithFallback(`/cart/customer/${customerId}/items/menu/${menuItemId}/quantity`, {
      customerId,
      itemId: menuItemId,
      quantity
    });
  }

  removeItem(itemId: number): Observable<Cart> {
    return this.deleteWithFallback(`/cart/remove-item/${itemId}`);
  }

  removeItemByMenuItem(customerId: number, menuItemId: number): Observable<Cart> {
    return this.deleteWithFallback(`/cart/customer/${customerId}/items/menu/${menuItemId}`);
  }

  clearCart(customerId: number): Observable<void> {
    return this.deleteWithFallback<void>(`/cart/clear/${customerId}`);
  }

  calculateCartTotal(cart: Cart | null): { subtotal: number; taxes: number; grandTotal: number } {
    const subtotal = roundCurrency(cart?.items.reduce((sum, item) => sum + item.lineTotal, 0) ?? 0);
    const taxes = roundCurrency(subtotal * 0.05);
    return {
      subtotal,
      taxes,
      grandTotal: roundCurrency(subtotal + taxes)
    };
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

  private putWithFallback<T>(path: string, payload: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, payload).pipe(
      catchError((error) => this.retryDirect(() => this.http.put<T>(`${this.fallbackBaseUrl}${path}`, payload), error))
    );
  }

  private deleteWithFallback<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${path}`).pipe(
      catchError((error) => this.retryDirect(() => this.http.delete<T>(`${this.fallbackBaseUrl}${path}`), error))
    );
  }

  private retryDirect<T>(request: () => Observable<T>, error: { status?: number }): Observable<T> {
    if (error?.status !== 0 || this.fallbackBaseUrl === this.baseUrl) {
      return throwError(() => error);
    }

    return request();
  }
}
