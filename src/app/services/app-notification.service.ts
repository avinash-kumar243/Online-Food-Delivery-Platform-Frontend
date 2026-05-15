import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppNotification } from '../models/app.models';

interface NotificationApiResponse {
  notificationId: number;
  recipientId: number;
  recipientRole?: string | null;
  sentAt: string;
  type: string;
  channel: string;
  title: string;
  message: string;
  relatedId?: string | null;
  relatedType?: string | null;
  read?: boolean;
  isRead?: boolean;
  readAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AppNotificationService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/notifications`;

  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = signal(0);
  readonly isLoading = signal(false);
  readonly hasUnread = computed(() => this.unreadCount() > 0);

  loadNotifications(): Observable<AppNotification[]> {
    this.isLoading.set(true);

    return this.http.get<NotificationApiResponse[]>(this.endpoint).pipe(
      map((items) => items.map((item) => this.normalize(item))),
      tap((items) => {
        this.notifications.set(items);
        this.unreadCount.set(items.filter((item) => !item.isRead).length);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  loadUnreadCount(): Observable<number> {
    return this.http.get<number>(`${this.endpoint}/unread-count`).pipe(
      tap((count) => this.unreadCount.set(Number(count) || 0)),
      catchError((error) => throwError(() => error))
    );
  }

  markAsRead(notificationId: number): Observable<AppNotification> {
    return this.http.patch<NotificationApiResponse>(`${this.endpoint}/${notificationId}/read`, {}).pipe(
      map((item) => this.normalize(item)),
      tap((item) => {
        this.notifications.update((notifications) =>
          notifications.map((notification) => notification.notificationId === item.notificationId ? item : notification)
        );
        this.syncUnreadCount();
      }),
      catchError((error) => throwError(() => error))
    );
  }

  markAllRead(): Observable<AppNotification[]> {
    return this.http.patch<NotificationApiResponse[]>(`${this.endpoint}/read-all`, {}).pipe(
      map((items) => items.map((item) => this.normalize(item))),
      tap((items) => {
        const updates = new Map(items.map((item) => [item.notificationId, item]));
        this.notifications.update((notifications) =>
          notifications.map((notification) => updates.get(notification.notificationId) ?? notification)
        );
        this.syncUnreadCount();
      }),
      catchError((error) => throwError(() => error))
    );
  }

  clear(): void {
    this.notifications.set([]);
    this.unreadCount.set(0);
    this.isLoading.set(false);
  }

  private normalize(item: NotificationApiResponse): AppNotification {
    return {
      notificationId: item.notificationId,
      recipientId: Number(item.recipientId),
      recipientRole: item.recipientRole ?? null,
      sentAt: item.sentAt,
      type: item.type,
      channel: item.channel,
      title: item.title,
      message: item.message,
      relatedId: item.relatedId ?? null,
      relatedType: item.relatedType ?? null,
      isRead: Boolean(item.read ?? item.isRead),
      readAt: item.readAt ?? null
    };
  }

  private syncUnreadCount(): void {
    this.unreadCount.set(this.notifications().filter((item) => !item.isRead).length);
  }
}
