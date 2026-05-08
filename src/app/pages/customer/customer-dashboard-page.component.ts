import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../../components/shared/empty-state.component';
import { LoaderComponent } from '../../components/shared/loader.component';
import { Restaurant } from '../../models/app.models';
import { getCustomerRestaurantImage } from '../../shared/restaurant-visuals';
import { getErrorMessage } from '../../services/api.utils';
import { RestaurantService } from '../../services/restaurant.service';

@Component({
  selector: 'app-customer-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LoaderComponent, EmptyStateComponent],
  template: `
    <section class="hero-shell">
      <article class="hero-banner surface-card">
        <div class="hero-visuals" aria-hidden="true">
          <div class="hero-plate hero-main-plate"></div>
          <div class="hero-side-stack">
            <div class="hero-plate hero-biryani-plate"></div>
            <div class="hero-plate hero-snack-plate"></div>
          </div>
        </div>
        <div class="hero-action-panel">
          <div class="hero-action-copy">
            <span class="dashboard-kicker">Food picks</span>
            <p class="hero-tagline">Fresh meals, fast delivery, happy cravings.</p>
            <div class="hero-chip-row">
              <span class="hero-chip">Biryani</span>
              <span class="hero-chip">Platters</span>
              <span class="hero-chip">Combos</span>
            </div>
            <p class="hero-support-copy">Your favourite food is just one click away.</p>
          </div>
          <div class="hero-actions">
            <a routerLink="/customer/restaurants" class="primary-btn">Browse Restaurant</a>
          </div>
        </div>
      </article>
    </section>

    <section class="showcase-strip dashboard-section">
      <article class="showcase-card showcase-biryani">
        <div class="showcase-content">
          <small>Signature pick</small>
          <span>Biryani nights</span>
        </div>
      </article>
      <article class="showcase-card showcase-thali">
        <div class="showcase-content">
          <small>Balanced plates</small>
          <span>Indian platters</span>
        </div>
      </article>
      <article class="showcase-card showcase-feast">
        <div class="showcase-content">
          <small>Anytime craving</small>
          <span>Comfort food picks</span>
        </div>
      </article>
    </section>

    <app-loader *ngIf="loading()"></app-loader>
    <section *ngIf="error()" class="empty-state">{{ error() }}</section>

    <ng-container *ngIf="!loading() && !error()">
      <section class="dashboard-section featured-section">
        <div class="section-header">
          <div>
            <span class="dashboard-kicker">Featured restaurants</span>
            <h2>Find your next favourite meal.</h2>
          </div>
          <a routerLink="/customer/restaurants" class="secondary-btn">View All Restaurant</a>
        </div>

        <div class="cards-grid" *ngIf="featuredRestaurants().length; else noRestaurants">
          <a *ngFor="let restaurant of featuredRestaurants()" class="surface-card restaurant-card" [routerLink]="['/customer/restaurants', restaurant.restaurantId]">
            <ng-container *ngIf="getRestaurantImage(restaurant) as restaurantImage; else restaurantFallback">
              <div class="restaurant-cover image-cover">
                <img [src]="restaurantImage" [alt]="restaurant.name" loading="lazy" />
<!--                <span class="status-chip" [class.status-green]="restaurant.isOpen" [class.status-slate]="!restaurant.isOpen">-->
<!--                  {{ restaurant.isOpen ? 'Open now' : 'Closed' }}-->
<!--                </span>-->
              </div>
            </ng-container>
            <ng-template #restaurantFallback>
              <div class="restaurant-cover">
                <div class="restaurant-cover-glow"></div>
                <span class="restaurant-initial">{{ restaurant.name.slice(0, 1) }}</span>
<!--                <span class="status-chip" [class.status-green]="restaurant.isOpen" [class.status-slate]="!restaurant.isOpen">-->
<!--                  {{ restaurant.isOpen ? 'Open now' : 'Closed' }}-->
<!--                </span>-->
              </div>
            </ng-template>
            <div class="restaurant-body">
              <div class="restaurant-title-row">
                <strong>{{ restaurant.name }}</strong>
                <span class="cta-chip">View menu</span>
              </div>
              <p>{{ restaurant.cuisine }} | {{ restaurant.city }}</p>
              <div class="meta-row"><span>Minimum order</span><strong>Rs {{ restaurant.minOrderAmount }}</strong></div>
              <div class="meta-row"><span>ETA</span><strong>{{ restaurant.estimatedDeliveryMin }} mins</strong></div>
            </div>
          </a>
        </div>
      </section>
    </ng-container>

    <ng-template #noRestaurants>
      <app-empty-state title="No featured restaurants yet" description="Approved restaurants will appear here as soon as they are available."></app-empty-state>
    </ng-template>
  `,
  styles: [`
    .hero-shell {
      margin-top: 8px;
    }
    .hero-banner {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.72fr);
      gap: 24px;
      padding: 24px;
      background:
        radial-gradient(circle at top left, rgba(245, 158, 11, 0.2), transparent 22rem),
        linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(243, 250, 247, 0.94));
    }
    .hero-visuals {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(180px, 0.7fr);
      gap: 14px;
      min-height: 420px;
    }
    .hero-side-stack {
      display: grid;
      gap: 14px;
    }
    .hero-plate,
    .showcase-card {
      border-radius: 24px;
      background-position: center;
      background-repeat: no-repeat;
      background-size: cover;
      overflow: hidden;
      box-shadow: 0 28px 48px rgba(15, 23, 42, 0.16);
    }
    .hero-main-plate {
      min-height: 420px;
      background-image:
        linear-gradient(180deg, rgba(15, 23, 42, 0.06), rgba(15, 23, 42, 0.18)),
        url('https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1600&q=80');
    }
    .hero-biryani-plate {
      min-height: 202px;
      background-image:
        linear-gradient(180deg, rgba(15, 23, 42, 0.04), rgba(15, 23, 42, 0.22)),
        url('https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1200&q=80');
    }
    .hero-snack-plate {
      min-height: 202px;
      background-image:
        linear-gradient(180deg, rgba(15, 23, 42, 0.04), rgba(15, 23, 42, 0.22)),
        url('https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=1200&q=80');
    }
    .hero-action-panel {
      display: grid;
      grid-template-rows: auto auto auto;
      align-content: center;
      gap: 28px;
      min-height: 100%;
      padding: 30px 32px;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.76);
      border: 1px solid rgba(15, 23, 42, 0.06);
      box-shadow: 0 22px 44px rgba(15, 23, 42, 0.08);
    }
    .hero-action-copy {
      display: grid;
      gap: 18px;
      align-content: center;
    }
    .hero-tagline {
      color: #10213e;
      font-size: clamp(1rem, 2vw, 1.12rem);
      font-weight: 600;
      line-height: 1.5;
    }
    .hero-support-copy {
      color: var(--qb-text-muted);
      font-size: 0.96rem;
      line-height: 1.6;
      max-width: 28ch;
    }
    .hero-chip-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .hero-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 52px;
      padding: 10px 12px;
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(15, 122, 95, 0.12), rgba(245, 158, 11, 0.14));
      color: #10213e;
      font-weight: 700;
    }
    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
      align-items: center;
      margin-top: 12px;
    }
    .hero-actions .primary-btn {
      min-width: 270px;
      justify-content: center;
    }
    .featured-section {
      margin-top: 40px;
    }
    .section-header {
      align-items: flex-end;
      gap: 18px;
      margin-bottom: 14px;
    }
    .section-header > div {
      padding-top: 20px;
    }
    .section-header h2 {
      white-space: nowrap;
    }
    .showcase-strip {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
    }
    .showcase-card {
      min-height: 220px;
      display: flex;
      align-items: flex-end;
      padding: 18px;
      color: #fff;
    }
    .showcase-content small,
    .showcase-content span {
      display: block;
    }
    .showcase-content small {
      margin-bottom: 6px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.84);
      font-size: 0.75rem;
    }
    .showcase-content span {
      font-size: 1.16rem;
      font-weight: 700;
    }
    .showcase-biryani {
      background-image:
        linear-gradient(180deg, rgba(15, 23, 42, 0.1), rgba(15, 23, 42, 0.38)),
        url('https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1400&q=80');
    }
    .showcase-thali {
      background-image:
        linear-gradient(180deg, rgba(15, 23, 42, 0.1), rgba(15, 23, 42, 0.38)),
        url('https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1400&q=80');
    }
    .showcase-feast {
      background-image:
        linear-gradient(180deg, rgba(15, 23, 42, 0.1), rgba(15, 23, 42, 0.38)),
        url('https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=1400&q=80');
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
      margin-top: 16px;
    }
    .section-header .secondary-btn {
      margin-top: 18px;
      align-self: end;
    }
    .restaurant-card {
      display: block;
      overflow: hidden;
      padding: 14px;
      border-radius: 24px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 252, 0.98));
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }
    .restaurant-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12);
    }
    .restaurant-card p {
      margin-top: 8px;
      color: var(--qb-text-muted);
      line-height: 1.6;
    }
    .restaurant-cover {
      position: relative;
      min-height: 220px;
      margin-bottom: 0;
      border-radius: 22px;
      overflow: hidden;
      background:
        radial-gradient(circle at top left, rgba(255, 255, 255, 0.44), transparent 16rem),
        linear-gradient(135deg, rgba(15, 122, 95, 0.95), rgba(245, 158, 11, 0.88));
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      padding: 18px;
    }
    .restaurant-cover.image-cover {
      padding: 14px;
      align-items: flex-start;
      background: #0f172a;
    }
    .restaurant-cover.image-cover img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .restaurant-cover.image-cover::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.42));
    }
    .restaurant-cover.image-cover .status-chip {
      position: relative;
      z-index: 1;
      margin-left: auto;
    }
    .restaurant-body {
      padding: 16px 6px 6px;
    }
    .restaurant-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .restaurant-title-row strong {
      font-size: 1.2rem;
      line-height: 1.2;
    }
    .cta-chip {
      flex-shrink: 0;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(15, 122, 95, 0.1);
      color: var(--qb-primary);
      font-size: 0.86rem;
      font-weight: 700;
    }
    .restaurant-cover-glow {
      position: absolute;
      inset: auto -22px -30px auto;
      width: 132px;
      height: 132px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.18);
    }
    .restaurant-initial {
      position: relative;
      z-index: 1;
      width: 58px;
      height: 58px;
      border-radius: 18px;
      display: grid;
      place-items: center;
      background: rgba(255, 255, 255, 0.16);
      color: #fff;
      font-size: 1.5rem;
      font-weight: 800;
      backdrop-filter: blur(10px);
    }
    @media (max-width: 1100px) {
      .hero-banner,
      .hero-visuals,
      .showcase-strip,
      .cards-grid {
        grid-template-columns: 1fr;
      }
      .hero-chip-row {
        grid-template-columns: 1fr;
      }
      .hero-action-panel {
        gap: 20px;
        padding: 22px;
      }
      .section-header h2 {
        white-space: normal;
      }
    }
    @media (min-width: 721px) and (max-width: 1100px) {
      .cards-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 760px) {
      .hero-main-plate,
      .hero-biryani-plate,
      .hero-snack-plate {
        min-height: 220px;
      }
      .hero-action-panel {
        justify-items: stretch;
      }
      .hero-actions .primary-btn {
        min-width: 100%;
      }
      .section-header {
        align-items: stretch;
      }
      .section-header > div {
        padding-top: 0;
      }
      .section-header .secondary-btn {
        margin-top: 0;
      }
      .restaurant-title-row {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerDashboardPageComponent {
  private readonly restaurantService = inject(RestaurantService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly featuredRestaurants = signal<Restaurant[]>([]);

  constructor() {
    this.restaurantService.getApprovedRestaurants()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurants) => {
          this.featuredRestaurants.set(restaurants.slice(0, 6));
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getErrorMessage(error));
          this.loading.set(false);
        }
      });
  }

  getRestaurantImage(restaurant: Restaurant): string | null {
    return getCustomerRestaurantImage(restaurant);
  }
}
