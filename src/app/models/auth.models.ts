export type UserRole = 'CUSTOMER' | 'RESTAURANT_OWNER' | 'DELIVERY_PARTNER';

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
}

export interface CurrentUser {
  token: string;
  role: UserRole;
  email: string | null;
  id: number | null;
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
