import { UserRole } from './auth.models';

export type RestaurantStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type DeliveryPartnerStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED_BY_RESTAURANT'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'ACCEPTED_BY_DELIVERY_PARTNER'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'REFUND_PENDING';
export type AvailabilityStatus = 'ONLINE' | 'OFFLINE';
export type PaymentMethod = 'CARD' | 'UPI' | 'WALLET' | 'COD';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive?: boolean;
  profilePicUrl?: string | null;
}

export interface CustomerProfile extends User {
  customerId: number;
  createdAt?: string;
}

export interface RestaurantOwnerProfile extends User {
  ownerId: number;
  restaurantName?: string | null;
  restaurantAddress?: string | null;
  licenseNumber?: string | null;
  businessRegistration?: string | null;
  createdAt?: string;
}

export interface DeliveryPartner {
  partnerId: number;
  fullName: string;
  email: string;
  phone: string;
  licenseNumber?: string | null;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  isActive?: boolean;
  isVerified?: boolean;
  isOnline?: boolean;
  rating?: number | null;
  profilePicUrl?: string | null;
  createdAt?: string;
  address?: string | null;
  status?: DeliveryPartnerStatus;
  rejectionReason?: string | null;
}

export interface Restaurant {
  restaurantId: number;
  ownerId: number;
  name: string;
  description?: string | null;
  cuisine: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  avgRating?: number | null;
  deliveryRadius: number;
  isOpen: boolean;
  isApproved: boolean;
  minOrderAmount: number;
  estimatedDeliveryMin: number;
  imageUrl?: string | null;
  status?: RestaurantStatus;
  rejectionReason?: string | null;
}

export interface RestaurantRegistrationRequest {
  ownerId: number;
  name: string;
  description?: string;
  cuisine: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  deliveryRadius: number;
  minOrderAmount: number;
  estimatedDeliveryMin: number;
}

export interface MenuItem {
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
  categoryName?: string;
}

export interface MenuCategory {
  categoryId: number;
  restaurantId: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder: number;
  items: MenuItem[];
}

export interface RestaurantMenu {
  restaurantId: number;
  totalItems: number;
  categories: MenuCategory[];
}

export interface MenuItemPayload {
  itemId?: number;
  restaurantId: number;
  categoryId: number;
  name: string;
  description?: string;
  price: number;
  discountedPrice?: number | null;
  imageUrl?: string;
  isVeg: boolean;
  isAvailable: boolean;
  rating?: number | null;
  calories?: number | null;
  tags?: string;
}

export interface MenuCategoryPayload {
  categoryId?: number;
  restaurantId: number;
  name: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
}

export interface CartItem {
  itemId: number;
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  customization?: string | null;
  lineTotal: number;
}

export interface Cart {
  cartId: number | null;
  customerId: number;
  restaurantId: number | null;
  totalPrice: number;
  items: CartItem[];
}

export interface AddToCartRequest {
  customerId: number;
  restaurantId: number;
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  customization?: string;
}

export interface OrderItem {
  orderItemId?: number;
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  customization?: string | null;
  lineTotal?: number;
}

export interface Order {
  orderId: number;
  customerId: number;
  restaurantId: number;
  deliveryAgentId?: number | null;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  modeOfPayment: string;
  orderStatus: OrderStatus;
  orderDate: string;
  estimatedDelivery?: string | null;
  deliveryAddress: string;
  specialInstructions?: string | null;
  items: OrderItem[];
}

export interface PlaceOrderRequest {
  customerId: number;
  restaurantId: number;
  discount: number;
  modeOfPayment: string;
  estimatedDelivery?: string | null;
  deliveryAddress: string;
  specialInstructions?: string;
  items: Array<{
    menuItemId: number;
    name: string;
    price: number;
    quantity: number;
    customization?: string;
  }>;
}

export interface Payment {
  paymentId: number;
  orderId: number;
  customerId: number;
  amount: number;
  status: PaymentStatus;
  mode: PaymentMethod;
  transactionId?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  currency?: string | null;
  paidAt?: string | null;
  refundedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId?: string | null;
}

export interface DeliveryRegistrationRequest {
  partnerId: number;
  phone?: string;
  address?: string;
  vehicleType: string;
  vehicleNumber: string;
  licenseNumber: string;
  identityProof?: string;
  drivingLicenseDocument?: string;
}

export interface DashboardStats {
  totalOrders?: number;
  todayOrders?: number;
  totalRevenue?: number;
  totalAmountSpent?: number;
  pendingOrders?: number;
  completedOrders?: number;
  totalDeliveries?: number;
  todayDeliveries?: number;
  totalEarnings?: number;
  todayEarnings?: number;
  totalCustomers?: number;
  totalRestaurantOwners?: number;
  totalDeliveryPartners?: number;
  totalRestaurants?: number;
  pendingRestaurantApprovals?: number;
  pendingDeliveryPartnerApprovals?: number;
  totalPayments?: number;
  refundCount?: number;
}

export interface CustomerStats extends DashboardStats {
  recentOrders: Order[];
  favoriteRestaurants: Restaurant[];
  cancelledOrders: number;
}

export interface AdminUserRecord {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  isActive?: boolean;
  status?: string;
}

export interface ShellNavItem {
  label: string;
  path: string;
  icon: string;
}
