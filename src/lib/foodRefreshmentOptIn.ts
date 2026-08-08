import type { FoodSlot, FoodTimeSlot } from '@/hooks/useFoodSlots';
import { isSlotOpen } from '@/lib/foodSlotUtils';

export type RefreshmentMealPair = 'Breakfast' | 'Lunch';

/** Breakfast/lunch bookings may optionally add a paired refreshments sponsorship. */
export function canOfferRefreshmentOptIn(timeSlot: FoodTimeSlot): boolean {
  return timeSlot === 'MORNING' || timeSlot === 'AFTERNOON';
}

export function refreshmentMealPairForSlot(timeSlot: FoodTimeSlot): RefreshmentMealPair | null {
  if (timeSlot === 'MORNING') return 'Breakfast';
  if (timeSlot === 'AFTERNOON') return 'Lunch';
  return null;
}

export function refreshmentOptInLabel(timeSlot: FoodTimeSlot): string | null {
  const pair = refreshmentMealPairForSlot(timeSlot);
  if (!pair) return null;
  return pair === 'Breakfast'
    ? 'Add refreshments with breakfast'
    : 'Add refreshments with lunch';
}

export function refreshmentSlotKey(
  date: string,
  homeId: string,
  mealType: RefreshmentMealPair,
): string {
  return `${date}-${homeId}-REFRESHMENTS-${mealType}`;
}

export function findRefreshmentSlot(
  slots: FoodSlot[],
  homeId: string,
  date: string,
  mealType: RefreshmentMealPair,
): FoodSlot | undefined {
  return slots.find(
    (s) =>
      s.home_id === homeId &&
      s.date === date &&
      s.time_slot === 'REFRESHMENTS' &&
      String(s.meal_type ?? '').trim() === mealType,
  );
}

export function isRefreshmentOptInAvailable(
  slots: FoodSlot[],
  homeId: string,
  date: string,
  mealType: RefreshmentMealPair,
): boolean {
  const existing = findRefreshmentSlot(slots, homeId, date, mealType);
  return !existing || isSlotOpen(existing.status);
}

/** Append REFRESHMENTS slots for breakfast/lunch bookings when opted in at payment. */
export function appendRefreshmentBookingSlots<
  T extends {
    date: string;
    homeId: string;
    homeName: string;
    timeSlot: FoodTimeSlot;
    existingSlotId: string | null;
    slotAmount?: number;
    individualDetails?: {
      reason: string;
      sponsor_for: string;
      note: string;
      donate_on_behalf_of: string | null;
      meal_type: string | null;
    };
  },
>(
  slots: T[],
  optIn: Map<string, boolean>,
  refreshmentPrice: number,
): T[] {
  const result: T[] = [...slots];

  for (const slot of slots) {
    const mealPair = refreshmentMealPairForSlot(slot.timeSlot);
    if (!mealPair) continue;
    const key = `${slot.date}-${slot.homeId}-${slot.timeSlot}`;
    if (!optIn.get(key)) continue;

    const refreshmentReason = slot.individualDetails?.reason
      ? `${slot.individualDetails.reason} (refreshments with ${mealPair.toLowerCase()})`
      : `Refreshments with ${mealPair.toLowerCase()}`;

    result.push({
      ...slot,
      timeSlot: 'REFRESHMENTS',
      existingSlotId: null,
      slotAmount: refreshmentPrice,
      individualDetails: {
        reason: refreshmentReason,
        sponsor_for: slot.individualDetails?.sponsor_for || '',
        note: slot.individualDetails?.note || '',
        donate_on_behalf_of: slot.individualDetails?.donate_on_behalf_of ?? null,
        meal_type: mealPair,
      },
    } as T);
  }

  return result;
}
