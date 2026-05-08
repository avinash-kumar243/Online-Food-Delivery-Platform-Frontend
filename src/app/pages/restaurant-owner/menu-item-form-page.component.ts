import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, of, switchMap } from 'rxjs';
import { formatCategoryLabel, getCuisineCategories } from '../../constants/restaurant-cuisine';
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
      <p class="form-hint" *ngIf="minimumAllowedPrice() > 0">Menu item price and discounted price must be at least Rs {{ minimumAllowedPrice() }}, based on this restaurant's minimum order amount.</p>
      <div class="form-grid">
        <label><span>Name</span><input formControlName="name" /></label>
        <label>
          <span>Category</span>
          <select formControlName="categoryName">
            <option value="">Select category</option>
            <option *ngFor="let category of availableCategoryOptions()" [value]="category">{{ formatCategoryName(category) }}</option>
          </select>
        </label>
        <label><span>Price</span><input type="number" formControlName="price" [attr.min]="minimumAllowedPrice()" /></label>
        <label><span>Discounted price</span><input type="number" formControlName="discountedPrice" [attr.min]="minimumAllowedPrice()" /></label>
        <label><span>Image URL</span><input formControlName="imageUrl" /></label>
        <label><span>Calories</span><input type="number" formControlName="calories" /></label>
        <label><span>Tags</span><input formControlName="tags" /></label>
        <label><span>Vegetarian</span><select formControlName="isVeg"><option [ngValue]="true">Veg</option><option [ngValue]="false">Non-veg</option></select></label>
        <label><span>Available</span><select formControlName="isAvailable"><option [ngValue]="true">Available</option><option [ngValue]="false">Unavailable</option></select></label>
        <label class="full"><span>Description</span><textarea rows="4" formControlName="description"></textarea></label>
      </div>
      <button type="submit" class="primary-btn" [disabled]="submitting() || form.invalid">{{ submitting() ? 'Saving...' : 'Save item' }}</button>
    </form>
  `,
  styles: [`
    h1{font-size:clamp(2rem,3vw,3rem)} .form-card{padding:24px}
    .form-hint{margin:0 0 18px;color:var(--qb-text-muted);line-height:1.5}
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
  readonly availableCategoryOptions = signal<string[]>([]);
  readonly minimumAllowedPrice = signal(1);
  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    categoryName: ['', Validators.required],
    description: [''],
    price: [0, [Validators.required, Validators.min(1)]],
    discountedPrice: [0],
    imageUrl: [''],
    isVeg: [true, Validators.required],
    isAvailable: [true, Validators.required],
    calories: [0],
    tags: ['']
  }, { validators: this.minimumPricingValidator() });

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

          this.minimumAllowedPrice.set(Math.max(1, restaurant.minOrderAmount || 1));
          this.form.controls.price.addValidators(Validators.min(this.minimumAllowedPrice()));
          this.form.controls.price.updateValueAndValidity();
          this.form.controls.discountedPrice.updateValueAndValidity();
          this.form.updateValueAndValidity();

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
          this.availableCategoryOptions.set(this.buildCategoryOptions(menu.categories, this.restaurant()?.cuisine));
          if (!this.itemId) {
            this.form.patchValue({
              categoryName: this.availableCategoryOptions()[0] ?? ''
            });
          }

          if (this.itemId) {
            this.menuService.getMenuItem(this.itemId)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({ next: (item) => this.patch(item), error: () => undefined });
          }
        },
        error: () => {
          this.availableCategoryOptions.set(this.buildCategoryOptions([], this.restaurant()?.cuisine));
          if (!this.itemId && this.availableCategoryOptions().length) {
            this.form.patchValue({
              categoryName: this.availableCategoryOptions()[0]
            });
          }
          if (this.itemId) {
            this.menuService.getMenuItem(this.itemId)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({ next: (item) => this.patch(item), error: () => undefined });
          }
        }
      });
  }

  private patch(item: MenuItem): void {
    const categoryName = this.categories().find((category) => category.categoryId === item.categoryId)?.name ?? item.categoryName ?? '';
    const nextOptions = new Set(this.availableCategoryOptions());
    if (categoryName) {
      nextOptions.add(categoryName);
      this.availableCategoryOptions.set(Array.from(nextOptions));
    }

    this.form.patchValue({
      name: item.name,
      categoryName,
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

    const selectedCategoryName = this.form.controls.categoryName.value.trim();
    if (!selectedCategoryName) {
      this.form.markAllAsTouched();
      this.notificationService.error('Choose a category for this item.');
      return;
    }
    if (this.form.hasError('minimumPrice')) {
      this.notificationService.error(`Price and discounted price must be at least Rs ${this.minimumAllowedPrice()}.`);
      return;
    }
    if (this.form.hasError('discountAbovePrice')) {
      this.notificationService.error('Discounted price must be less than price.');
      return;
    }

    this.submitting.set(true);
    const existingCategoryId = this.categories()
      .find((category) => category.name.toUpperCase() === selectedCategoryName.toUpperCase())
      ?.categoryId;

    const categoryId$ = existingCategoryId
      ? of(existingCategoryId)
      : this.menuService.addCategory({
          restaurantId: restaurant.restaurantId,
          name: selectedCategoryName,
          description: `${formatCategoryLabel(selectedCategoryName)} items`,
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
            discountedPrice: this.form.controls.discountedPrice.value > 0 ? this.form.controls.discountedPrice.value : null,
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

  formatCategoryName(category: string): string {
    return formatCategoryLabel(category);
  }

  private buildCategoryOptions(categories: MenuCategory[], cuisine?: string | null): string[] {
    const options = new Set<string>(getCuisineCategories(cuisine));
    categories.forEach((category) => options.add(category.name));
    return Array.from(options);
  }

  private minimumPricingValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const price = Number(control.get('price')?.value ?? 0);
      const discountedPrice = Number(control.get('discountedPrice')?.value ?? 0);
      const minimum = this.minimumAllowedPrice();

      if (price > 0 && price < minimum) {
        return { minimumPrice: true };
      }

      if (discountedPrice > 0 && discountedPrice < minimum) {
        return { minimumPrice: true };
      }

      if (discountedPrice > 0 && price > 0 && discountedPrice >= price) {
        return { discountAbovePrice: true };
      }

      return null;
    };
  }
}
