import { CurrentUser, UserRole } from './auth.models';

export const DASHBOARD_ROUTE_BY_ROLE: Record<UserRole, string> = {
  CUSTOMER: '/customer/dashboard',
  RESTAURANT_OWNER: '/restaurant-owner/dashboard',
  DELIVERY_PARTNER: '/delivery-partner/dashboard',
  ADMIN: '/admin/dashboard'
};

export type ApprovalStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type VerificationStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';

export interface UserProfile {
  id: number | null;
  fullName: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  avatarInitials: string;
  phone: string;
  location?: string;
}

export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  helper: string;
  icon: string;
  accent: 'red' | 'orange' | 'green' | 'slate';
}

export interface QuickAction {
  label: string;
  description: string;
  icon: string;
}

export interface ActivityItem {
  title: string;
  description: string;
  timeLabel: string;
}

export interface OrderStep {
  label: string;
  completed: boolean;
  active: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  priceForTwo: number;
  imageLabel: string;
  offer: string;
}

export interface CartSummary {
  restaurantName: string;
  itemCount: number;
  totalAmount: number;
  promoLabel: string;
  note: string;
}

export interface Order {
  id: string;
  restaurantName: string;
  orderDate: string;
  status: string;
  amount: number;
  items: string[];
  customerName?: string;
  canCancel?: boolean;
  statusSteps?: OrderStep[];
  queueNote?: string;
}

export interface WalletTransaction {
  id: string;
  title: string;
  date: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  method: string;
}

export interface Review {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  date: string;
  subject: string;
  flaggable?: boolean;
}

export interface FeedbackPrompt {
  label: string;
  helper: string;
  rating: number;
}

export interface RestaurantProfileSummary {
  id: number | null;
  name: string;
  cuisine: string;
  address: string;
  gps: string;
  operatingHours: string;
  deliveryRadius: string;
  minimumOrderAmount: number;
  estimatedPreparationTime: string;
  isOpen: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  discountedPrice?: number;
  type: 'VEG' | 'NON_VEG';
  inStock: boolean;
  prepTime: string;
}

export interface MenuCategory {
  name: string;
  items: MenuItem[];
}

export interface AnalyticsMetric {
  label: string;
  value: string;
  helper: string;
  percentage: number;
}

export interface DeliveryAssignment {
  id: string;
  restaurantName: string;
  pickupAddress: string;
  customerName: string;
  dropoffAddress: string;
  estimatedDistance: string;
  paymentMode: string;
  status: string;
  fee: number;
  routeNote: string;
  steps: OrderStep[];
}

export interface EarningsLineItem {
  label: string;
  amount: number;
  deliveries: number;
}

export interface EarningsSummary {
  total: number;
  today: number;
  weekly: number;
  fees: EarningsLineItem[];
}

export interface DeliveryPartnerProfileSummary {
  fullName: string;
  phone: string;
  vehicleType: string;
  vehicleRegistrationNumber: string;
  locationStatus: string;
  rating: number;
  totalDeliveries: number;
}

export interface CustomerDashboardData {
  user: UserProfile;
  stats: DashboardStat[];
  quickActions: QuickAction[];
  filters: string[];
  restaurants: Restaurant[];
  cartSummary: CartSummary;
  activeOrder: Order | null;
  orderHistory: Order[];
  walletBalance: number;
  walletTransactions: WalletTransaction[];
  feedback: FeedbackPrompt[];
  recentActivity: ActivityItem[];
}

export interface RestaurantOwnerDashboardData {
  user: UserProfile;
  approvalStatus: ApprovalStatus;
  approvalMessage: string;
  stats: DashboardStat[];
  quickActions: QuickAction[];
  restaurantProfile: RestaurantProfileSummary;
  menuCategories: MenuCategory[];
  incomingOrders: Order[];
  analytics: AnalyticsMetric[];
  reviews: Review[];
  recentActivity: ActivityItem[];
  newOrderAlertsEnabled: boolean;
}

export interface DeliveryPartnerDashboardData {
  user: UserProfile;
  verificationStatus: VerificationStatus;
  verificationMessage: string;
  isOnline: boolean;
  stats: DashboardStat[];
  quickActions: QuickAction[];
  profileSummary: DeliveryPartnerProfileSummary;
  assignments: DeliveryAssignment[];
  earnings: EarningsSummary;
  ratings: Review[];
  recentActivity: ActivityItem[];
  navigation: {
    pickupLocation: string;
    dropoffLocation: string;
    liveSyncText: string;
  };
}

export type DashboardUserSeed = CurrentUser | null;
