import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AddToCartRequest, Cart } from '../models/app.models';
import { roundCurrency } from './api.utils';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getCart(customerId: number): Observable<Cart> {
    return this.http.get<Cart>(`${this.baseUrl}/cart/${customerId}`);
  }

  addToCart(payload: AddToCartRequest): Observable<Cart> {
    return this.http.post<Cart>(`${this.baseUrl}/cart/add`, payload);
  }

  updateQuantity(customerId: number, itemId: number, quantity: number): Observable<Cart> {
    return this.http.put<Cart>(`${this.baseUrl}/cart/update-quantity`, {
      customerId,
      itemId,
      quantity
    });
  }

  updateQuantityByMenuItem(customerId: number, menuItemId: number, quantity: number): Observable<Cart> {
    return this.http.put<Cart>(`${this.baseUrl}/cart/customer/${customerId}/items/menu/${menuItemId}/quantity`, {
      customerId,
      itemId: menuItemId,
      quantity
    });
  }

  removeItem(itemId: number): Observable<Cart> {
    return this.http.delete<Cart>(`${this.baseUrl}/cart/remove-item/${itemId}`);
  }

  removeItemByMenuItem(customerId: number, menuItemId: number): Observable<Cart> {
    return this.http.delete<Cart>(`${this.baseUrl}/cart/customer/${customerId}/items/menu/${menuItemId}`);
  }

  clearCart(customerId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/cart/clear/${customerId}`);
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
}
