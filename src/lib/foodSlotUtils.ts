import { FoodSlotStatus, FoodTimeSlot } from '@/hooks/useFoodSlots';

export type FoodSlotPaymentStatus = 'FULLY_PAID' | 'PARTIALLY_PAID' | 'FULLY_PENDING';

export type DonorSlotDisplay = 'OPEN' | 'BOOKED';
export type StaffSlotDisplay = 'OPEN' | 'BOOKED_FULLY_PAID' | 'BOOKED_PARTIALLY_PAID' | 'BOOKED_FULLY_PENDING';

const STATUS_PRIORITY: Record<string, number> = {
  PAID: 4,
  BOOKED: 3,
  NEED: 1,
  AVAILABLE: 1,
};

const PAYMENT_PRIORITY: Record<string, number> = {
  FULLY_PAID: 3,
  PARTIALLY_PAID: 2,
  FULLY_PENDING: 1,
};

export function normalizeFoodSlotStatus(status: unknown): FoodSlotStatus {
  const value = String(status ?? '').toUpperCase();
  if (value === 'PAID') return 'BOOKED';
  if (value === 'BOOKED' || value === 'NEED') return value;
  return 'NEED';
}

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

export function isSlotOpen(status: unknown): boolean {
  const s = String(status ?? '').toUpperCase();
  return s === 'NEED' || s === 'AVAILABLE' || !s;
}

export function isSlotBooked(status: unknown): boolean {
  const s = String(status ?? '').toUpperCase();
  return s === 'BOOKED' || s === 'PAID';
}

export function getDonorDisplayStatus(slot?: {
  status?: string;
  payment_status?: string | null;
} | null): DonorSlotDisplay {
  if (!slot || isSlotOpen(slot.status)) return 'OPEN';
  return 'BOOKED';
}

export function getStaffDisplayStatus(slot?: {
  status?: string;
  payment_status?: string | null;
} | null): StaffSlotDisplay {
  if (!slot || isSlotOpen(slot.status)) return 'OPEN';
  const payment = normalizePaymentStatus(slot.payment_status, slot.status);
  if (payment === 'FULLY_PAID') return 'BOOKED_FULLY_PAID';
  if (payment === 'PARTIALLY_PAID') return 'BOOKED_PARTIALLY_PAID';
  return 'BOOKED_FULLY_PENDING';
}

export function staffDisplayLabel(display: StaffSlotDisplay): string {
  switch (display) {
    case 'OPEN': return 'Open';
    case 'BOOKED_FULLY_PAID': return 'Paid Fully';
    case 'BOOKED_PARTIALLY_PAID': return 'Partially Pending';
    case 'BOOKED_FULLY_PENDING': return 'Fully Pending';
  }
}

export function isFoodSlotFullyPaid(slot?: {
  status?: string;
  payment_status?: string | null;
} | null): boolean {
  if (!slot) return false;
  const payment = normalizePaymentStatus(slot.payment_status, slot.status);
  return payment === 'FULLY_PAID' || String(slot.status ?? '').toUpperCase() === 'PAID';
}

export function slotNeedsDonorPayment(slot?: {
  status?: string;
  payment_status?: string | null;
} | null): boolean {
  if (!slot || !isSlotBooked(slot.status)) return false;
  const payment = normalizePaymentStatus(slot.payment_status, slot.status);
  return payment === 'FULLY_PENDING' || payment === 'PARTIALLY_PAID';
}

export function getFoodSlotBalanceDue(slot?: {
  amount?: number | null;
  amount_paid?: number | null;
  payment_status?: string | null;
  status?: string;
} | null): number {
  if (!slot) return 0;
  if (isFoodSlotFullyPaid(slot)) return 0;
  const total = slot.amount ?? 0;
  const paid = slot.amount_paid ?? 0;
  const payment = normalizePaymentStatus(slot.payment_status, slot.status);
  if (payment === 'PARTIALLY_PAID') return Math.max(0, total - paid);
  if (payment === 'FULLY_PENDING') return total;
  return 0;
}

/** When multiple slots exist for the same meal time, prefer the most advanced status. */
export function pickFoodSlotForTimeSlot<T extends { time_slot: FoodTimeSlot; status: FoodSlotStatus | string; payment_status?: string | null }>(
  slots: T[],
  timeSlot: FoodTimeSlot,
): T | undefined {
  return slots
    .filter((s) => s.time_slot === timeSlot)
    .sort((a, b) => {
      const byStatus =
        (STATUS_PRIORITY[String(b.status).toUpperCase()] ?? 0) -
        (STATUS_PRIORITY[String(a.status).toUpperCase()] ?? 0);
      if (byStatus !== 0) return byStatus;
      const byPayment =
        (PAYMENT_PRIORITY[normalizePaymentStatus(b.payment_status, b.status) ?? ''] ?? 0) -
        (PAYMENT_PRIORITY[normalizePaymentStatus(a.payment_status, a.status) ?? ''] ?? 0);
      if (byPayment !== 0) return byPayment;
      return 0;
    })[0];
}

export function mergeFoodSlotsByCell<T extends {
  date: string;
  home_id: string;
  time_slot: FoodTimeSlot;
  status: FoodSlotStatus | string;
  payment_status?: string | null;
}>(slots: T[]): T[] {
  const map = new Map<string, T>();
  for (const slot of slots) {
    const key = `${slot.date}-${slot.home_id}-${slot.time_slot}`;
    const existing = map.get(key);
    const candidate = { ...slot, status: normalizeFoodSlotStatus(slot.status) as FoodSlotStatus };
    if (!existing) {
      map.set(key, candidate);
      continue;
    }
    const picked = pickFoodSlotForTimeSlot([existing, candidate], slot.time_slot);
    if (picked) map.set(key, picked);
  }
  return Array.from(map.values());
}
