import { format } from 'date-fns';
import type { FoodDonationDetails, FoodDonationOccasion } from '@/components/donor/DonorFoodDonationDetailsForm';
import type { FoodTimeSlot } from '@/hooks/useFoodSlots';
import {
  buildStaffFoodPurpose,
  getHomeFoodCategory,
} from '@/lib/foodSponsorshipPurpose';
import {
  foodMealPhrase,
  type OutsideMealType,
} from '@/lib/foodSlotConstants';

export const FOOD_OCCASION_LABELS: Record<FoodDonationOccasion, string> = {
  birthday: 'Birthday',
  ancestor_remembrance: 'Memorial Day',
  festival: 'Festival / Celebration',
  special_day: 'Special Occasion',
  other: 'Others',
};

const DONOR_TO_STAFF_OCCASION: Record<FoodDonationOccasion, string> = {
  birthday: 'Birthday',
  ancestor_remembrance: 'Memorial Day',
  festival: 'Festival / Celebration',
  special_day: 'Special Occasion',
  other: 'Others',
};

const MEAL_PHRASE: Record<FoodTimeSlot, string> = {
  MORNING: 'breakfast',
  REFRESHMENTS: 'refreshments',
  AFTERNOON: 'lunch',
  EVENING: 'dinner',
  OUTSIDE_FOOD: 'outside food',
};

export function mealPhraseForSlot(
  timeSlot: FoodTimeSlot,
  slotLabel?: string,
  outsideMealType?: OutsideMealType,
): string {
  if (timeSlot === 'OUTSIDE_FOOD') {
    return foodMealPhrase(timeSlot, outsideMealType);
  }
  return MEAL_PHRASE[timeSlot] || (slotLabel || 'a meal').toLowerCase();
}

/** Auto-generated donor-facing summary sentence for food donations. */
export function buildFoodDonationSummary(params: {
  homeName: string;
  timeSlot: FoodTimeSlot;
  slotLabel?: string;
  outsideMealType?: OutsideMealType;
  details: Pick<FoodDonationDetails, 'occasion_type' | 'occasion_note' | 'donation_for' | 'event_date'>;
}): string {
  const category = getHomeFoodCategory(params.homeName);
  const occasion = DONOR_TO_STAFF_OCCASION[params.details.occasion_type] || 'Others';
  const customOccasion =
    params.details.occasion_type === 'other' ? params.details.occasion_note?.trim() : undefined;

  if (category === 'MI' || category === 'MR') {
    return buildStaffFoodPurpose({
      homeName: params.homeName,
      timeSlot: params.timeSlot,
      outsideMealType:
        params.timeSlot === 'OUTSIDE_FOOD' ? params.outsideMealType : undefined,
      occasion,
      customOccasion,
      personName: params.details.donation_for,
      eventDate: params.details.event_date,
    });
  }

  const meal = mealPhraseForSlot(params.timeSlot, params.slotLabel, params.outsideMealType);
  const home = params.homeName || 'our project';
  const occasionLabel = FOOD_OCCASION_LABELS[params.details.occasion_type] || 'your occasion';
  const forPerson = params.details.donation_for?.trim();
  const eventDate = params.details.event_date
    ? format(new Date(`${params.details.event_date}T12:00:00`), 'dd MMM yyyy')
    : '';
  const remarks = params.details.occasion_note?.trim();

  let sentence = `Towards providing ${meal} to ${home}`;

  if (forPerson) {
    sentence += ` on the occasion of ${forPerson}'s ${occasionLabel}`;
  } else if (params.details.occasion_type === 'special_day' && remarks) {
    sentence += ` on the occasion of your ${remarks}`;
  } else {
    sentence += ` on the occasion of your ${occasionLabel}`;
  }

  if (eventDate) {
    sentence += ` (${eventDate})`;
  }

  if (params.details.occasion_type !== 'special_day' && remarks) {
    sentence += ` — ${remarks}`;
  }

  return `${sentence}.`;
}

export function formatFoodPaymentBreakup(params: {
  amount: number;
  slotLabel: string;
  homeName: string;
  dateLabel: string;
  timeSlot?: FoodTimeSlot;
  outsideMealType?: OutsideMealType;
  mealAmount?: number;
  refreshmentAmount?: number;
}): { label: string; amount: number }[] {
  const mealLine =
    params.timeSlot === 'OUTSIDE_FOOD' && params.outsideMealType
      ? `${params.slotLabel} (${params.outsideMealType}) meal sponsorship · ${params.homeName} · ${params.dateLabel}`
      : `${params.slotLabel} meal sponsorship · ${params.homeName} · ${params.dateLabel}`;

  if (params.refreshmentAmount && params.refreshmentAmount > 0) {
    const meal = params.mealAmount ?? params.amount - params.refreshmentAmount;
    const refreshmentLabel =
      params.timeSlot === 'MORNING'
        ? 'Refreshments with breakfast'
        : params.timeSlot === 'AFTERNOON'
          ? 'Refreshments with lunch'
          : 'Refreshments';
    return [
      { label: mealLine, amount: meal },
      { label: `${refreshmentLabel} · ${params.homeName} · ${params.dateLabel}`, amount: params.refreshmentAmount },
    ];
  }

  return [{ label: mealLine, amount: params.amount }];
}
