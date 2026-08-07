import type { FoodSlot } from '@/hooks/useFoodSlots';
import { normalizePaymentStatus, getFoodSlotBalanceDue } from '@/lib/foodSlotUtils';

export const PAYMENT_REMINDER_MIN_DAYS = 7;

export function daysSinceDate(isoDate?: string | null): number {
  if (!isoDate) return 0;
  const start = new Date(isoDate);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function isEligibleForPaymentReminder(slot: Pick<FoodSlot, 'status' | 'payment_status' | 'created_at'>): boolean {
  if (slot.status !== 'BOOKED') return false;
  const pay = normalizePaymentStatus(slot.payment_status, slot.status);
  if (pay !== 'FULLY_PENDING' && pay !== 'PARTIALLY_PAID') return false;
  return daysSinceDate(slot.created_at) >= PAYMENT_REMINDER_MIN_DAYS;
}

export function paymentReminderLabel(slot: FoodSlot): string {
  const pay = normalizePaymentStatus(slot.payment_status, slot.status);
  if (pay === 'PARTIALLY_PAID') {
    return `Remind balance ₹${getFoodSlotBalanceDue(slot).toLocaleString('en-IN')}`;
  }
  return `Remind pending ₹${(slot.amount || 0).toLocaleString('en-IN')}`;
}
