import type { FoodTimeSlot } from '@/hooks/useFoodSlots';

/** Client-required column order: Breakfast → Refreshments → Lunch → Dinner → Outside Food */
export const FOOD_TIME_SLOTS: FoodTimeSlot[] = [
  'MORNING',
  'REFRESHMENTS',
  'AFTERNOON',
  'EVENING',
  'OUTSIDE_FOOD',
];

export const FOOD_TIME_SLOT_LABELS: Record<FoodTimeSlot, string> = {
  MORNING: 'Breakfast',
  REFRESHMENTS: 'Refreshments',
  AFTERNOON: 'Lunch',
  EVENING: 'Dinner',
  OUTSIDE_FOOD: 'Outside Food',
};

export const FOOD_TIME_SLOT_SHORT_LABELS: Record<FoodTimeSlot, string> = {
  MORNING: 'BF',
  REFRESHMENTS: 'Ref',
  AFTERNOON: 'Lun',
  EVENING: 'Din',
  OUTSIDE_FOOD: 'Out',
};

/** Meal types selectable when booking an Outside Food slot */
export type OutsideMealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Refreshments';

export const OUTSIDE_MEAL_TYPES: OutsideMealType[] = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Refreshments',
];

/** Human-readable label for calendar cells, receipts, and notifications. */
export function formatFoodSlotLabel(
  timeSlot: FoodTimeSlot,
  mealType?: string | null,
): string {
  const base = FOOD_TIME_SLOT_LABELS[timeSlot] || timeSlot;
  if (timeSlot === 'OUTSIDE_FOOD' && mealType?.trim()) {
    return `${base} (${mealType.trim()})`;
  }
  return base;
}

/** Lower-case meal phrase for purpose / summary sentences. */
export function foodMealPhrase(
  timeSlot: FoodTimeSlot,
  mealType?: OutsideMealType | string | null,
): string {
  if (timeSlot === 'OUTSIDE_FOOD' && mealType) {
    return String(mealType).toLowerCase();
  }
  return FOOD_TIME_SLOT_LABELS[timeSlot]?.toLowerCase() || 'a meal';
}

/** Phase 1 occasion options for staff food sponsorship booking */
export const FOOD_OCCASION_OPTIONS = [
  'Birthday',
  'Memorial Day',
  'Special Occasion',
  'Others',
] as const;

export type FoodOccasionOption = (typeof FOOD_OCCASION_OPTIONS)[number];
