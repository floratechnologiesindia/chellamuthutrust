import { issueFoodSlotReceipt } from './receipt.service.js';
import { sendReceiptEmailIfEligible } from './receiptEmail.service.js';
import { Receipt } from '../models/Operations.js';
import type { IReceipt } from '../models/Operations.js';
import { Notification } from '../models/Operations.js';
import { Donation, DonationPayment } from '../models/Operations.js';
import { FoodSlot, FoodSlotBookingRequest } from '../models/Finance.js';
import { Home } from '../models/Core.js';
import { User } from '../models/User.js';
import { IFoodSlot } from '../models/Finance.js';

/** Donor-facing in-app notification types */
export const DONOR_NOTIFICATION_TYPES = {
  PAYMENT_SUCCESSFUL: 'payment_successful',
  PAYMENT_FAILED: 'payment_failed',
  BALANCE_DUE: 'balance_due',
  PAY_LATER_RECEIVED: 'pay_later_received',
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_DECLINED: 'booking_declined',
  NEED_SPONSORED: 'need_sponsored',
  NEED_FULFILLED: 'need_fulfilled',
  NEW_NEED_POSTED: 'new_need_posted',
  WORK_COMPLETED: 'work_completed',
  RECEIPT_READY: 'receipt_ready',
  MILESTONE: 'milestone',
  RECURRING_DUE_SOON: 'recurring_due_soon',
  RECURRING_OVERDUE: 'recurring_overdue',
  RECURRING_RECEIVED: 'recurring_received',
  RECURRING_ENDED: 'recurring_ended',
  CALENDAR_REMINDER: 'calendar_reminder',
  OPEN_SLOTS_DIGEST: 'open_slots_digest',
  ANNIVERSARY: 'anniversary',
  TAX_SUMMARY: 'tax_summary',
  ACCOUNT_SECURITY: 'account_security',
  WELCOME: 'welcome',
} as const;

const TIME_SLOT_LABELS: Record<string, string> = {
  MORNING: 'Breakfast',
  AFTERNOON: 'Lunch',
  EVENING: 'Dinner',
  REFRESHMENTS: 'Refreshments',
};

const MILESTONE_THRESHOLDS = [1, 5, 10, 25, 50, 100];

export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function timeSlotLabel(timeSlot: string): string {
  return TIME_SLOT_LABELS[timeSlot] || timeSlot;
}

async function getHomeName(homeId: string): Promise<string> {
  const home = await Home.findById(homeId).select('name').lean();
  return home?.name || 'the home';
}

export async function notifyDonor(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  dedupeKey?: string;
}): Promise<void> {
  const user = await User.findById(params.userId).select('role status').lean();
  if (!user || user.role !== 'donor' || user.status !== 'active') return;

  if (params.dedupeKey) {
    const existing = await Notification.findOne({
      user_id: params.userId,
      dedupe_key: params.dedupeKey,
    }).lean();
    if (existing) return;
  }

  await Notification.create({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    is_read: false,
    dedupe_key: params.dedupeKey,
  });
}

export async function notifyDonorWelcome(userId: string, name: string) {
  await notifyDonor({
    userId,
    type: DONOR_NOTIFICATION_TYPES.WELCOME,
    title: 'Welcome to the donor portal',
    message: `Hi ${name}, thank you for joining M.S. Chellamuthu Trust. Browse sponsor needs, book meals on the food calendar, and track your impact in My Donations.`,
    dedupeKey: `welcome:${userId}`,
  });
}

export async function notifyDonorAccountSecurity(userId: string, action: string) {
  await notifyDonor({
    userId,
    type: DONOR_NOTIFICATION_TYPES.ACCOUNT_SECURITY,
    title: 'Account security update',
    message: action,
  });
}

