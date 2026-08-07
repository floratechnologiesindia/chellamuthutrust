import { FoodSlot, IFoodSlot } from '../models/Finance.js';
import { Home } from '../models/Core.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendDonorEmail, sendWhatsApp } from './integrations.service.js';
import {
  formatInr,
  notifyDonor,
  DONOR_NOTIFICATION_TYPES,
} from './donorNotification.service.js';
import { normalizePaymentStatus } from './foodSlotPaymentNormalize.js';
import { buildDetailFromSlot } from './foodSponsorshipAcknowledgement.service.js';

const TRUST_NAME = 'M.S. Chellamuthu Trust and Research Foundation';
export const PAYMENT_REMINDER_MIN_DAYS = 7;

function daysSince(isoDate?: Date | string | null): number {
  if (!isoDate) return 0;
  const start = new Date(isoDate);
  if (Number.isNaN(start.getTime())) return 0;
  const diffMs = Date.now() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function isFoodSlotPaymentReminderEligible(
  slot: Pick<IFoodSlot, 'status' | 'payment_status' | 'created_at' | 'updated_at'>,
  minDays = PAYMENT_REMINDER_MIN_DAYS,
): boolean {
  if (String(slot.status ?? '').toUpperCase() !== 'BOOKED') return false;
  const payment = normalizePaymentStatus(slot.payment_status, slot.status);
  if (payment !== 'FULLY_PENDING' && payment !== 'PARTIALLY_PAID') return false;
  const ref = slot.created_at || slot.updated_at;
  return daysSince(ref) >= minDays;
}

function sponsorshipSummaryForReminder(slot: IFoodSlot, homeName: string): string {
  const detail = buildDetailFromSlot(slot, homeName);
  if (detail.startsWith('towards providing')) {
    return detail.charAt(0).toUpperCase() + detail.slice(1);
  }
  return detail.charAt(0).toUpperCase() + detail.slice(1);
}

export function buildFoodPaymentReminderMessage(params: {
  donorName: string;
  paymentStatus: 'FULLY_PENDING' | 'PARTIALLY_PAID';
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  sponsorshipSummary: string;
  paymentLink?: string | null;
}): { subject: string; text: string; html: string } {
  const greeting = params.donorName.trim() ? `Dear ${params.donorName.trim()},` : 'Dear Donor,';
  const linkBlock = params.paymentLink
    ? `\n\nYou may complete your payment here:\n${params.paymentLink}`
    : '';

  let bodyMiddle: string;

  if (params.paymentStatus === 'PARTIALLY_PAID') {
    bodyMiddle = `Thank you for your generous support and for making a payment of ${formatInr(params.amountPaid)} towards your sponsorship.

This is a gentle reminder that the remaining balance of ${formatInr(params.balanceDue)} is pending.

If you have already completed the balance payment, please disregard this message.
Otherwise, we kindly request you to make the payment at your convenience.

Your support helps us continue serving those in need with dignity and compassion.`;
  } else {
    const summary = params.sponsorshipSummary.trim().replace(/\.$/, '');
    const registrationLine = summary.startsWith('towards ')
      ? `Thank you for registering your sponsorship ${summary}.`
      : `Thank you for registering your sponsorship towards ${summary}.`;

    bodyMiddle = `${registrationLine}

This is a gentle reminder that the sponsorship amount of ${formatInr(params.totalAmount)} is still pending.

If you have already made the payment, kindly ignore this message.
If not, we request you to complete the payment at your convenience.

If you need any assistance regarding the payment, please feel free to contact us.`;
  }

  const text = `${greeting}

Greetings from ${TRUST_NAME}!

${bodyMiddle}${linkBlock}

Thank you for your continued support and trust.

With gratitude,
${TRUST_NAME}`;

  const html = text
    .split('\n\n')
    .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return {
    subject:
      params.paymentStatus === 'PARTIALLY_PAID'
        ? 'Gentle reminder — balance payment pending'
        : 'Gentle reminder — sponsorship payment pending',
    text,
    html,
  };
}

export async function sendFoodSlotPaymentReminder(
  slotId: string,
  options?: { force?: boolean },
): Promise<{
  sent: boolean;
  emailSent: boolean;
  whatsappSent: boolean;
  reminderType: 'FULLY_PENDING' | 'PARTIALLY_PAID';
}> {
  const slot = await FoodSlot.findById(slotId);
  if (!slot) throw new AppError('Food slot not found', 404);

  const payment = normalizePaymentStatus(slot.payment_status, slot.status);
  if (payment !== 'FULLY_PENDING' && payment !== 'PARTIALLY_PAID') {
    throw new AppError('This sponsorship does not have a pending payment', 400);
  }

  if (!options?.force && !isFoodSlotPaymentReminderEligible(slot)) {
    throw new AppError(
      `Payment reminders can be sent only after ${PAYMENT_REMINDER_MIN_DAYS} days of pending payment`,
      400,
    );
  }

  if (!slot.donor_id) throw new AppError('No donor linked to this sponsorship', 400);

  const donor = await User.findById(slot.donor_id).select('name email phone role status').lean();
  if (!donor || donor.role !== 'donor') throw new AppError('Donor not found', 404);

  const home = await Home.findById(slot.home_id).select('name').lean();
  const homeName = home?.name || 'our project';

  const totalAmount = Number(slot.amount) || 0;
  const amountPaid = Number(slot.amount_paid) || 0;
  const balanceDue =
    payment === 'PARTIALLY_PAID' ? Math.max(0, totalAmount - amountPaid) : totalAmount;

  let paymentLink: string | null = null;
  if (slot.donation_id) {
    const base = process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'https://donor.msctrustcrm.com';
    paymentLink = `${base.replace(/\/$/, '')}/pay?donationId=${slot.donation_id}`;
  }

  const { subject, text, html } = buildFoodPaymentReminderMessage({
    donorName: donor.name || 'Donor',
    paymentStatus: payment,
    totalAmount,
    amountPaid,
    balanceDue,
    sponsorshipSummary: sponsorshipSummaryForReminder(slot, homeName),
    paymentLink,
  });

  let emailSent = false;
  let whatsappSent = false;

  if (donor.email) {
    try {
      await sendDonorEmail(donor.email, subject, html, text);
      emailSent = true;
    } catch (err) {
      console.error('[food-payment-reminder] email failed:', err);
    }
  }

  if (donor.phone) {
    try {
      await sendWhatsApp(donor.phone, text);
      whatsappSent = true;
    } catch (err) {
      console.error('[food-payment-reminder] whatsapp failed:', err);
    }
  }

  if (!emailSent && !whatsappSent) {
    throw new AppError('Could not send reminder — email and WhatsApp are unavailable', 503);
  }

  slot.payment_reminder_sent_at = new Date().toISOString();
  await slot.save();

  await notifyDonor({
    userId: slot.donor_id,
    type: DONOR_NOTIFICATION_TYPES.FOOD_PAYMENT_REMINDER,
    title: 'Payment reminder',
    message:
      payment === 'PARTIALLY_PAID'
        ? `Balance of ${formatInr(balanceDue)} is pending on your food sponsorship.`
        : `Sponsorship payment of ${formatInr(totalAmount)} is pending.`,
    dedupeKey: `food_pay_reminder:${slot._id}:${slot.payment_reminder_sent_at}`,
  });

  return { sent: true, emailSent, whatsappSent, reminderType: payment };
}

export async function listFoodSlotPaymentReminderEligible(homeId: string) {
  const slots = await FoodSlot.find({
    home_id: homeId,
    status: 'BOOKED',
    payment_status: { $in: ['FULLY_PENDING', 'PARTIALLY_PAID', 'YET_TO_PAY', 'PREPAID', 'PARTIAL'] },
  }).lean();

  return slots
    .filter((s) => isFoodSlotPaymentReminderEligible(s as IFoodSlot))
    .map((s) => {
      const payment = normalizePaymentStatus(s.payment_status, s.status)!;
      const total = Number(s.amount) || 0;
      const paid = Number(s.amount_paid) || 0;
      return {
        id: s._id,
        date: s.date,
        time_slot: s.time_slot,
        donor_id: s.donor_id,
        payment_status: payment,
        amount: total,
        amount_paid: paid,
        balance_due: payment === 'PARTIALLY_PAID' ? Math.max(0, total - paid) : total,
        days_pending: daysSince(s.created_at || s.updated_at),
        payment_reminder_sent_at: s.payment_reminder_sent_at || null,
      };
    });
}
