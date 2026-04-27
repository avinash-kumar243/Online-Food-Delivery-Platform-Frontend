export interface ApiState<T> {
  data: T;
  loading: boolean;
  error: string;
}

export interface ProfileSummary {
  id: number | null;
  fullName: string;
  email: string;
  phone: string;
  isActive?: boolean;
  profilePicUrl?: string | null;
}

export interface Restaurant {
  restaurantId?: number;
  ownerId?: number | null;
  name: string;
  description?: string;
  cuisine: string;
  address: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  phone: string;
  avgRating?: number | null;
  isOpen?: boolean;
  isApproved?: boolean;
  deliveryRadius?: number | null;
  minOrderAmount?: number | null;
  estimatedDeliveryMin?: number | null;
}

export interface OrderSummary {
  id: number | string;
  title: string;
  subtitle: string;
  status: string;
  amount?: number;
}

export interface DeliverySummary {
  id: number | string;
  pickup: string;
  dropoff: string;
  payout: number;
  distanceKm?: number;
  status: string;
}

export interface AnalyticsSummary {
  label: string;
  value: string;
  detail: string;
}
