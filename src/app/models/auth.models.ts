export type UserRole = 'CUSTOMER' | 'RESTAURANT_OWNER' | 'DELIVERY_PARTNER' | 'ADMIN';

export interface AuthResponse {
  message: string;
  token: string;
  role?: UserRole | string;
  userRole?: UserRole | string;
  userType?: UserRole | string;
  id?: number;
  userId?: number;
  customerId?: number;
  ownerId?: number;
  partnerId?: number;
  email?: string;
  fullName?: string;
  profilePicUrl?: string | null;
}

export interface CurrentUser {
  token: string;
  role: UserRole;
  email: string | null;
  id: number | null;
  fullName?: string | null;
  profilePicUrl?: string | null;
}

export interface OtpResponse {
  message: string;
  email: string;
  expiryInSeconds: number;
}

export interface MessageResponse {
  message: string;
  token?: string;
}
