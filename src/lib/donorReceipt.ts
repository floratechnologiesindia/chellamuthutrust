import type { InvoiceData } from '@/components/homes/InvoicePreview';
import type { DonationPayment, DonationWithRelations } from '@/hooks/useDonations';
import type { FoodSlot } from '@/hooks/useFoodSlots';
import { isFoodSlotFullyPaid } from '@/lib/foodSlotUtils';

const TIME_SLOT_LABELS: Record<string, string> = {
  MORNING: 'Breakfast',
  AFTERNOON: 'Lunch',
  EVENING: 'Dinner',
  REFRESHMENTS: 'Refreshments',
  OUTSIDE_FOOD: 'Outside Food',
};

export type ReceiptTarget =
  | { kind: 'food'; id: string }
  | { kind: 'donation'; id: string; paymentId?: string }
  | { kind: 'need'; needId: string };

export interface DonorReceiptProfile {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export function formatDonorAddress(profile: DonorReceiptProfile): string | undefined {
  const parts = [profile.address, profile.city, profile.state, profile.pincode].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

/** Stable receipt number for the same payment / sponsorship reference. */
export function receiptNumberFromReference(reference: string): string {
  let hash = 0;
  for (let i = 0; i < reference.length; i += 1) {
    hash = (hash << 5) - hash + reference.charCodeAt(i);
    hash |= 0;
  }
  const year = new Date().getFullYear();
  return `RCP-${year}-${Math.abs(hash).toString().padStart(6, '0').slice(-6)}`;
}

export function parseReceiptReference(ref: string): ReceiptTarget | null {
  if (ref.startsWith('food-')) {
    return { kind: 'food', id: ref.slice(5) };
  }
  if (ref.startsWith('need-')) {
    return { kind: 'need', needId: ref.slice(5) };
  }
  const donationMatch = ref.match(
    /^donation-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(.+)$/i,
  );
  if (donationMatch) {
    return { kind: 'donation', id: donationMatch[1], paymentId: donationMatch[2] };
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)) {
    return { kind: 'donation', id: ref };
  }
  return null;
}

export function parseReceiptDedupeKey(dedupeKey?: string | null): ReceiptTarget | null {
  if (!dedupeKey?.startsWith('receipt:')) return null;
  return parseReceiptReference(dedupeKey.slice('receipt:'.length));
}

export function receiptQueryParam(target: ReceiptTarget): string {
  if (target.kind === 'food') return `food-${target.id}`;
  if (target.kind === 'need') return `need-${target.needId}`;
  return target.paymentId ? `donation-${target.id}-${target.paymentId}` : target.id;
}

export function receiptDonationsPath(receiptParam: string): string {
  return `/?tab=donations&receipt=${encodeURIComponent(receiptParam)}`;
}

export function receiptDonationsPathById(receiptId: string): string {
  return `/?tab=donations&receiptId=${encodeURIComponent(receiptId)}`;
}

export function receiptPathFromDedupeKey(dedupeKey?: string | null): string | null {
  const target = parseReceiptDedupeKey(dedupeKey);
  if (!target) return null;
  return receiptDonationsPath(receiptQueryParam(target));
}

export function latestPaymentByDonation(payments: DonationPayment[]): Map<string, DonationPayment> {
  const map = new Map<string, DonationPayment>();
  for (const payment of payments) {
    if (!map.has(payment.donation_id)) {
      map.set(payment.donation_id, payment);
    }
  }
  return map;
}

export function donationHasReceipt(
  donation: DonationWithRelations,
  paymentsByDonation: Map<string, DonationPayment>,
): boolean {
  return Boolean(donation.last_paid_date || paymentsByDonation.has(donation.id));
}

export function buildFoodSlotReceiptData(
  slot: FoodSlot & { homes?: { name: string } | null },
  profile: DonorReceiptProfile,
): Omit<InvoiceData, 'receiptNumber'> {
  const slotLabel = TIME_SLOT_LABELS[slot.time_slot] || slot.time_slot;
  const reference = `food-${slot.id}`;

  return {
    date: slot.date,
    donorName: profile.name || 'Donor',
    donorAddress: formatDonorAddress(profile),
    donorPhone: profile.phone,
    donorEmail: profile.email,
    description: `${slotLabel} meal sponsorship${slot.reason ? ` — ${slot.reason}` : ''}`,
    amount: slot.amount_paid ?? slot.amount ?? 0,
    homeName: slot.homes?.name,
    donationType: 'food_slot',
    paymentMode: slot.payment_mode || 'Online',
    referenceNumber: reference,
    paymentDate: slot.date,
  };
}

export function buildDonationReceiptData(
  donation: DonationWithRelations,
  profile: DonorReceiptProfile,
  payment?: DonationPayment | null,
): Omit<InvoiceData, 'receiptNumber'> {
  const need = donation.needs;
  const categoryLabel = need?.categories?.label;
  const amount = payment?.amount ?? donation.amount_pledged;
  const paymentDate = payment?.payment_date ?? donation.last_paid_date ?? donation.start_date;
  const reference = payment?.payment_reference
    ? `donation-${donation.id}-${payment.payment_reference}`
    : `donation-${donation.id}`;

  return {
    date: donation.start_date,
    donorName: profile.name || 'Donor',
    donorAddress: formatDonorAddress(profile),
    donorPhone: profile.phone,
    donorEmail: profile.email,
    description:
      need?.description ||
      categoryLabel ||
      donation.occasion_note ||
      'Voluntary contribution',
    amount,
    homeName: donation.homes?.name,
    donationType: donation.need_id ? 'need' : 'donation',
    paymentMode: donation.payment_mode === 'online' ? 'Online' : 'Online',
    referenceNumber: payment?.payment_reference ?? reference,
    paymentDate,
  };
}

export function foodSlotReceiptReference(slotId: string): string {
  return `food-${slotId}`;
}

export function donationReceiptReference(
  donationId: string,
  payment?: DonationPayment | null,
): string {
  if (payment?.payment_reference) {
    return `donation-${donationId}-${payment.payment_reference}`;
  }
  return `donation-${donationId}`;
}

export function canShowFoodSlotReceipt(slot: FoodSlot): boolean {
  return isFoodSlotFullyPaid(slot) && (slot.amount_paid ?? slot.amount ?? 0) > 0;
}
