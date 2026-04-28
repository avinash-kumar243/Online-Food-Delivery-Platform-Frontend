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

const TRANSITIONS: Record<UserRole, OrderStatus[]> = {
  CUSTOMER: [],
  RESTAURANT_OWNER: ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'],
  DELIVERY_PARTNER: ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'],
  ADMIN: []
};

export function getAllowedNextStatuses(role: UserRole, currentStatus: OrderStatus): OrderStatus[] {
  if (currentStatus === 'PLACED' && role === 'RESTAURANT_OWNER') {
    return ['CONFIRMED'];
  }

  if (currentStatus === 'PREPARING' && role === 'RESTAURANT_OWNER') {
    return ['READY_FOR_PICKUP'];
  }

  if (currentStatus === 'READY_FOR_PICKUP' && role === 'DELIVERY_PARTNER') {
    return ['PICKED_UP'];
  }

  if (currentStatus === 'PICKED_UP' && role === 'DELIVERY_PARTNER') {
    return ['OUT_FOR_DELIVERY'];
  }

  if (currentStatus === 'OUT_FOR_DELIVERY' && role === 'DELIVERY_PARTNER') {
    return ['DELIVERED'];
  }

  return TRANSITIONS[role].filter((status) => status !== currentStatus);
}