export async function notifyDonorPaymentFailed(
  userId: string,
  context: { description: string; amount?: number },
) {
  const amountPart = context.amount != null ? ` for ${formatInr(context.amount)}` : '';
  await notifyDonor({
    userId,
    type: DONOR_NOTIFICATION_TYPES.PAYMENT_FAILED,
    title: 'Payment not completed',
    message: `Your payment${amountPart} for ${context.description} did not go through. The slot or need remains open — you can try again anytime.`,
  });
}

export async function notifyDonorFoodSlotPaymentSuccess(
  donorId: string,
  slot: IFoodSlot,
  amountPaid: number,
) {
  const homeName = await getHomeName(slot.home_id);
  const label = timeSlotLabel(slot.time_slot);
  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.PAYMENT_SUCCESSFUL,
    title: 'Payment successful',
    message: `Your ${formatInr(amountPaid)} ${label.toLowerCase()} sponsorship for ${homeName} on ${slot.date} is confirmed. Thank you!`,
    dedupeKey: `payment_success:food:${slot._id}:${amountPaid}`,
  });

  const paymentStatus = String(slot.payment_status ?? '').toUpperCase();
  if (paymentStatus === 'PARTIALLY_PAID') {
    const total = slot.amount ?? 0;
    const paid = slot.amount_paid ?? 0;
    const balance = Math.max(0, total - paid);
    if (balance > 0) {
      await notifyDonorBalanceDue(donorId, slot, balance);
    }
  } else {
    const issued = await issueFoodSlotReceipt({
      donorId,
      slot,
      amountPaid,
    });
    await deliverReceiptNotification(donorId, issued?.referenceKey || `food-${slot._id}`, {
      description: `${label} sponsorship · ${homeName} · ${slot.date}`,
      amount: amountPaid,
    });
  }

  await checkAndNotifyMilestones(donorId);
}

export async function notifyDonorBalanceDue(donorId: string, slot: IFoodSlot, balance: number) {
  const homeName = await getHomeName(slot.home_id);
  const label = timeSlotLabel(slot.time_slot);
  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.BALANCE_DUE,
    title: 'Balance payment due',
    message: `${formatInr(balance)} remaining on your ${label.toLowerCase()} sponsorship for ${homeName} on ${slot.date}. Complete payment from My Donations.`,
    dedupeKey: `balance_due:food:${slot._id}:${balance}`,
  });
}

export async function notifyDonorPayLaterReceived(
  donorId: string,
  data: { home_id: string; date: string; time_slot: string; amount: number },
) {
  const homeName = await getHomeName(data.home_id);
  const label = timeSlotLabel(data.time_slot);
  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.PAY_LATER_RECEIVED,
    title: 'Booking request received',
    message: `We received your pay-later request for ${label.toLowerCase()} on ${data.date} at ${homeName} (${formatInr(data.amount)}). Our team will review and confirm shortly.`,
    dedupeKey: `pay_later:${donorId}:${data.home_id}:${data.date}:${data.time_slot}`,
  });
}

export async function notifyDonorBookingConfirmed(donorId: string, slot: IFoodSlot) {
  const homeName = await getHomeName(slot.home_id);
  const label = timeSlotLabel(slot.time_slot);
  const status = String(slot.payment_status ?? 'FULLY_PENDING').toUpperCase();
  const statusLabel =
    status === 'FULLY_PAID' ? 'Paid' :
    status === 'PARTIALLY_PAID' ? 'Partially paid' : 'Unpaid';

  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.BOOKING_CONFIRMED,
    title: 'Booking confirmed',
    message: `Your ${label.toLowerCase()} on ${slot.date} at ${homeName} is confirmed (${statusLabel}).`,
    dedupeKey: `booking_confirmed:${slot._id}:${status}`,
  });

  if (status === 'PARTIALLY_PAID' || status === 'FULLY_PENDING') {
    const total = slot.amount ?? 0;
    const paid = slot.amount_paid ?? 0;
    const balance = Math.max(0, total - paid);
    if (balance > 0) await notifyDonorBalanceDue(donorId, slot, balance);
  }
}

