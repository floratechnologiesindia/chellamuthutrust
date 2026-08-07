import type { FoodSlotPaymentStatus } from '@/lib/foodSlotUtils';

export type FoodBookingPaymentMode = 'NEFT' | 'Cash' | 'Cheque';

export const FOOD_BOOKING_PAYMENT_MODES: FoodBookingPaymentMode[] = ['NEFT', 'Cash', 'Cheque'];

export const FOOD_BOOKING_PAYMENT_MODE_LABELS: Record<FoodBookingPaymentMode, string> = {
  NEFT: 'NEFT',
  Cash: 'Cash',
  Cheque: 'Cheque',
};

export const CASH_PAYMENT_STATUSES: FoodSlotPaymentStatus[] = [
  'FULLY_PAID',
  'PARTIALLY_PAID',
  'FULLY_PENDING',
];
