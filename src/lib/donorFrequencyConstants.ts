export type DonorFrequency = 'MONTHLY' | 'ANNUAL' | 'ONE_TIME';

export const DONOR_FREQUENCY_OPTIONS: { value: DonorFrequency; label: string }[] = [
  { value: 'MONTHLY', label: 'Monthly Donor' },
  { value: 'ANNUAL', label: 'Annual Donor' },
  { value: 'ONE_TIME', label: 'One-Time Donor' },
];

export const DONOR_FREQUENCY_LABELS: Record<DonorFrequency, string> = {
  MONTHLY: 'Monthly Donor',
  ANNUAL: 'Annual Donor',
  ONE_TIME: 'One-Time Donor',
};

export function foodRecurringToDonorFrequency(
  value?: string | null,
): DonorFrequency {
  const v = String(value || '').toLowerCase();
  if (v === 'monthly') return 'MONTHLY';
  if (v === 'annual' || v === 'yearly') return 'ANNUAL';
  return 'ONE_TIME';
}

export function donorFrequencyToFoodRecurring(
  value?: DonorFrequency | string | null,
): 'one_time' | 'monthly' | 'annual' {
  const v = String(value || '').toUpperCase();
  if (v === 'MONTHLY') return 'monthly';
  if (v === 'ANNUAL') return 'annual';
  return 'one_time';
}

export function donorFrequencyToNeedRecurring(
  value?: DonorFrequency | string | null,
): 'monthly' | 'quarterly' | 'yearly' {
  const v = String(value || '').toUpperCase();
  if (v === 'ANNUAL') return 'yearly';
  if (v === 'MONTHLY') return 'monthly';
  return 'monthly';
}