export async function notifyDonorBookingDeclined(
  donorId: string,
  data: { home_id: string; date: string; time_slot: string; reason?: string },
) {
  const homeName = await getHomeName(data.home_id);
  const label = timeSlotLabel(data.time_slot);
  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.BOOKING_DECLINED,
    title: 'Booking not confirmed',
    message: data.reason ||
      `Your pay-later request for ${label.toLowerCase()} on ${data.date} at ${homeName} could not be confirmed. The slot is open for others to sponsor.`,
  });
}

export async function notifyDonorNeedSponsored(
  donorId: string,
  data: {
    needDescription: string;
    homeName: string;
    amount: number;
    needId: string;
    receiptReference?: string;
  },
) {
  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.NEED_SPONSORED,
    title: 'Thank you for your sponsorship',
    message: `You sponsored "${data.needDescription}" at ${data.homeName} for ${formatInr(data.amount)}.`,
    dedupeKey: `need_sponsored:${data.needId}:${donorId}`,
  });
  await deliverReceiptNotification(donorId, data.receiptReference || `need-${data.needId}`, {
    description: data.needDescription,
    amount: data.amount,
  });
  await checkAndNotifyMilestones(donorId);
}

export async function notifyDonorNeedFulfilled(
  donorId: string,
  data: { needDescription: string; homeName: string; needId: string },
) {
  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.NEED_FULFILLED,
    title: 'Need fulfilled — thank you!',
    message: `The need you sponsored — "${data.needDescription}" at ${data.homeName} — has been fulfilled and delivered.`,
    dedupeKey: `need_fulfilled:${data.needId}:${donorId}`,
  });
}

export async function notifyDonorNewNeedAtHome(
  donorId: string,
  data: { needTitle: string; homeName: string; amount?: number; needId: string },
) {
  const amountPart = data.amount != null ? ` — ${formatInr(data.amount)}` : '';
  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.NEW_NEED_POSTED,
    title: 'New need at a home you support',
    message: `New need: "${data.needTitle}" at ${data.homeName}${amountPart}.`,
    dedupeKey: `new_need:${data.needId}:${donorId}`,
  });
}

export async function notifyDonorWorkCompleted(
  donorId: string,
  message: string,
  dedupeKey?: string,
) {
  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.WORK_COMPLETED,
    title: 'Your sponsored work is complete',
    message,
    dedupeKey,
  });
}

export async function deliverReceiptNotification(
  donorId: string,
  referenceKey: string,
  data: { description: string; amount: number },
): Promise<void> {
  const receipt = await Receipt.findOne({ donor_id: donorId, reference_key: referenceKey }).lean();
  const emailed = receipt
    ? await sendReceiptEmailIfEligible(receipt as IReceipt)
    : false;
  await notifyDonorReceiptReady(donorId, {
    description: data.description,
    amount: data.amount,
    reference: referenceKey,
  }, { emailed });
}

export async function notifyDonorReceiptReady(
  donorId: string,
  data: { description: string; amount: number; reference: string },
  options?: { emailed?: boolean },
) {
  const amountLabel = formatInr(data.amount);
  const message = options?.emailed
    ? `Your receipt for ${data.description} (${amountLabel}) has been emailed to you and is available in My Donations.`
    : `Your receipt for ${data.description} (${amountLabel}) is available in My Donations. Add and verify your email in My Account to receive receipts by email.`;

  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.RECEIPT_READY,
    title: options?.emailed ? 'Receipt emailed' : 'Receipt ready',
    message,
    dedupeKey: `receipt:${data.reference}`,
  });
}

export async function notifyDonorRecurringDueSoon(
  donorId: string,
  data: { amount: number; homeName: string; dueDate: string; donationId: string },
) {
  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.RECURRING_DUE_SOON,
    title: 'Recurring donation due soon',
    message: `Your recurring gift of ${formatInr(data.amount)} to ${data.homeName} is due on ${data.dueDate}.`,
    dedupeKey: `recurring_due_soon:${data.donationId}:${data.dueDate}`,
  });
}

