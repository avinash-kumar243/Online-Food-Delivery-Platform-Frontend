import { Injectable, NgZone, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { OrderRealtimeEvent, PaymentRealtimeEvent } from '../models/app.models';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly zone = inject(NgZone);

  private client: {
    active: boolean;
    connected: boolean;
    activate(): void;
    deactivate(): void;
    subscribe(destination: string, callback: (message: { body: string }) => void): { unsubscribe(): void };
  } | null = null;
  private subscriptions: Array<{ unsubscribe(): void }> = [];
  private connectedToken: string | null = null;
  private connectInFlight = false;

  private readonly orderEventsSubject = new Subject<OrderRealtimeEvent>();
  private readonly paymentEventsSubject = new Subject<PaymentRealtimeEvent>();

  readonly orderEvents$ = this.orderEventsSubject.asObservable();
  readonly paymentEvents$ = this.paymentEventsSubject.asObservable();

  async connect(): Promise<void> {
    const token = this.authService.getToken()?.trim();
    const role = this.authService.getUserRole();

    if (!token || !role) {
      this.disconnect();
      return;
    }

    if (this.client?.active && this.connectedToken === token) {
      return;
    }

    if (this.connectInFlight) {
      return;
    }

    this.connectInFlight = true;
    this.disconnect();
    this.connectedToken = token;

    try {
      const [{ Client }, sockJsModule] = await Promise.all([
        import('@stomp/stompjs'),
        import('sockjs-client')
      ]);

      const SockJS = (sockJsModule.default ?? sockJsModule) as new (url: string) => WebSocket;
      const socketUrl = `${environment.apiGatewayBaseUrl || ''}/ws/orders`;

      this.client = new Client({
        webSocketFactory: () => new SockJS(socketUrl),
        connectHeaders: {
          Authorization: `Bearer ${token}`
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          this.zone.run(() => this.subscribeForRole(role));
        },
        onStompError: () => {
          this.zone.run(() => this.notificationService.error('Real-time connection error.'));
        }
      });

      this.client.activate();
    } catch (error) {
      this.connectedToken = null;
      console.error('Failed to initialize real-time client.', error);
    } finally {
      this.connectInFlight = false;
    }
  }

  disconnect(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions = [];
    this.connectedToken = null;

    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  private subscribeForRole(role: string): void {
    if (!this.client?.connected) {
      return;
    }

    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions = [];

    if (role === 'ADMIN') {
      this.subscriptions.push(
        this.client.subscribe('/topic/admin/orders', (message) => this.handleOrderMessage(message)),
        this.client.subscribe('/topic/admin/payments', (message) => this.handlePaymentMessage(message))
      );
      return;
    }

    this.subscriptions.push(
      this.client.subscribe('/user/queue/orders', (message) => this.handleOrderMessage(message))
    );
  }

  private handleOrderMessage(message: { body: string }): void {
    const event = JSON.parse(message.body) as OrderRealtimeEvent;
    this.zone.run(() => {
      this.orderEventsSubject.next(event);
      this.notificationService.info(
        event.type === 'ORDER_CREATED'
          ? `New order #${event.orderId} received.`
          : `Order #${event.orderId} is now ${event.orderStatus}.`
      );
    });
  }

  private handlePaymentMessage(message: { body: string }): void {
    const event = JSON.parse(message.body) as PaymentRealtimeEvent;
    this.zone.run(() => {
      this.paymentEventsSubject.next(event);
      this.notificationService.info(`Payment updated for order #${event.orderId}.`);
    });
  }
}
