import { Donation, DonationPayment } from '../models/Operations.js';
import { AppError } from '../middleware/errorHandler.js';
import { toApiDoc } from '../utils/serializers.js';
import { nextSameDayOfMonthDate } from './foodRecurringPledge.service.js';

type RecurringFrequency = 'monthly' | 'quarterly' | 'yearly' | 'annual';

function parseFrequency(value?: string | null): RecurringFrequency {
  const v = String(value || 'monthly').toLowerCase();
  if (v === 'annual' || v === 'yearly') return 'yearly';
  if (v === 'quarterly') return 'quarterly';
  return 'monthly';
}

function monthsToAdd(frequency: RecurringFrequency): number {
  if (frequency === 'yearly' || frequency === 'annual') return 12;
  if (frequency === 'quarterly') return 3;
  return 1;
}

export function computeNextDueDate(fromDate: string, frequency?: string | null): string {
  const freq = parseFrequency(frequency);
  if (freq === 'yearly' || freq === 'annual') {
    return nextSameDayOfMonthDate(fromDate, 'annual');
  }
  if (freq === 'quarterly') {
    const d = new Date(`${fromDate}T12:00:00`);
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  }
  return nextSameDayOfMonthDate(fromDate, 'monthly');
}

export async function advanceRecurringDonationSchedule(
  donationId: string,
  paymentDate?: string,
): Promise<{ next_due_date: string | null }> {
  const donation = await Donation.findById(donationId);
  if (!donation) throw new AppError('Donation not found', 404);
  if (String(donation.sponsorship_type).toUpperCase() !== 'RECURRING') {
    return { next_due_date: donation.next_due_date || null };
  }

  const paidOn = paymentDate || new Date().toISOString().slice(0, 10);
  const frequency =
    donation.recurring_frequency ||
    (donation.donor_frequency === 'ANNUAL' ? 'yearly' : 'monthly');

  const nextDue = computeNextDueDate(paidOn, frequency);

  if (donation.recurring_end_date && nextDue > donation.recurring_end_date) {
    donation.status = 'COMPLETED';
    donation.next_due_date = undefined;
  } else {
    donation.status = 'ACTIVE';
    donation.next_due_date = nextDue;
  }

  donation.last_paid_date = paidOn;
  await donation.save();
  return { next_due_date: donation.next_due_date || null };
}

export async function updateRecurringDonationStatus(
  donationId: string,
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED',
  options?: { isStaff?: boolean; donorId?: string },
) {
  const donation = await Donation.findById(donationId);
  if (!donation) throw new AppError('Donation not found', 404);
  if (!options?.isStaff && donation.donor_id !== options?.donorId) {
    throw new AppError('Not authorized for this donation', 403);
  }
  if (String(donation.sponsorship_type).toUpperCase() !== 'RECURRING') {
    throw new AppError('Not a recurring donation', 400);
  }

  if (status === 'PAUSED') {
    donation.status = 'PAUSED';
    donation.paused_at = new Date().toISOString();
  } else if (status === 'CANCELLED') {
    donation.status = 'CANCELLED';
    donation.paused_at = undefined;
  } else if (status === 'COMPLETED') {
    donation.status = 'COMPLETED';
    donation.next_due_date = undefined;
  } else {
    donation.status = 'ACTIVE';
    donation.paused_at = undefined;
  }

  await donation.save();
  return toApiDoc(donation);
}

export async function listDonationPaymentHistory(donationId: string) {
  const payments = await DonationPayment.find({ donation_id: donationId })
    .sort({ payment_date: -1 })
    .lean();
  return payments.map((p) => toApiDoc(p));
}

export async function processRecurringDonationSchedules() {
  const today = new Date().toISOString().slice(0, 10);
  const donations = await Donation.find({
    sponsorship_type: 'RECURRING',
    status: 'ACTIVE',
    next_due_date: { $lte: today },
  }).lean();

  let processed = 0;
  for (const donation of donations) {
    if (donation.recurring_end_date && donation.next_due_date! > donation.recurring_end_date) {
      await Donation.updateOne({ _id: donation._id }, { status: 'COMPLETED', next_due_date: null });
      continue;
    }
    // Mark as awaiting next cycle payment while keeping schedule
    await Donation.updateOne(
      { _id: donation._id },
      { status: 'PLEDGED' },
    );
    processed += 1;
  }
  return { processed };
}
