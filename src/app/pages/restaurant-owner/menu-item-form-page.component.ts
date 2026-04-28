import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, of, switchMap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { MenuService } from '../../services/menu.service';
import { NotificationService } from '../../services/notification.service';
import { RestaurantService } from '../../services/restaurant.service';
import { MenuCategory, MenuItem, Restaurant } from '../../models/app.models';
import { getErrorMessage } from '../../services/api.utils';

@Component({
  selector: 'app-menu-item-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="section-header">
      <div>
        <span class="dashboard-kicker">Menu form</span>
        <h1>{{ itemId ? 'Update menu item' : 'Add menu item' }}</h1>
        <p class="dashboard-subtitle">This form connects directly to the menu-service create and update endpoints.</p>
      </div>
    </section>

    <form class="surface-card form-card" [formGroup]="form" (ngSubmit)="submit()" *ngIf="restaurant()">
      <div class="form-grid">
        <label><span>Name</span><input formControlName="name" /></label>
        <label>
          <span>Category</span>
          <select formControlName="categoryId">
            <option [ngValue]="0">Create new category</option>
            <option *ngFor="let category of categories()" [ngValue]="category.categoryId">{{ category.name }}</option>
          </select>
        </label>
        <label><span>Price</span><input type="number" formControlName="price" /></label>
        <label><span>Discounted price</span><input type="number" formControlName="discountedPrice" /></label>
        <label><span>Image URL</span><input formControlName="imageUrl" /></label>
        <label><span>Calories</span><input type="number" formControlName="calories" /></label>
        <label><span>Tags</span><input formControlName="tags" /></label>
        <label><span>Vegetarian</span><select formControlName="isVeg"><option [ngValue]="true">Veg</option><option [ngValue]="false">Non-veg</option></select></label>
        <label><span>Available</span><select formControlName="isAvailable"><option [ngValue]="true">Available</option><option [ngValue]="false">Unavailable</option></select></label>
        <label class="full" *ngIf="form.controls.categoryId.value === 0">
          <span>New category name</span>
          <input formControlName="categoryName" placeholder="e.g. Snacks, Main Course, Beverages" />
        </label>
        <label class="full"><span>Description</span><textarea rows="4" formControlName="description"></textarea></label>
      </div>
      <button type="submit" class="primary-btn" [disabled]="submitting() || form.invalid">{{ submitting() ? 'Saving...' : 'Save item' }}</button>
    </form>
  `,
  styles: [`
    h1{font-size:clamp(2rem,3vw,3rem)} .form-card{padding:24px}
    .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    label span{display:block;font-weight:600;margin-bottom:8px}
    input,textarea,select{width:100%;border:1px solid var(--qb-border);border-radius:14px;padding:12px 14px}
    .full{grid-column:1/-1}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuItemFormPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly menuService = inject(MenuService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly itemId = Number(this.route.snapshot.paramMap.get('itemId')) || null;
  readonly submitting = signal(false);
  readonly restaurant = signal<Restaurant | null>(null);
  readonly categories = signal<MenuCategory[]>([]);
  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    categoryId: [0, Validators.required],
    categoryName: [''],
    description: [''],
    price: [0, [Validators.required, Validators.min(1)]],
    discountedPrice: [0],
    imageUrl: [''],
    isVeg: [true, Validators.required],
    isAvailable: [true, Validators.required],
    calories: [0],
    tags: ['']
  });

  constructor() {
    const ownerId = this.authService.getCurrentUser()?.id;
    if (!ownerId) return;
    this.restaurantService.getMyRestaurant(ownerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurant) => {
          this.restaurant.set(restaurant);
          if (!restaurant) {
            return;
          }

          this.loadCategories(restaurant.restaurantId);
        }
      });
  }

  private loadCategories(restaurantId: number): void {
    this.menuService.getMenuByRestaurant(restaurantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (menu) => {
          this.categories.set(menu.categories);
          if (!this.itemId) {
            this.form.patchValue({
              categoryId: menu.categories[0]?.categoryId ?? 0
            });
          }

          if (this.itemId) {
            this.menuService.getMenuItem(this.itemId)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({ next: (item) => this.patch(item), error: () => undefined });
          }
        },
        error: () => {
          if (this.itemId) {
            this.menuService.getMenuItem(this.itemId)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({ next: (item) => this.patch(item), error: () => undefined });
          }
        }
      });
  }

  private patch(item: MenuItem): void {
    this.form.patchValue({
      name: item.name,
      categoryId: item.categoryId,
      categoryName: '',
      description: item.description || '',
      price: item.price,
      discountedPrice: item.discountedPrice || 0,
      imageUrl: item.imageUrl || '',
      isVeg: item.isVeg,
      isAvailable: item.isAvailable,
      calories: item.calories || 0,
      tags: item.tags || ''
    });
  }

  submit(): void {
    const restaurant = this.restaurant();
    if (!restaurant || this.form.invalid) return;

    const selectedCategoryId = this.form.controls.categoryId.value;
    const newCategoryName = this.form.controls.categoryName.value.trim();
    if (selectedCategoryId === 0 && !newCategoryName) {
      this.notificationService.error('Enter a category name or choose an existing category.');
      return;
    }

    this.submitting.set(true);
    const categoryId$ = selectedCategoryId > 0
      ? of(selectedCategoryId)
      : this.menuService.addCategory({
          restaurantId: restaurant.restaurantId,
          name: newCategoryName,
          description: `${newCategoryName} items`,
          imageUrl: '',
          displayOrder: this.categories().length
        }).pipe(map((category) => category.categoryId));

    categoryId$
      .pipe(
        switchMap((categoryId) => {
          const payload = {
            itemId: this.itemId || undefined,
            restaurantId: restaurant.restaurantId,
            categoryId,
            name: this.form.controls.name.value,
            description: this.form.controls.description.value,
            price: this.form.controls.price.value,
            discountedPrice: this.form.controls.discountedPrice.value,
            imageUrl: this.form.controls.imageUrl.value,
            isVeg: this.form.controls.isVeg.value,
            isAvailable: this.form.controls.isAvailable.value,
            calories: this.form.controls.calories.value,
            tags: this.form.controls.tags.value,
            rating: 0
          };

          return this.itemId ? this.menuService.updateMenuItem(payload) : this.menuService.addMenuItem(payload);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
      next: () => {
        this.notificationService.success('Menu item saved successfully.');
        this.submitting.set(false);
        this.router.navigateByUrl('/restaurant-owner/menu');
      },
      error: (error) => {
        this.notificationService.error(getErrorMessage(error));
        this.submitting.set(false);
      }
    });
  }
}
