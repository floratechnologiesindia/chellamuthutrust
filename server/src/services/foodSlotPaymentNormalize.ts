/** Shared payment-status normalizer for server services. */
export type FoodSlotPaymentStatus = 'FULLY_PAID' | 'PARTIALLY_PAID' | 'FULLY_PENDING';

export function normalizePaymentStatus(
  status: unknown,
  slotStatus?: unknown,
): FoodSlotPaymentStatus | null {
  const value = String(status ?? '').toUpperCase();
  if (value === 'FULLY_PAID' || value === 'PAID') return 'FULLY_PAID';
  if (value === 'PARTIALLY_PAID' || value === 'PARTIAL' || value === 'PREPAID') return 'PARTIALLY_PAID';
  if (value === 'FULLY_PENDING' || value === 'UNPAID' || value === 'YET_TO_PAY') return 'FULLY_PENDING';
  if (String(slotStatus ?? '').toUpperCase() === 'PAID') return 'FULLY_PAID';
  return null;
}