export async function notifyDonorRecurringOverdue(
  donorId: string,
  data: { amount: number; homeName: string; dueDate: string; donationId: string },
) {
  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.RECURRING_OVERDUE,
    title: 'Recurring donation overdue',
    message: `Your recurring gift of ${formatInr(data.amount)} to ${data.homeName} was due on ${data.dueDate}. Please pay at your earliest convenience.`,
    dedupeKey: `recurring_overdue:${data.donationId}:${data.dueDate}`,
  });
}

export async function notifyDonorRecurringReceived(
  donorId: string,
  data: { amount: number; homeName: string; donationId: string },
) {
  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.RECURRING_RECEIVED,
    title: 'Recurring donation received',
    message: `We received your ${formatInr(data.amount)} recurring contribution to ${data.homeName}. Thank you!`,
    dedupeKey: `recurring_received:${data.donationId}:${new Date().toISOString().slice(0, 10)}`,
  });
}

export async function notifyDonorRecurringEnded(
  donorId: string,
  data: { homeName: string; donationId: string; status: string },
) {
  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.RECURRING_ENDED,
    title: 'Recurring donation ended',
    message: `Your recurring pledge to ${data.homeName} has been marked ${data.status.toLowerCase()}.`,
    dedupeKey: `recurring_ended:${data.donationId}:${data.status}`,
  });
}

export async function notifyDonorCalendarReminder(
  donorId: string,
  slot: IFoodSlot,
  daysUntil: number,
) {
  const homeName = await getHomeName(slot.home_id);
  const label = timeSlotLabel(slot.time_slot);
  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.CALENDAR_REMINDER,
    title: 'Upcoming meal sponsorship',
    message: `Reminder: your ${label.toLowerCase()} sponsorship at ${homeName} is in ${daysUntil} day${daysUntil === 1 ? '' : 's'} (${slot.date}).`,
    dedupeKey: `calendar_reminder:${slot._id}:${slot.date}`,
  });
}

export async function notifyDonorOpenSlotsDigest(
  donorId: string,
  homeName: string,
  openCount: number,
  weekLabel: string,
) {
  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.OPEN_SLOTS_DIGEST,
    title: 'Open meal slots this week',
    message: `${openCount} open meal slot${openCount === 1 ? '' : 's'} at ${homeName} for ${weekLabel}. Sponsor a meal on the food calendar.`,
    dedupeKey: `open_slots_digest:${donorId}:${homeName}:${weekLabel}`,
  });
}

export async function notifyDonorAnniversary(donorId: string, name: string, years: number) {
  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.ANNIVERSARY,
    title: years === 1 ? 'Thank you for your first year!' : `${years} years of giving`,
    message: years === 1
      ? `Hi ${name}, thank you for one year with M.S. Chellamuthu Trust. Your support makes a real difference.`
      : `Hi ${name}, thank you for ${years} years of generosity with M.S. Chellamuthu Trust. Consider sponsoring a special meal to celebrate!`,
    dedupeKey: `anniversary:${donorId}:${years}:${new Date().getFullYear()}`,
  });
}

export async function notifyDonorTaxSummary(
  donorId: string,
  fyLabel: string,
  totalAmount: number,
) {
  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.TAX_SUMMARY,
    title: `${fyLabel} donation summary`,
    message: `Your ${fyLabel} donation total is ${formatInr(totalAmount)}. Contact the trust office for 80G receipt details if applicable.`,
    dedupeKey: `tax_summary:${donorId}:${fyLabel}`,
  });
}

