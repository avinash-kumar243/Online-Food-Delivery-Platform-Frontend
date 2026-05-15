import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { MenuCategory, MenuCategoryPayload, MenuItem, MenuItemPayload, RestaurantMenu } from '../models/app.models';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getMenuByRestaurant(restaurantId: number): Observable<RestaurantMenu> {
    return this.http.get<RestaurantMenu>(`${this.baseUrl}/menu/restaurant/${restaurantId}`).pipe(
      map((menu) => ({
        ...menu,
        categories: menu.categories.map((category) => ({
          ...category,
          items: category.items.map((item) => ({ ...item, categoryName: category.name }))
        }))
      }))
    );
  }

  getMenuItem(itemId: number): Observable<MenuItem> {
    return this.http.get<MenuItem>(`${this.baseUrl}/menu/item/${itemId}`);
  }

  getMyMenuItems(restaurantId: number): Observable<MenuItem[]> {
    return this.getMenuByRestaurant(restaurantId).pipe(
      map((menu) => menu.categories.flatMap((category) => category.items.map((item) => ({ ...item, categoryName: category.name }))))
    );
  }

  addMenuItem(payload: MenuItemPayload): Observable<MenuItem> {
    return this.http.post<MenuItem>(`${this.baseUrl}/menu/create`, {
      type: 'ITEM',
      item: payload
    });
  }

  updateMenuItem(payload: MenuItemPayload): Observable<MenuItem> {
    return this.http.put<MenuItem>(`${this.baseUrl}/menu`, {
      type: 'ITEM',
      item: payload
    });
  }

  addCategory(payload: MenuCategoryPayload): Observable<MenuCategory> {
    return this.http.post<MenuCategory>(`${this.baseUrl}/menu/create`, {
      type: 'CATEGORY',
      category: payload
    });
  }

  deleteMenuItem(itemId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/menu/delete`, {
      body: {
        type: 'ITEM',
        itemId
      }
    });
  }

  toggleAvailability(itemId: number, available: boolean): Observable<MenuItem> {
    return this.http.put<MenuItem>(`${this.baseUrl}/menu/toggleAvailability`, {
      itemId,
      available
    });
  }
}


