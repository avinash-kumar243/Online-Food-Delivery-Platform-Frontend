import { UserRole } from './auth.models';

export type RestaurantStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type DeliveryPartnerStatus = 'PENDING_APPROVAL' | 'VERIFIED' | 'REJECTED';
export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'REFUND_PENDING';
export type AvailabilityStatus = 'ONLINE' | 'OFFLINE';
export type PaymentMethod = 'CARD' | 'UPI' | 'WALLET' | 'COD';
export type ReviewType = 'FOOD' | 'DELIVERY';

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
  agentId?: number;
  userId?: number;
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
  verificationStatus?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedByAdminId?: number | null;
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
  approvalStatus?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedByAdminId?: number | null;
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
  paymentStatus?: string | null;
  orderStatus: OrderStatus;
  orderDate: string;
  estimatedDelivery?: string | null;
  deliveryAddress: string;
  specialInstructions?: string | null;
  items: OrderItem[];
}

export interface Review {
  reviewId: number;
  orderId: number;
  customerId: number;
  restaurantId: number;
  agentId: number;
  reviewType: ReviewType;
  rating: number;
  comment?: string | null;
  reviewDate: string;
  verified: boolean;
}

export interface FoodReviewDTO {
  orderId: number;
  customerId: number;
  rating: number;
  comment?: string;
}

export interface DeliveryReviewDTO {
  orderId: number;
  customerId: number;
  rating: number;
  comment?: string;
}

export interface PlaceOrderRequest {
  checkoutReference: string;
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

export type RealtimeEventType = 'ORDER_CREATED' | 'ORDER_UPDATED' | 'PAYMENT_UPDATED';

export interface OrderRealtimeEvent {
  type: RealtimeEventType;
  orderId: number;
  customerId: number;
  restaurantId: number;
  deliveryAgentId?: number | null;
  orderStatus: OrderStatus;
  paymentStatus?: string | null;
  occurredAt: string;
}

export interface PaymentRealtimeEvent {
  type: RealtimeEventType;
  orderId: number;
  customerId: number;
  restaurantId: number;
  deliveryAgentId?: number | null;
  paymentStatus: PaymentStatus | string;
  amount: number;
  occurredAt: string;
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
  totalReviews?: number;
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

export interface AdminRestaurantRecord {
  restaurantId: number;
  restaurantName: string;
  ownerId: number;
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  cuisine: string;
  address: string;
  city: string;
  phone: string;
  isOpen: boolean;
  isApproved: boolean;
  approvalStatus: string;
  submittedAt?: string | null;
  rejectionReason?: string | null;
  reviewedByAdminId?: number | null;
  reviewedAt?: string | null;
}

export interface AdminDeliveryPartnerRecord {
  agentId: number;
  userId: number;
  fullName: string;
  email?: string | null;
  phone: string;
  vehicleType: string;
  vehicleNumber: string;
  isAvailable: boolean;
  isVerified: boolean;
  verificationStatus: string;
  submittedAt?: string | null;
  rejectionReason?: string | null;
  reviewedByAdminId?: number | null;
  reviewedAt?: string | null;
}

export interface ShellNavItem {
  label: string;
  path: string;
  icon: string;
}