export async function checkAndNotifyMilestones(donorId: string) {
  const [foodCount, donationCount] = await Promise.all([
    FoodSlot.countDocuments({ donor_id: donorId, status: { $in: ['BOOKED', 'PAID'] } }),
    Donation.countDocuments({ donor_id: donorId }),
  ]);
  const total = foodCount + donationCount;

  for (const threshold of MILESTONE_THRESHOLDS) {
    if (total >= threshold) {
      await notifyDonor({
        userId: donorId,
        type: DONOR_NOTIFICATION_TYPES.MILESTONE,
        title: 'Milestone reached!',
        message: `You have made ${threshold} sponsorship${threshold === 1 ? '' : 's'} with M.S. Chellamuthu Trust. Thank you for your continued generosity!`,
        dedupeKey: `milestone:${donorId}:${threshold}`,
      });
    }
  }
}

export async function notifyDonorsOfNewNeed(
  needId: string,
  homeId: string,
  needTitle: string,
  amount?: number,
) {
  const homeName = await getHomeName(homeId);
  const priorDonorIds = await Donation.distinct('donor_id', { home_id: homeId });
  const foodDonorIds = await FoodSlot.distinct('donor_id', { home_id: homeId, donor_id: { $exists: true, $ne: null } });
  const donorIds = [...new Set([...priorDonorIds, ...foodDonorIds].filter(Boolean))] as string[];

  await Promise.all(
    donorIds.map((donorId) =>
      notifyDonorNewNeedAtHome(donorId, { needTitle, homeName, amount, needId }),
    ),
  );
}

export async function notifyDonorsOfNeedFulfilled(
  needId: string,
  needDescription: string,
  homeId: string,
) {
  const homeName = await getHomeName(homeId);
  const donorIds = await Donation.distinct('donor_id', { need_id: needId });
  await Promise.all(
    donorIds.filter(Boolean).map((donorId) =>
      notifyDonorNeedFulfilled(donorId as string, { needDescription, homeName, needId }),
    ),
  );
}

export async function computeDonorFyTotal(donorId: string, fyStartYear: number): Promise<number> {
  const start = `${fyStartYear}-04-01`;
  const end = `${fyStartYear + 1}-03-31`;

  const [foodSlots, payments] = await Promise.all([
    FoodSlot.find({
      donor_id: donorId,
      date: { $gte: start, $lte: end },
      amount_paid: { $gt: 0 },
    }).select('amount_paid').lean(),
    DonationPayment.find({}).lean(),
  ]);

  const donations = await Donation.find({ donor_id: donorId }).select('_id').lean();
  const donationIds = new Set(donations.map((d) => d._id));
  const donationTotal = payments
    .filter((p) => donationIds.has(p.donation_id) && p.payment_date >= start && p.payment_date <= end)
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const foodTotal = foodSlots.reduce((sum, s) => sum + (s.amount_paid || 0), 0);
  return donationTotal + foodTotal;
}

export async function expireStaleBookingRequests() {
  const pending = await FoodSlotBookingRequest.find({ status: 'PENDING' }).lean();
  const today = new Date().toISOString().split('T')[0];

  for (const request of pending) {
    let shouldDecline = request.date < today;

    if (!shouldDecline) {
      const siblings = await FoodSlot.find({
        home_id: request.home_id,
        date: request.date,
        time_slot: request.time_slot,
        status: { $in: ['BOOKED', 'PAID'] },
      }).lean();
      const bookedByOther = siblings.find((s) => s.donor_id && s.donor_id !== request.donor_id);
      if (bookedByOther) shouldDecline = true;
    }

    if (shouldDecline) {
      await FoodSlotBookingRequest.findByIdAndUpdate(request._id, { status: 'REJECTED' });
      await notifyDonorBookingDeclined(request.donor_id, {
        home_id: request.home_id,
        date: request.date,
        time_slot: request.time_slot,
        reason: request.date < today
          ? `Your pay-later request for ${timeSlotLabel(request.time_slot).toLowerCase()} on ${request.date} expired because the date has passed.`
          : `Your pay-later request for ${timeSlotLabel(request.time_slot).toLowerCase()} on ${request.date} could not be confirmed because the slot was booked by another sponsor.`,
      });
    }
  }
}
