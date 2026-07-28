import { format } from 'date-fns';
import type { FoodDonationDetails, FoodDonationOccasion } from '@/components/donor/DonorFoodDonationDetailsForm';
import type { FoodTimeSlot } from '@/hooks/useFoodSlots';

export const FOOD_OCCASION_LABELS: Record<FoodDonationOccasion, string> = {
  birthday: 'Birthday',
  ancestor_remembrance: 'memorial day',
  festival: 'Festival / Celebration',
  special_day: 'Special Day',
  other: 'other occasion',
};

const MEAL_PHRASE: Record<FoodTimeSlot, string> = {
  MORNING: 'breakfast',
  AFTERNOON: 'lunch',
  EVENING: 'dinner',
  REFRESHMENTS: 'refreshments',
  OUTSIDE_FOOD: 'outside food',
};

export function mealPhraseForSlot(timeSlot: FoodTimeSlot, slotLabel?: string): string {
  return MEAL_PHRASE[timeSlot] || (slotLabel || 'a meal').toLowerCase();
}

/** Auto-generated donor-facing summary sentence for food donations. */
export function buildFoodDonationSummary(params: {
  homeName: string;
  timeSlot: FoodTimeSlot;
  slotLabel?: string;
  details: Pick<FoodDonationDetails, 'occasion_type' | 'occasion_note' | 'donation_for' | 'event_date'>;
}): string {
  const meal = mealPhraseForSlot(params.timeSlot, params.slotLabel);
  const home = params.homeName || 'our project';
  const occasion = FOOD_OCCASION_LABELS[params.details.occasion_type] || 'your occasion';
  const forPerson = params.details.donation_for?.trim();
  const eventDate = params.details.event_date
    ? format(new Date(`${params.details.event_date}T12:00:00`), 'dd MMM yyyy')
    : '';
  const remarks = params.details.occasion_note?.trim();

  let sentence = `Towards providing ${meal} to ${home}`;

  if (forPerson) {
    sentence += ` on the occasion of ${forPerson}'s ${occasion}`;
  } else if (params.details.occasion_type === 'special_day' && remarks) {
    sentence += ` on the occasion of your ${remarks}`;
  } else {
    sentence += ` on the occasion of your ${occasion}`;
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
}): { label: string; amount: number }[] {
  return [
    {
      label: `${params.slotLabel} meal sponsorship · ${params.homeName} · ${params.dateLabel}`,
      amount: params.amount,
    },
  ];
}
