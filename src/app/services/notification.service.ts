import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly toasts = signal<ToastMessage[]>([]);
  private nextId = 1;

  success(message: string): void {
    this.push('success', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  info(message: string): void {
    this.push('info', message);
  }

  dismiss(id: number): void {
    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }

  private push(type: ToastMessage['type'], message: string): void {
    const toast = { id: this.nextId++, type, message };
    this.toasts.update((items) => [...items, toast]);
    setTimeout(() => this.dismiss(toast.id), 3500);
  }
}
