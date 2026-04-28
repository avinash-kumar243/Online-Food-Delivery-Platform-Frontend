import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CurrentUser, UserRole } from '../models/auth.models';
import {
  ActivityItem,
  AnalyticsMetric,
  ApprovalStatus,
  CartSummary,
  CustomerDashboardData,
  DASHBOARD_ROUTE_BY_ROLE,
  DashboardStat,
  DashboardUserSeed,
  DeliveryAssignment,
  DeliveryPartnerDashboardData,
  DeliveryPartnerProfileSummary,
  EarningsSummary,
  FeedbackPrompt,
  MenuCategory,
  Order,
  OrderStep,
  QuickAction,
  Restaurant,
  RestaurantOwnerDashboardData,
  RestaurantProfileSummary,
  Review,
  UserProfile,
  VerificationStatus,
  WalletTransaction
} from '../models/dashboard.model';
import { environment } from '../../environments/environment';

interface CustomerProfileDto {
  customerId: number;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  profilePicUrl?: string | null;
  createdAt?: string;
}

interface RestaurantOwnerProfileDto {
  ownerId: number;
  fullName: string;
  email: string;
  phone: string;
  restaurantName?: string | null;
  restaurantAddress?: string | null;
  licenseNumber?: string | null;
  businessRegistration?: string | null;
  isActive: boolean;
  profilePicUrl?: string | null;
  createdAt?: string;
}

interface DeliveryPartnerProfileDto {
  partnerId: number;
  fullName: string;
  email: string;
  phone: string;
  licenseNumber?: string | null;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  isActive: boolean;
  isVerified?: boolean | null;
  isOnline?: boolean | null;
  rating?: number | null;
  profilePicUrl?: string | null;
  createdAt?: string;
}

interface RestaurantResponseDto {
  restaurantId: number;
  ownerId: number;
  name: string;
  description?: string | null;
  cuisine: string;
  address: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  phone: string;
  avgRating?: number | null;
  deliveryRadius?: number | null;
  isOpen?: boolean | null;
  isApproved?: boolean | null;
  minOrderAmount?: number | null;
  estimatedDeliveryMin?: number | null;
}

interface CartItemResponseDto {
  itemId: number;
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  customization?: string | null;
  lineTotal: number;
}

interface CartResponseDto {
  cartId: number | null;
  customerId: number;
  restaurantId: number | null;
  totalPrice: number;
  items: CartItemResponseDto[];
}

interface OrderItemResponseDto {
  orderItemId: number;
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  customization?: string | null;
  lineTotal: number;
}

interface OrderResponseDto {
  orderId: number;
  customerId: number;
  restaurantId: number;
  deliveryAgentId?: number | null;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  modeOfPayment: string;
  orderStatus: string;
  orderDate: string;
  estimatedDelivery?: string;
  deliveryAddress: string;
  specialInstructions?: string | null;
  items: OrderItemResponseDto[];
}

interface MenuItemResponseDto {
  itemId: number;
  restaurantId: number;
  categoryId: number;
  name: string;
  description?: string | null;
  price: number;
  discountedPrice?: number | null;
  imageUrl?: string | null;
  isVeg: boolean;
  isAvailable: boolean;
  rating?: number | null;
  calories?: number | null;
  tags?: string | null;
}

interface MenuCategoryResponseDto {
  categoryId: number;
  restaurantId: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder: number;
  items: MenuItemResponseDto[];
}

