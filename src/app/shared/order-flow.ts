import { OrderStatus } from '../models/app.models';
import { UserRole } from '../models/auth.models';

export const ORDER_FLOW: OrderStatus[] = [
  'PLACED',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED'
];

export const ORDER_LABELS: Record<OrderStatus, string> = {
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready for pickup',
  PICKED_UP: 'Picked up',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled'
};

const NEXT_STATUS_BY_ROLE: Record<UserRole, Partial<Record<OrderStatus, OrderStatus>>> = {
  CUSTOMER: {},
  RESTAURANT_OWNER: {
    PLACED: 'CONFIRMED',
    CONFIRMED: 'PREPARING',
    PREPARING: 'READY_FOR_PICKUP'
  },
  DELIVERY_PARTNER: {
    READY_FOR_PICKUP: 'PICKED_UP',
    PICKED_UP: 'OUT_FOR_DELIVERY',
    OUT_FOR_DELIVERY: 'DELIVERED'
  },
  ADMIN: {}
};

export function getAllowedNextStatuses(role: UserRole, currentStatus: OrderStatus): OrderStatus[] {
  const nextStatus = NEXT_STATUS_BY_ROLE[role][currentStatus];
  return nextStatus ? [nextStatus] : [];
}
