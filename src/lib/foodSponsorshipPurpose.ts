import { format } from 'date-fns';
import type { FoodTimeSlot } from '@/hooks/useFoodSlots';
import {
  FOOD_TIME_SLOT_LABELS,
  type OutsideMealType,
} from '@/lib/foodSlotConstants';

export type HomeFoodCategory = 'MI' | 'MR' | 'OTHER';

const MEAL_PHRASE: Record<FoodTimeSlot, string> = {
  MORNING: 'breakfast',
  REFRESHMENTS: 'refreshments',
  AFTERNOON: 'lunch',
  EVENING: 'dinner',
  OUTSIDE_FOOD: 'outside food',
};

const OUTSIDE_MEAL_PHRASE: Record<OutsideMealType, string> = {
  Breakfast: 'breakfast',
  Lunch: 'lunch',
  Dinner: 'dinner',
  Refreshments: 'refreshments',
};

/** Detect MI / MR home from project name for purpose templates. */
export function getHomeFoodCategory(homeName: string): HomeFoodCategory {
  const name = homeName.trim();
  if (!name) return 'OTHER';

  if (/\bmr\b|adult mr|intellectually challenged|special children/i.test(name)) {
    return 'MR';
  }

  if (/mentally ill|mi home|mental illness/i.test(name)) {
    return 'MI';
  }

  return 'OTHER';
}

function miHomeLabel(homeName: string): string {
  if (/palani|pln/i.test(homeName)) return 'MI Home Palani';
  if (/madurai|mdu/i.test(homeName)) return 'MI Home Madurai';
  if (/ervadi|erw/i.test(homeName)) return 'MI Home Ervadi';
  return homeName.includes('MI Home') ? homeName : `MI Home ${homeName}`;
}

function mealPhrase(
  timeSlot: FoodTimeSlot,
  outsideMealType?: OutsideMealType,
): string {
  if (timeSlot === 'OUTSIDE_FOOD' && outsideMealType) {
    return OUTSIDE_MEAL_PHRASE[outsideMealType];
  }
  return MEAL_PHRASE[timeSlot] || FOOD_TIME_SLOT_LABELS[timeSlot]?.toLowerCase() || 'a meal';
}

function occasionPhrase(occasion: string, customOccasion?: string): string {
  if (occasion === 'Others' && customOccasion?.trim()) {
    return customOccasion.trim();
  }
  return occasion;
}

/**
 * Auto-generate staff booking purpose text (MI / MR templates per client spec).
 * Result remains editable in the form before save.
 */
export function buildStaffFoodPurpose(params: {
  homeName: string;
  timeSlot: FoodTimeSlot;
  outsideMealType?: OutsideMealType;
  occasion: string;
  customOccasion?: string;
  personName?: string;
  eventDate?: string;
}): string {
  const meal = mealPhrase(params.timeSlot, params.outsideMealType);
  const occasion = occasionPhrase(params.occasion, params.customOccasion);
  const person = params.personName?.trim();
  const category = getHomeFoodCategory(params.homeName);
  const eventDate = params.eventDate
    ? format(new Date(`${params.eventDate}T12:00:00`), 'dd.MM.yyyy')
    : '';

  let sentence: string;

  if (category === 'MI') {
    const home = miHomeLabel(params.homeName);
    sentence = `Towards providing ${meal} to homeless persons with mental illness at ${home}`;
  } else if (category === 'MR') {
    sentence = `Towards providing ${meal} to intellectually challenged adolescent teens at MR Home`;
  } else {
    const home = params.homeName || 'our project';
    sentence = `Towards providing ${meal} at ${home}`;
  }

  if (person) {
    sentence += ` on the occasion of ${person}'s ${occasion}`;
  } else {
    sentence += ` on the occasion of ${occasion}`;
  }

  if (eventDate) {
    sentence += ` on ${eventDate}`;
  }

  return `${sentence}.`;
}
