import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmptyStateComponent } from '../../components/shared/empty-state.component';
import { LoaderComponent } from '../../components/shared/loader.component';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { NotificationService } from '../../services/notification.service';
import { OrderService } from '../../services/order.service';
import { PaymentService } from '../../services/payment.service';
import { PlaceOrderRequest, Cart } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';

@Component({
  selector: 'app-customer-cart-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent, EmptyStateComponent],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Cart</span>
        <h1>Review your order before checkout.</h1>
        <p class="dashboard-subtitle">Quantities, totals, and order placement stay synced with the cart and order services.</p>
      </div>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <ng-container *ngIf="!loading() && !error()">
      <app-empty-state *ngIf="!cart()?.items?.length" title="Your cart is empty" description="Add menu items from a restaurant to start your order."></app-empty-state>

      <section class="split-layout" *ngIf="cart()?.items?.length">
        <article class="surface-card section-card">
          <div class="stack-list">
            <div *ngFor="let item of cart()?.items" class="cart-row">
              <div>
                <strong>{{ item.name }}</strong>
                <p>Rs {{ item.price }} each</p>
              </div>
              <div class="cart-actions">
                <button type="button" class="secondary-btn qty-btn" (click)="changeQuantity(item.itemId, item.quantity - 1)" [disabled]="item.quantity <= 1">-</button>
                <span>{{ item.quantity }}</span>
                <button type="button" class="secondary-btn qty-btn" (click)="changeQuantity(item.itemId, item.quantity + 1)">+</button>
                <button type="button" class="ghost-btn" (click)="remove(item.itemId)">Remove</button>
              </div>
            </div>
          </div>
        </article>

        <article class="surface-card section-card">
          <div class="stack-list">
            <label>
              <span>Delivery address</span>
              <textarea [(ngModel)]="deliveryAddress" rows="3"></textarea>
            </label>
            <label>
              <span>Special instructions</span>
              <textarea [(ngModel)]="specialInstructions" rows="3"></textarea>
            </label>
            <label>
              <span>Payment method</span>
              <select [(ngModel)]="paymentMethod">
                <option value="COD">Cash on delivery</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="WALLET">Wallet</option>
              </select>
            </label>
            <div class="meta-row"><span>Subtotal</span><strong>Rs {{ totals.subtotal.toFixed(2) }}</strong></div>
            <div class="meta-row"><span>Taxes</span><strong>Rs {{ totals.taxes.toFixed(2) }}</strong></div>
            <div class="meta-row"><span>Grand total</span><strong>Rs {{ totals.grandTotal.toFixed(2) }}</strong></div>
            <button type="button" class="primary-btn" [disabled]="placingOrder()" (click)="placeOrder()">
              {{ placingOrder() ? 'Placing order...' : 'Place order' }}
            </button>
          </div>
        </article>
      </section>
    </ng-container>
  `,
  styles: [`
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    .section-card { padding: 24px; }
    .cart-row { display: flex; justify-content: space-between; gap: 16px; align-items: center; border-bottom: 1px solid var(--qb-border); padding-bottom: 16px; }
    .cart-row p { margin-top: 6px; color: var(--qb-text-muted); }
    .cart-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .qty-btn { min-width: 44px; padding: 0; }
    textarea, select { width: 100%; border-radius: 14px; border: 1px solid var(--qb-border); padding: 12px 14px; margin-top: 8px; }
    label span { font-weight: 600; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerCartPageComponent {
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly paymentService = inject(PaymentService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly cart = signal<Cart | null>(null);
  readonly placingOrder = signal(false);

  deliveryAddress = '';
  specialInstructions = '';
  paymentMethod: 'COD' | 'UPI' | 'CARD' | 'WALLET' = 'COD';

  get totals() {
    return this.cartService.calculateCartTotal(this.cart());
  }

  constructor() {
    this.loadCart();
  }

  loadCart(): void {
    const customerId = this.authService.getCurrentUser()?.id;
    if (!customerId) {
      this.error.set('Unable to resolve your customer session.');
      this.loading.set(false);
      return;
    }

    this.cartService.getCart(customerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cart) => {
          this.cart.set(cart);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  changeQuantity(itemId: number, quantity: number): void {
    if (quantity < 1) {
      return;
    }

    const customerId = this.authService.getCurrentUser()?.id;
    if (!customerId) return;
    this.cartService.updateQuantity(customerId, itemId, quantity)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cart) => this.cart.set(cart),
        error: (error) => this.notificationService.error(getErrorMessage(error))
      });
  }

  remove(itemId: number): void {
    this.cartService.removeItem(itemId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cart) => {
          this.cart.set(cart);
          this.notificationService.success('Item removed from cart.');
        },
        error: (error) => this.notificationService.error(getErrorMessage(error))
      });
  }

  placeOrder(): void {
    const customerId = this.authService.getCurrentUser()?.id;
    const cart = this.cart();
    if (!customerId || !cart?.items.length || !cart.restaurantId) {
      return;
    }
    if (!this.deliveryAddress.trim()) {
      this.notificationService.error('Delivery address is required.');
      return;
    }

    const payload: PlaceOrderRequest = {
      customerId,
      restaurantId: cart.restaurantId,
      discount: 0,
      modeOfPayment: this.paymentMethod,
      estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      deliveryAddress: this.deliveryAddress,
      specialInstructions: this.specialInstructions,
      items: cart.items.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        customization: item.customization || undefined
      }))
    };

    this.placingOrder.set(true);
    this.orderService.placeOrder(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          const finalizeSuccess = () => {
            this.cartService.clearCart(customerId)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({ next: () => undefined, error: () => undefined });
            this.notificationService.success(`Order #${order.orderId} placed successfully.`);
            this.placingOrder.set(false);
            this.router.navigate(['/customer/orders', order.orderId]);
          };

          if (this.paymentMethod === 'COD') {
            this.paymentService.createCodPayment({
              orderId: order.orderId,
              customerId,
              amount: order.finalAmount
            })
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: () => finalizeSuccess(),
                error: (error: unknown) => {
                  this.notificationService.error(getErrorMessage(error, 'Order placed but COD payment record could not be created.'));
                  this.placingOrder.set(false);
                }
              });
            return;
          }

          // TODO: plug real Razorpay checkout invocation here after backend exposes the frontend checkout contract.
          this.paymentService.createRazorpayOrder({
            orderId: order.orderId,
            customerId,
            amount: order.finalAmount,
            currency: 'INR'
          })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.notificationService.info('Payment order created. Complete gateway checkout once Razorpay frontend flow is enabled.');
                finalizeSuccess();
              },
              error: (error: unknown) => {
                this.notificationService.error(getErrorMessage(error));
                this.placingOrder.set(false);
              }
            });
        },
        error: (error) => {
          this.notificationService.error(getErrorMessage(error));
          this.placingOrder.set(false);
        }
      });
  }
}