interface RestaurantMenuResponseDto {
  restaurantId: number;
  totalItems: number;
  categories: MenuCategoryResponseDto[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  private readonly authBaseUrl = environment.authBaseUrl ?? environment.backendBaseUrl;
  private readonly restaurantBaseUrl = environment.restaurantBaseUrl;
  private readonly menuBaseUrl = environment.menuBaseUrl;
  private readonly cartBaseUrl = environment.cartBaseUrl;
  private readonly orderBaseUrl = environment.orderBaseUrl;

  getDashboardRoute(role: UserRole | null): string {
    return role ? DASHBOARD_ROUTE_BY_ROLE[role] : DASHBOARD_ROUTE_BY_ROLE.CUSTOMER;
  }

  getCustomerDashboard(currentUser: DashboardUserSeed): Observable<CustomerDashboardData> {
    const fallbackUser = this.buildUserProfile(currentUser, 'CUSTOMER', {
      fullName: 'Customer',
      email: currentUser?.email ?? 'customer@quickbite.app',
      phone: 'Not available'
    });

    if (!currentUser?.id) {
      return of(this.customerFallback(fallbackUser));
    }

    const userId = currentUser.id;

    return forkJoin({
      profile: this.http
        .get<CustomerProfileDto>(`${this.authBaseUrl}/auth/customer/profile/${userId}`)
        .pipe(catchError(() => of(null))),
      restaurants: this.http
        .get<RestaurantResponseDto[]>(`${this.restaurantBaseUrl}/restaurants/search`)
        .pipe(catchError(() => of([]))),
      cart: this.http
        .get<CartResponseDto>(`${this.cartBaseUrl}/cart/${userId}`)
        .pipe(catchError(() => of(this.emptyCart(userId)))),
      orders: this.http
        .get<OrderResponseDto[]>(`${this.orderBaseUrl}/orders/customer/${userId}`)
        .pipe(catchError(() => of([])))
    }).pipe(
      map(({ profile, restaurants, cart, orders }) => {
        const user = this.buildUserProfile(currentUser, 'CUSTOMER', {
          fullName: profile?.fullName ?? fallbackUser.fullName,
          email: profile?.email ?? fallbackUser.email,
          phone: profile?.phone ?? fallbackUser.phone
        });

        const visibleRestaurants = this.visibleRestaurants(restaurants);
        const restaurantLookup = this.restaurantLookup(restaurants);
        const mappedOrders = orders.map((order) => this.mapCustomerOrder(order, restaurantLookup));
        const activeOrder = mappedOrders.find((order) => this.isActiveStatus(order.status)) ?? null;
        const orderHistory = mappedOrders.filter((order) => order !== activeOrder);
        const cartSummary = this.mapCartSummary(cart, restaurantLookup);
        const walletTransactions = this.mapWalletTransactions(orders, restaurantLookup);
        const averageRating = visibleRestaurants.length
          ? Number((visibleRestaurants.reduce((sum, restaurant) => sum + restaurant.rating, 0) / visibleRestaurants.length).toFixed(1))
          : 0;

        return {
          user,
          stats: this.statCards([
            ['active-orders', 'Active Orders', this.padValue(mappedOrders.filter((order) => this.isActiveStatus(order.status)).length), 'Live kitchen and rider updates', '📦', 'red'],
            ['cart-items', 'Cart Items', this.padValue(cart.items.length), 'Items waiting in your checkout', '🛒', 'orange'],
            ['wallet-balance', 'Wallet Balance', 'Rs. 0', 'Wallet module not yet available in backend', '💳', 'green'],
            ['reward-points', 'Reward Points', String(orders.length * 10), 'Derived from completed orders', '🎁', 'slate']
          ]),
          quickActions: this.quickActions([
            ['Browse Restaurants', 'Explore nearby restaurants and top picks.', '🍜'],
            ['View Cart', 'Review current items and checkout total.', '🛍️'],
            ['Track Order', 'Follow the active order pipeline live.', '📍'],
            ['Order History', 'Repeat favorites or inspect past orders.', '🧾'],
            ['Wallet', 'Wallet UI is ready for future backend support.', '💰'],
            ['Reviews', 'Rate food quality and delivery experience.', '⭐']
          ]),
          filters: ['Cuisine', 'Rating', 'Price', 'Delivery Time', 'Near Me'],
          restaurants: visibleRestaurants,
          cartSummary,
          activeOrder,
          orderHistory,
          walletBalance: 0,
          walletTransactions,
          feedback: this.feedbackPrompts(averageRating),
          recentActivity: this.customerRecentActivity(mappedOrders, cart)
        };
      })
    );
  }

  getRestaurantOwnerDashboard(currentUser: DashboardUserSeed): Observable<RestaurantOwnerDashboardData> {
    const fallbackUser = this.buildUserProfile(currentUser, 'RESTAURANT_OWNER', {
      fullName: 'Restaurant Owner',
      email: currentUser?.email ?? 'owner@quickbite.app',
      phone: 'Not available'
    });

    if (!currentUser?.id) {
      return of(this.restaurantOwnerFallback(fallbackUser));
    }

    const userId = currentUser.id;

    return forkJoin({
      profile: this.http
        .get<RestaurantOwnerProfileDto>(`${this.authBaseUrl}/auth/restaurant/profile/${userId}`)
        .pipe(catchError(() => of(null))),
      restaurants: this.http
        .get<RestaurantResponseDto[]>(`${this.restaurantBaseUrl}/restaurants/owner/${userId}`)
        .pipe(catchError(() => of([])))
    }).pipe(
      switchMap(({ profile, restaurants }) => {
        const primaryRestaurant = restaurants[0] ?? null;
        const menu$ = primaryRestaurant
          ? this.http
              .get<RestaurantMenuResponseDto>(`${this.menuBaseUrl}/menu/restaurant/${primaryRestaurant.restaurantId}`)
              .pipe(catchError(() => of({ restaurantId: primaryRestaurant.restaurantId, totalItems: 0, categories: [] })))
          : of<RestaurantMenuResponseDto>({ restaurantId: 0, totalItems: 0, categories: [] });
        const orders$ = primaryRestaurant
          ? this.http
              .get<OrderResponseDto[]>(`${this.orderBaseUrl}/orders/restaurant/${primaryRestaurant.restaurantId}`)
              .pipe(catchError(() => of([])))
          : of<OrderResponseDto[]>([]);

        return forkJoin({ menu: menu$, orders: orders$ }).pipe(
          map(({ menu, orders }) => {
            const user = this.buildUserProfile(currentUser, 'RESTAURANT_OWNER', {
              fullName: profile?.fullName ?? fallbackUser.fullName,
              email: profile?.email ?? fallbackUser.email,
              phone: profile?.phone ?? fallbackUser.phone
            });

            const approvalStatus = this.mapApprovalStatus(primaryRestaurant);
            const menuCategories = menu.categories.map((category) => this.mapMenuCategory(category));
            const incomingOrders = orders
              .filter((order) => !this.isClosedOrder(order.orderStatus))
              .map((order) => this.mapOwnerOrder(order, primaryRestaurant?.name ?? 'Restaurant'));
            const analytics = this.ownerAnalytics(orders);
            const stats = this.ownerStats(orders, primaryRestaurant, menuCategories);
            const restaurantProfile = this.mapRestaurantProfile(primaryRestaurant, profile);

            return {
              user,
              approvalStatus,
              approvalMessage: this.ownerApprovalMessage(approvalStatus, primaryRestaurant),
              stats,
              quickActions: this.quickActions([
                ['Register Restaurant', 'Create or onboard a new restaurant profile.', '🏪'],
                ['Manage Menu', 'Control categories, pricing, and stock.', '📋'],
                ['View Incoming Orders', 'Track the active kitchen queue.', '📦'],
                ['Update Order Status', 'Move orders toward pickup readiness.', '🔄'],
                ['View Earnings', 'Monitor revenue and order trends.', '📈'],
                ['View Reviews', 'Reviews section is ready for backend support.', '💬']
              ]),
              restaurantProfile,
              menuCategories,
              incomingOrders,
              analytics,
              reviews: [],
              recentActivity: this.ownerRecentActivity(incomingOrders, menuCategories, primaryRestaurant),
              newOrderAlertsEnabled: true
            };
          })
        );
      })
    );
  }

  getDeliveryPartnerDashboard(currentUser: DashboardUserSeed): Observable<DeliveryPartnerDashboardData> {
    const fallbackUser = this.buildUserProfile(currentUser, 'DELIVERY_PARTNER', {
      fullName: 'Delivery Partner',
      email: currentUser?.email ?? 'partner@quickbite.app',
      phone: 'Not available'
    });

    if (!currentUser?.id) {
      return of(this.deliveryPartnerFallback(fallbackUser));
    }

    const userId = currentUser.id;

    return forkJoin({
      profile: this.http
        .get<DeliveryPartnerProfileDto>(`${this.authBaseUrl}/auth/delivery-partner/profile/${userId}`)
        .pipe(catchError(() => of(null))),
      assignments: this.http
        .get<OrderResponseDto[]>(`${this.orderBaseUrl}/orders/agent/${userId}`)
        .pipe(catchError(() => of([]))),
      availableOrders: this.http
        .get<OrderResponseDto[]>(`${this.orderBaseUrl}/orders/delivery/available`)
        .pipe(catchError(() => of([]))),
      restaurants: this.http
        .get<RestaurantResponseDto[]>(`${this.restaurantBaseUrl}/restaurants/search`)
        .pipe(catchError(() => of([])))
    }).pipe(
      map(({ profile, assignments, availableOrders, restaurants }) => {
        const user = this.buildUserProfile(currentUser, 'DELIVERY_PARTNER', {
          fullName: profile?.fullName ?? fallbackUser.fullName,
          email: profile?.email ?? fallbackUser.email,
          phone: profile?.phone ?? fallbackUser.phone
        });

        const restaurantLookup = this.restaurantLookup(restaurants);
        const allPartnerOrders = assignments;
        const activeAssignments = assignments
          .filter((order) => !this.isClosedOrder(order.orderStatus))
          .map((order) => this.mapDeliveryAssignment(order, restaurantLookup));
        const completedDeliveries = allPartnerOrders.filter((order) => order.orderStatus === 'DELIVERED');
        const earnings = this.earningsSummary(completedDeliveries);
        const stats = this.deliveryStats(activeAssignments.length, completedDeliveries.length, earnings, profile?.rating ?? 0);
        const verificationStatus = this.mapVerificationStatus(profile);
        const profileSummary = this.deliveryProfileSummary(profile, user, completedDeliveries.length);
        const navigation = this.deliveryNavigation(activeAssignments);

        return {
          user,
          verificationStatus,
          verificationMessage: this.deliveryVerificationMessage(verificationStatus),
          isOnline: profile?.isOnline ?? false,
          stats,
          quickActions: this.quickActions([
            ['Toggle Online/Offline', 'Update your live dispatch availability.', '🟢'],
            ['View Assigned Orders', 'See pickup and drop-off details clearly.', '📦'],
            ['Update Location', 'Keep live GPS status fresh for dispatch.', '📍'],
            ['Mark Picked Up', 'Confirm restaurant handoff in the workflow.', '🧾'],
            ['Mark Delivered', 'Finish the drop-off and close the order.', '🏁'],
            ['View Earnings', 'Track payouts generated from deliveries.', '📈']
          ]),
          profileSummary,
          assignments: activeAssignments,
          earnings,
          ratings: [],
          recentActivity: this.deliveryRecentActivity(activeAssignments, availableOrders.length, profile?.isOnline ?? false),
          navigation
        };
      })
    );
  }

  updateRestaurantStatus(restaurantId: number, open: boolean): Observable<boolean> {
    return this.http
      .patch<RestaurantResponseDto>(`${this.restaurantBaseUrl}/restaurants/${restaurantId}/toggle-status`, { open })
      .pipe(
        map((response) => response.isOpen ?? open),
        catchError(() => of(open))
      );
  }

  updateDeliveryPartnerAvailability(partnerId: number, isOnline: boolean): Observable<boolean> {
    return this.http
      .put<DeliveryPartnerProfileDto>(`${this.authBaseUrl}/auth/delivery-partner/profile/${partnerId}`, { isOnline })
      .pipe(
        map((response) => response.isOnline ?? isOnline),
        catchError(() => of(isOnline))
      );
  }

  private customerFallback(user: UserProfile): CustomerDashboardData {
    return {
      user,
      stats: this.statCards([
        ['active-orders', 'Active Orders', '00', 'Log in again to load order data', '📦', 'red'],
        ['cart-items', 'Cart Items', '00', 'Cart data requires a resolved customer id', '🛒', 'orange'],
        ['wallet-balance', 'Wallet Balance', 'Rs. 0', 'Wallet backend is not available yet', '💳', 'green'],
        ['reward-points', 'Reward Points', '0', 'Rewards will appear after live orders', '🎁', 'slate']
      ]),
      quickActions: this.quickActions([
        ['Browse Restaurants', 'Explore restaurants once auth resolves.', '🍜'],
        ['View Cart', 'Open the cart after customer id is available.', '🛍️'],
        ['Track Order', 'Track order section becomes live after login.', '📍'],
        ['Order History', 'Recent orders require customer id.', '🧾'],
        ['Wallet', 'Wallet UI is ready for future backend support.', '💰'],
        ['Reviews', 'Rate food and delivery from recent orders.', '⭐']
      ]),
      filters: ['Cuisine', 'Rating', 'Price', 'Delivery Time', 'Near Me'],
      restaurants: [],
      cartSummary: {
        restaurantName: 'No active cart',
        itemCount: 0,
        totalAmount: 0,
        promoLabel: 'Promo module will apply after cart sync',
        note: 'Items can be added from one restaurant at a time.'
      },
      activeOrder: null,
      orderHistory: [],
      walletBalance: 0,
      walletTransactions: [],
      feedback: this.feedbackPrompts(0),
      recentActivity: []
    };
  }

  private restaurantOwnerFallback(user: UserProfile): RestaurantOwnerDashboardData {
    return {
      user,
      approvalStatus: 'PENDING_APPROVAL',
      approvalMessage: 'Log in with a restaurant owner account that exposes owner id to load live dashboard data.',
      stats: this.statCards([
        ['today-orders', "Today's Orders", '0', 'Order metrics require a restaurant record', '🧾', 'red'],
        ['today-revenue', "Today's Revenue", 'Rs. 0', 'Revenue loads after restaurant selection', '💸', 'green'],
        ['pending-orders', 'Pending Orders', '0', 'Kitchen queue appears after orders arrive', '⏱️', 'orange'],
        ['average-rating', 'Average Rating', '0.0', 'Restaurant rating comes from backend', '⭐', 'slate'],
        ['top-selling-item', 'Top Selling Item', 'N/A', 'Sales ranking needs order history', '🍛', 'red']
      ]),
      quickActions: this.quickActions([
        ['Register Restaurant', 'Create a restaurant once owner auth resolves.', '🏪'],
        ['Manage Menu', 'Menu management activates after restaurant sync.', '📋'],
        ['View Incoming Orders', 'Incoming orders require a restaurant id.', '📦'],
        ['Update Order Status', 'Kitchen workflow becomes live with orders.', '🔄'],
        ['View Earnings', 'Revenue analytics depend on order data.', '📈'],
        ['View Reviews', 'Review module is ready for future backend support.', '💬']
      ]),
      restaurantProfile: {
        id: null,
        name: 'No restaurant profile',
        cuisine: 'Not available',
        address: 'Add a restaurant to begin',
        gps: 'Not available',
        operatingHours: 'Not configured yet',
        deliveryRadius: 'Not available',
        minimumOrderAmount: 0,
        estimatedPreparationTime: 'Not available',
        isOpen: false
      },
      menuCategories: [],
      incomingOrders: [],
      analytics: [],
      reviews: [],
      recentActivity: [],
      newOrderAlertsEnabled: true
    };
  }

  private deliveryPartnerFallback(user: UserProfile): DeliveryPartnerDashboardData {
    return {
      user,
      verificationStatus: 'PENDING_VERIFICATION',
      verificationMessage: 'Log in with a delivery partner account that exposes partner id to load live assignment data.',
      isOnline: false,
      stats: this.statCards([
        ['today-earnings', "Today's Earnings", 'Rs. 0', 'Earnings need delivery history', '💰', 'green'],
        ['completed-deliveries', 'Completed Deliveries', '0', 'Completed deliveries are pulled from orders', '✅', 'red'],
        ['active-delivery', 'Active Delivery', '0', 'Assignments require a partner id', '🛵', 'orange'],
        ['customer-rating', 'Customer Rating', '0.0', 'Rating comes from delivery partner profile', '⭐', 'slate']
      ]),
      quickActions: this.quickActions([
        ['Toggle Online/Offline', 'Availability updates after partner sync.', '🟢'],
        ['View Assigned Orders', 'Assigned orders need partner id.', '📦'],
        ['Update Location', 'Location status is derived from live availability.', '📍'],
        ['Mark Picked Up', 'Delivery workflow activates with real assignments.', '🧾'],
        ['Mark Delivered', 'Drop-off flow activates with real assignments.', '🏁'],
        ['View Earnings', 'Payout summary is generated from delivered orders.', '📈']
      ]),
      profileSummary: {
        fullName: user.fullName,
        phone: user.phone,
        vehicleType: 'Not configured',
        vehicleRegistrationNumber: 'Not configured',
        locationStatus: 'Offline - unavailable for dispatch',
        rating: 0,
        totalDeliveries: 0
      },
      assignments: [],
      earnings: { total: 0, today: 0, weekly: 0, fees: [] },
      ratings: [],
      recentActivity: [],
      navigation: {
        pickupLocation: 'No pickup assigned',
        dropoffLocation: 'No drop-off assigned',
        liveSyncText: 'Live GPS syncing starts when you go online and accept an order.'
      }
    };
  }

  private visibleRestaurants(restaurants: RestaurantResponseDto[]): Restaurant[] {
    const approvedOpen = restaurants.filter((restaurant) => restaurant.isApproved && restaurant.isOpen);
    const source = approvedOpen.length ? approvedOpen : restaurants;

    return source.slice(0, 4).map((restaurant) => ({
      id: String(restaurant.restaurantId),
      name: restaurant.name,
      cuisine: restaurant.cuisine,
      rating: restaurant.avgRating ?? 0,
      deliveryTime: restaurant.estimatedDeliveryMin ? `${restaurant.estimatedDeliveryMin} min` : 'ETA unavailable',
      priceForTwo: (restaurant.minOrderAmount ?? 250) * 2,
      imageLabel: restaurant.description?.trim() || `${restaurant.name} specials`,
      offer: restaurant.isOpen ? 'Open for orders' : 'Currently unavailable'
    }));
  }

  private mapCustomerOrder(order: OrderResponseDto, restaurantLookup: Map<number, RestaurantResponseDto>): Order {
    const restaurantName = restaurantLookup.get(order.restaurantId)?.name ?? `Restaurant #${order.restaurantId}`;
    return {
      id: `QB-${order.orderId}`,
      restaurantName,
      orderDate: this.formatDateTime(order.orderDate),
      status: this.prettyStatus(order.orderStatus),
      amount: Number(order.finalAmount ?? order.totalAmount ?? 0),
      items: order.items.map((item) => `${item.quantity}x ${item.name}`),
      canCancel: ['PLACED', 'CONFIRMED'].includes(order.orderStatus),
      statusSteps: this.customerOrderSteps(order.orderStatus)
    };
  }

  private mapOwnerOrder(order: OrderResponseDto, restaurantName: string): Order {
    return {
      id: `QB-${order.orderId}`,
      restaurantName,
      orderDate: this.formatDateTime(order.orderDate),
      status: this.prettyStatus(order.orderStatus),
      amount: Number(order.finalAmount ?? order.totalAmount ?? 0),
      items: order.items.map((item) => `${item.quantity}x ${item.name}`),
      customerName: `Customer #${order.customerId}`,
      queueNote: `Customer #${order.customerId}`
    };
  }

  private mapDeliveryAssignment(order: OrderResponseDto, restaurantLookup: Map<number, RestaurantResponseDto>): DeliveryAssignment {
    const restaurant = restaurantLookup.get(order.restaurantId);
    return {
      id: `DL-${order.orderId}`,
      restaurantName: restaurant?.name ?? `Restaurant #${order.restaurantId}`,
      pickupAddress: restaurant?.address ?? 'Pickup address unavailable',
      customerName: `Customer #${order.customerId}`,
      dropoffAddress: order.deliveryAddress,
      estimatedDistance: 'Distance available in navigation',
      paymentMode: order.modeOfPayment,
      status: this.prettyStatus(order.orderStatus),
      fee: this.estimatedDeliveryFee(order),
      routeNote: order.specialInstructions?.trim() || 'No special delivery note',
      steps: this.deliverySteps(order.orderStatus)
    };
  }

  private mapCartSummary(cart: CartResponseDto, restaurantLookup: Map<number, RestaurantResponseDto>): CartSummary {
    return {
      restaurantName: cart.restaurantId ? restaurantLookup.get(cart.restaurantId)?.name ?? `Restaurant #${cart.restaurantId}` : 'No restaurant selected',
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: Number(cart.totalPrice ?? 0),
      promoLabel: 'Promo engine connected to cart backend',
      note: 'Items can be added from one restaurant at a time.'
    };
  }

  private mapWalletTransactions(orders: OrderResponseDto[], restaurantLookup: Map<number, RestaurantResponseDto>): WalletTransaction[] {
    return orders.slice(0, 3).map((order) => ({
      id: `wallet-${order.orderId}`,
      title: order.orderStatus === 'CANCELLED' ? 'Refund initiated' : 'Order payment',
      date: this.formatDate(order.orderDate),
      type: order.orderStatus === 'CANCELLED' ? 'CREDIT' : 'DEBIT',
      amount: Number(order.finalAmount ?? order.totalAmount ?? 0),
      method: order.orderStatus === 'CANCELLED'
        ? `${restaurantLookup.get(order.restaurantId)?.name ?? 'Restaurant'} refund`
        : order.modeOfPayment
    }));
  }

  private feedbackPrompts(restaurantRating: number): FeedbackPrompt[] {
    return [
      {
        label: 'Rate food quality',
        helper: 'Food feedback stays enabled; review submission backend is not available yet.',
        rating: restaurantRating
      },
      {
        label: 'Rate delivery partner',
        helper: 'Delivery review module is ready once backend review support is added.',
        rating: 0
      }
    ];
  }

  private mapRestaurantProfile(
    restaurant: RestaurantResponseDto | null,
    profile: RestaurantOwnerProfileDto | null
  ): RestaurantProfileSummary {
    return {
      id: restaurant?.restaurantId ?? null,
      name: restaurant?.name ?? profile?.restaurantName ?? 'No restaurant profile',
      cuisine: restaurant?.cuisine ?? 'Not configured',
      address: restaurant?.address ?? profile?.restaurantAddress ?? 'Not configured',
      gps: restaurant?.latitude != null && restaurant?.longitude != null
        ? `${restaurant.latitude.toFixed(4)}, ${restaurant.longitude.toFixed(4)}`
        : 'Not configured',
      operatingHours: 'Not configured yet',
      deliveryRadius: restaurant?.deliveryRadius ? `${restaurant.deliveryRadius} km` : 'Not configured',
      minimumOrderAmount: restaurant?.minOrderAmount ?? 0,
      estimatedPreparationTime: restaurant?.estimatedDeliveryMin ? `${restaurant.estimatedDeliveryMin} min` : 'Not configured',
      isOpen: restaurant?.isOpen ?? false
    };
  }

  private mapMenuCategory(category: MenuCategoryResponseDto): MenuCategory {
    return {
      name: category.name,
      items: category.items.map((item) => ({
        id: String(item.itemId),
        name: item.name,
        category: category.name,
        price: item.price,
        discountedPrice: item.discountedPrice ?? undefined,
        type: item.isVeg ? 'VEG' : 'NON_VEG',
        inStock: item.isAvailable,
        prepTime: 'Prep time not exposed'
      }))
    };
  }

  private ownerStats(
    orders: OrderResponseDto[],
    restaurant: RestaurantResponseDto | null,
    menuCategories: MenuCategory[]
  ): DashboardStat[] {
    const todaysOrders = orders.filter((order) => this.isToday(order.orderDate));
    const pendingOrders = orders.filter((order) => ['PLACED', 'CONFIRMED', 'PREPARING'].includes(order.orderStatus));
    const topSellingItem = this.topSellingItemLabel(orders);

    return this.statCards([
      ['today-orders', "Today's Orders", String(todaysOrders.length), 'Live count from order-service', '🧾', 'red'],
      ['today-revenue', "Today's Revenue", `Rs. ${this.sumAmount(todaysOrders)}`, 'Based on today’s final order amounts', '💸', 'green'],
      ['pending-orders', 'Pending Orders', String(pendingOrders.length), 'Orders still in kitchen workflow', '⏱️', 'orange'],
      ['average-rating', 'Average Rating', (restaurant?.avgRating ?? 0).toFixed(1), 'Average rating from restaurant-service', '⭐', 'slate'],
      ['top-selling-item', 'Top Selling Item', topSellingItem, `${menuCategories.reduce((sum, category) => sum + category.items.length, 0)} menu items loaded`, '🍛', 'red']
    ]);
  }

  private ownerAnalytics(orders: OrderResponseDto[]): AnalyticsMetric[] {
    const todayOrders = orders.filter((order) => this.isToday(order.orderDate));
    const monthOrders = orders.filter((order) => this.isCurrentMonth(order.orderDate));
    const peakHours = this.peakHourLabel(orders);
    const topSellingItem = this.topSellingItemLabel(orders);

    return [
      {
        label: 'Daily Revenue',
        value: `Rs. ${this.sumAmount(todayOrders)}`,
        helper: `${todayOrders.length} orders placed today`,
        percentage: Math.min(100, todayOrders.length * 12)
      },
      {
        label: 'Monthly Revenue',
        value: `Rs. ${this.sumAmount(monthOrders)}`,
        helper: `${monthOrders.length} orders in the current month`,
        percentage: Math.min(100, monthOrders.length * 4)
      },
      {
        label: 'Peak Hours',
        value: peakHours,
        helper: 'Derived from order creation timestamps',
        percentage: orders.length ? 82 : 0
      },
      {
        label: 'Top Selling Items',
        value: topSellingItem,
        helper: 'Calculated from order item quantities',
        percentage: orders.length ? 76 : 0
      }
    ];
  }

  private deliveryStats(
    activeAssignments: number,
    completedDeliveries: number,
    earnings: EarningsSummary,
    rating: number
  ): DashboardStat[] {
    return this.statCards([
      ['today-earnings', "Today's Earnings", `Rs. ${earnings.today}`, 'Calculated from delivered orders today', '💰', 'green'],
      ['completed-deliveries', 'Completed Deliveries', String(completedDeliveries), 'Based on DELIVERED orders', '✅', 'red'],
      ['active-delivery', 'Active Delivery', String(activeAssignments), 'Orders assigned and still in progress', '🛵', 'orange'],
      ['customer-rating', 'Customer Rating', (rating ?? 0).toFixed(1), 'Rating comes from delivery partner profile', '⭐', 'slate']
    ]);
  }

  private earningsSummary(deliveredOrders: OrderResponseDto[]): EarningsSummary {
    const total = deliveredOrders.reduce((sum, order) => sum + this.estimatedDeliveryFee(order), 0);
    const todayOrders = deliveredOrders.filter((order) => this.isToday(order.orderDate));
    const weeklyOrders = deliveredOrders.filter((order) => this.isWithinLastDays(order.orderDate, 7));

    return {
      total,
      today: todayOrders.reduce((sum, order) => sum + this.estimatedDeliveryFee(order), 0),
      weekly: weeklyOrders.reduce((sum, order) => sum + this.estimatedDeliveryFee(order), 0),
      fees: [
        {
          label: 'Delivered order fees',
          amount: total,
          deliveries: deliveredOrders.length
        },
        {
          label: 'Today’s completed deliveries',
          amount: todayOrders.reduce((sum, order) => sum + this.estimatedDeliveryFee(order), 0),
          deliveries: todayOrders.length
        },
        {
          label: 'Last 7 days',
          amount: weeklyOrders.reduce((sum, order) => sum + this.estimatedDeliveryFee(order), 0),
          deliveries: weeklyOrders.length
        }
      ]
    };
  }

  private deliveryProfileSummary(
    profile: DeliveryPartnerProfileDto | null,
    user: UserProfile,
    totalDeliveries: number
  ): DeliveryPartnerProfileSummary {
    const isOnline = profile?.isOnline ?? false;

    return {
      fullName: profile?.fullName ?? user.fullName,
      phone: profile?.phone ?? user.phone,
      vehicleType: profile?.vehicleType?.trim() || 'Not configured',
      vehicleRegistrationNumber: profile?.vehicleNumber?.trim() || 'Not configured',
      locationStatus: isOnline ? 'Online and ready for dispatch' : 'Offline - unavailable for dispatch',
      rating: profile?.rating ?? 0,
      totalDeliveries
    };
  }

  private deliveryNavigation(assignments: DeliveryAssignment[]) {
    const firstAssignment = assignments[0];
    return {
      pickupLocation: firstAssignment?.pickupAddress ?? 'No pickup assigned',
      dropoffLocation: firstAssignment?.dropoffAddress ?? 'No drop-off assigned',
      liveSyncText: firstAssignment
        ? 'Live GPS syncing with dispatch and customer tracking.'
        : 'Live GPS syncing starts when you accept an order.'
    };
  }

  private customerRecentActivity(orders: Order[], cart: CartResponseDto): ActivityItem[] {
    const activities: ActivityItem[] = [];

    if (cart.items.length) {
      activities.push({
        title: 'Cart synchronized',
        description: `${cart.items.length} cart item(s) loaded from cart-service.`,
        timeLabel: 'Now'
      });
    }

    const latestOrder = orders[0];
    if (latestOrder) {
      activities.push({
        title: `${latestOrder.restaurantName} order updated`,
        description: `Latest order is currently ${latestOrder.status.toLowerCase()}.`,
        timeLabel: latestOrder.orderDate
      });
    }

    return activities;
  }

  private ownerRecentActivity(
    incomingOrders: Order[],
    menuCategories: MenuCategory[],
    restaurant: RestaurantResponseDto | null
  ): ActivityItem[] {
    const activities: ActivityItem[] = [];

    if (restaurant) {
      activities.push({
        title: 'Restaurant profile synchronized',
        description: `${restaurant.name} data loaded from restaurant-service.`,
        timeLabel: 'Now'
      });
    }

    if (menuCategories.length) {
      activities.push({
        title: 'Menu categories loaded',
        description: `${menuCategories.length} category group(s) are available for management.`,
        timeLabel: 'Today'
      });
    }

    if (incomingOrders[0]) {
      activities.push({
        title: 'Kitchen queue updated',
        description: `${incomingOrders.length} order(s) are currently active in the restaurant workflow.`,
        timeLabel: incomingOrders[0].orderDate
      });
    }

    return activities;
  }

  private deliveryRecentActivity(
    assignments: DeliveryAssignment[],
    availableOrdersCount: number,
    isOnline: boolean
  ): ActivityItem[] {
    const activities: ActivityItem[] = [
      {
        title: isOnline ? 'Availability synchronized' : 'Availability is offline',
        description: isOnline
          ? 'Dispatch can assign new deliveries to this partner.'
          : 'Go online to receive new delivery assignments.',
        timeLabel: 'Now'
      }
    ];

    if (assignments[0]) {
      activities.push({
        title: 'Current assignment loaded',
        description: `${assignments[0].restaurantName} → ${assignments[0].dropoffAddress}`,
        timeLabel: 'Today'
      });
    }

    activities.push({
      title: 'Nearby opportunities refreshed',
      description: `${availableOrdersCount} unassigned active order(s) are currently visible in the order service.`,
      timeLabel: 'Today'
    });

    return activities;
  }

  private mapApprovalStatus(restaurant: RestaurantResponseDto | null): ApprovalStatus {
    if (!restaurant) return 'PENDING_APPROVAL';
    return restaurant.isApproved ? 'APPROVED' : 'PENDING_APPROVAL';
  }

  private ownerApprovalMessage(status: ApprovalStatus, restaurant: RestaurantResponseDto | null): string {
    if (!restaurant) {
      return 'Register a restaurant profile to start onboarding and accept orders.';
    }
    if (status === 'APPROVED') {
      return 'Your restaurant is visible to customers and ready to receive orders.';
    }
    return 'Your restaurant will be visible to customers after admin approval.';
  }

  private mapVerificationStatus(profile: DeliveryPartnerProfileDto | null): VerificationStatus {
    if (!profile) return 'PENDING_VERIFICATION';
    return profile.isVerified ? 'VERIFIED' : 'PENDING_VERIFICATION';
  }

  private deliveryVerificationMessage(status: VerificationStatus): string {
    if (status === 'VERIFIED') {
      return 'You are verified and eligible to receive delivery assignments.';
    }
    return 'You can receive delivery assignments after admin verification.';
  }

  private restaurantLookup(restaurants: RestaurantResponseDto[]): Map<number, RestaurantResponseDto> {
    return new Map(restaurants.map((restaurant) => [restaurant.restaurantId, restaurant]));
  }

  private customerOrderSteps(orderStatus: string): OrderStep[] {
    const orderIndexMap: Record<string, number> = {
      PLACED: 0,
      CONFIRMED: 1,
      PREPARING: 2,
      PICKED_UP: 3,
      DELIVERED: 4
    };

    return this.stepSequence(['Placed', 'Confirmed', 'Preparing', 'Picked Up', 'Delivered'], orderIndexMap[orderStatus] ?? 0);
  }

  private deliverySteps(orderStatus: string): OrderStep[] {
    const index = orderStatus === 'DELIVERED'
      ? 3
      : orderStatus === 'PICKED_UP'
        ? 2
        : 0;

    return this.stepSequence(['Assigned', 'Picked Up', 'On The Way', 'Delivered'], index);
  }

  private stepSequence(labels: string[], activeIndex: number): OrderStep[] {
    return labels.map((label, index) => ({
      label,
      completed: index < activeIndex,
      active: index === activeIndex
    }));
  }

  private buildUserProfile(
    currentUser: CurrentUser | null,
    role: UserRole,
    defaults: { fullName: string; email: string; phone: string }
  ): UserProfile {
    const fullName = defaults.fullName;
    return {
      id: currentUser?.id ?? null,
      fullName,
      email: currentUser?.email ?? defaults.email,
      role,
      roleLabel: this.roleLabel(role),
      avatarInitials: fullName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      phone: defaults.phone
    };
  }

  private roleLabel(role: UserRole): string {
    if (role === 'RESTAURANT_OWNER') return 'Restaurant Owner';
    if (role === 'DELIVERY_PARTNER') return 'Delivery Partner';
    return 'Customer';
  }

  private quickActions(actions: Array<[string, string, string]>): QuickAction[] {
    return actions.map(([label, description, icon]) => ({ label, description, icon }));
  }

  private statCards(
    cards: Array<[string, string, string, string, string, DashboardStat['accent']]>
  ): DashboardStat[] {
    return cards.map(([id, label, value, helper, icon, accent]) => ({
      id,
      label,
      value,
      helper,
      icon,
      accent
    }));
  }

  private emptyCart(customerId: number): CartResponseDto {
    return {
      cartId: null,
      customerId,
      restaurantId: null,
      totalPrice: 0,
      items: []
    };
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • ${date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
  }

  private formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private prettyStatus(status: string): string {
    return status
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private isActiveStatus(status: string): boolean {
    return !['Delivered', 'Cancelled'].includes(status);
  }

  private isClosedOrder(status: string): boolean {
    return ['DELIVERED', 'CANCELLED'].includes(status);
  }

  private padValue(value: number): string {
    return value.toString().padStart(2, '0');
  }

  private isToday(value: string): boolean {
    const date = new Date(value);
    const now = new Date();
    return date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
  }

  private isCurrentMonth(value: string): boolean {
    const date = new Date(value);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  private isWithinLastDays(value: string, days: number): boolean {
    const date = new Date(value);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return date >= cutoff;
  }

  private sumAmount(orders: OrderResponseDto[]): number {
    return orders.reduce((sum, order) => sum + Number(order.finalAmount ?? order.totalAmount ?? 0), 0);
  }

  private estimatedDeliveryFee(order: OrderResponseDto): number {
    return Math.max(35, Math.round(Number(order.finalAmount ?? order.totalAmount ?? 0) * 0.12));
  }

  private peakHourLabel(orders: OrderResponseDto[]): string {
    if (!orders.length) return 'No order history';

    const counts = new Map<number, number>();
    orders.forEach((order) => {
      const hour = new Date(order.orderDate).getHours();
      counts.set(hour, (counts.get(hour) ?? 0) + 1);
    });

    const [bestHour] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const nextHour = (bestHour + 1) % 24;
    return `${this.hourLabel(bestHour)} - ${this.hourLabel(nextHour)}`;
  }

  private topSellingItemLabel(orders: OrderResponseDto[]): string {
    const counts = new Map<string, number>();

    orders.forEach((order) => {
      order.items.forEach((item) => {
        counts.set(item.name, (counts.get(item.name) ?? 0) + item.quantity);
      });
    });

    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'No sales yet';
  }

  private hourLabel(hour: number): string {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    return date.toLocaleTimeString('en-IN', { hour: 'numeric' });
  }
}
