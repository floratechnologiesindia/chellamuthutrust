import type { FoodSlotPaymentStatus } from '@/lib/foodSlotUtils';
import type { FoodBookingPaymentMode } from '@/lib/foodPaymentConstants';

export function computeBalanceDue(totalAmount: number, amountPaid: number): number {
  return Math.max(0, totalAmount - amountPaid);
}

export function resolveBookingPaymentFields(params: {
  mode: FoodBookingPaymentMode;
  totalAmount: number;
  cashStatus?: FoodSlotPaymentStatus;
  amountReceived?: number;
}): {
  payment_mode: FoodBookingPaymentMode;
  payment_status: FoodSlotPaymentStatus;
  amount_paid: number;
} {
  if (params.mode === 'NEFT') {
    return { payment_mode: 'NEFT', payment_status: 'FULLY_PENDING', amount_paid: 0 };
  }

  if (params.mode === 'Cheque') {
    return { payment_mode: 'Cheque', payment_status: 'FULLY_PENDING', amount_paid: 0 };
  }

  const cashStatus = params.cashStatus || 'FULLY_PENDING';
  if (cashStatus === 'FULLY_PAID') {
    return {
      payment_mode: 'Cash',
      payment_status: 'FULLY_PAID',
      amount_paid: params.totalAmount,
    };
  }
  if (cashStatus === 'PARTIALLY_PAID') {
    return {
      payment_mode: 'Cash',
      payment_status: 'PARTIALLY_PAID',
      amount_paid: Math.max(0, params.amountReceived ?? 0),
    };
  }
  return { payment_mode: 'Cash', payment_status: 'FULLY_PENDING', amount_paid: 0 };
}

export function needsPaymentLink(params: {
  mode: FoodBookingPaymentMode;
  payment_status: FoodSlotPaymentStatus;
  totalAmount: number;
}): boolean {
  if (params.totalAmount <= 0) return false;
  if (params.mode === 'NEFT') return true;
  return params.payment_status === 'FULLY_PENDING' || params.payment_status === 'PARTIALLY_PAID';
}
