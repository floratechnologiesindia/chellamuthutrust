import crypto from 'crypto';
import { env } from '../config/env.js';
import { Donation, DonationPayment } from '../models/Operations.js';
import { AppError } from '../middleware/errorHandler.js';
import { completeFoodSlotPayment } from './payment.service.js';
import { Home } from '../models/Core.js';
import { Need } from '../models/Operations.js';
import {
  notifyDonorNeedSponsored,
  notifyDonorRecurringReceived,
  deliverReceiptNotification,
  checkAndNotifyMilestones,
} from './donorNotification.service.js';
import { issueDonationPaymentReceipt } from './receipt.service.js';

export interface RazorpayOrderNotes {
  donation_id?: string;
  donor_id?: string;
  donor_name?: string;
  donor_email?: string;
  food_slot_id?: string;
  home_id?: string;
  trust_id?: string;
  date?: string;
  time_slot?: string;
  occasion_type?: string;
  occasion_note?: string;
  recurring_frequency?: string;
  donation_for?: string;
  event_date?: string;
  donor_board_name?: string;
  purpose?: 'donation' | 'food_slot';
}

function noteValue(notes: Record<string, unknown> | undefined, key: string): string {
  const value = notes?.[key];
  return value != null ? String(value).trim() : '';
}

/** Razorpay receipt must be ≤ 40 characters. Full context lives in order notes. */
function buildRazorpayReceipt(notes: RazorpayOrderNotes): string {
  const MAX = 40;
  if (notes.donation_id) {
    return notes.donation_id.slice(0, MAX);
  }
  if (notes.home_id && notes.date && notes.time_slot) {
    const hash = crypto
      .createHash('sha256')
      .update(`${notes.home_id}|${notes.date}|${notes.time_slot}|${notes.donor_id || ''}|${Date.now()}`)
      .digest('hex')
      .slice(0, 12);
    return `fd_${hash}`; // e.g. fd_a1b2c3d4e5f6 (15 chars)
  }
  return `rcpt_${Date.now()}`.slice(0, MAX);
}

export async function createRazorpayOrder(
  amount: number,
  notes: RazorpayOrderNotes = {},
) {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) throw new AppError('Razorpay not configured', 500);
  if (!amount || amount < 1) throw new AppError('Amount must be at least ₹1', 400);

  const receipt = buildRazorpayReceipt(notes);

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64'),
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt,
      notes: {
        donation_id: notes.donation_id || '',
        donor_id: notes.donor_id || '',
        donor_name: notes.donor_name || '',
        donor_email: notes.donor_email || '',
        food_slot_id: notes.food_slot_id || '',
        home_id: notes.home_id || '',
        trust_id: notes.trust_id || '',
        date: notes.date || '',
        time_slot: notes.time_slot || '',
        purpose: notes.purpose || (notes.donation_id ? 'donation' : notes.home_id ? 'food_slot' : ''),
        occasion_type: notes.occasion_type || '',
        occasion_note: (notes.occasion_note || '').slice(0, 250),
        recurring_frequency: notes.recurring_frequency || '',
        donation_for: (notes.donation_for || '').slice(0, 100),
        event_date: notes.event_date || '',
        donor_board_name: (notes.donor_board_name || '').slice(0, 100),
      },
    }),
  });
  const orderData = await response.json() as { id?: string; amount?: number; currency?: string; error?: { description?: string } };
  if (!response.ok) throw new AppError(orderData.error?.description || 'Failed to create payment order', 500);
  return { order_id: orderData.id, amount: orderData.amount, currency: orderData.currency, key_id: env.razorpayKeyId };
}

async function fetchRazorpayOrder(orderId: string): Promise<{ notes?: Record<string, string> }> {
  const response = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64'),
    },
  });
  const data = await response.json() as { notes?: Record<string, string>; error?: { description?: string } };
  if (!response.ok) throw new AppError(data.error?.description || 'Failed to fetch Razorpay order', 502);
  return data;
}

function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = crypto.createHmac('sha256', env.razorpayKeySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return expected === signature;
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  if (!env.razorpayWebhookSecret) return false;
  const expected = crypto
    .createHmac('sha256', env.razorpayWebhookSecret)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
}

async function isPaymentAlreadyProcessed(paymentId: string): Promise<boolean> {
  const existing = await DonationPayment.findOne({ payment_reference: paymentId }).lean();
  return Boolean(existing);
}

/** Fulfill donation or food-slot booking after Razorpay confirms payment. */
export async function fulfillRazorpayCapturedPayment(params: {
  paymentId: string;
  orderId: string;
  amountPaise: number;
  notes: Record<string, unknown>;
  donorIdFallback?: string;
}) {
  const { paymentId, orderId, amountPaise, notes, donorIdFallback } = params;

  if (await isPaymentAlreadyProcessed(paymentId)) {
    return { success: true, alreadyProcessed: true, payment_id: paymentId, order_id: orderId };
  }

  const donationId = noteValue(notes, 'donation_id');
  const donorId = noteValue(notes, 'donor_id') || donorIdFallback;
  const homeId = noteValue(notes, 'home_id');
  const trustId = noteValue(notes, 'trust_id');
  const date = noteValue(notes, 'date');
  const timeSlot = noteValue(notes, 'time_slot');
  const foodSlotId = noteValue(notes, 'food_slot_id') || undefined;
  const purpose = noteValue(notes, 'purpose');
  const occasionType = noteValue(notes, 'occasion_type') || undefined;
  const occasionNote = noteValue(notes, 'occasion_note') || undefined;
  const recurringFrequency = noteValue(notes, 'recurring_frequency') || undefined;
  const donationFor = noteValue(notes, 'donation_for') || undefined;
  const eventDate = noteValue(notes, 'event_date') || undefined;
  const donorBoardName = noteValue(notes, 'donor_board_name') || undefined;
  const amountRupees = amountPaise / 100;
  const payDate = new Date().toISOString().split('T')[0];

  if (donationId) {
    const payment = await DonationPayment.create({
      donation_id: donationId,
      amount: amountRupees,
      payment_date: payDate,
      payment_reference: paymentId,
      notes: `Razorpay Order: ${orderId}`,
    });
    const donation = await Donation.findByIdAndUpdate(
      donationId,
      { last_paid_date: payDate, status: 'ACTIVE' },
      { new: true },
    );
    if (donorId && donation) {
      const issued = await issueDonationPaymentReceipt({
        donorId,
        donation: donation.toObject() as typeof donation,
        payment: payment.toObject() as typeof payment,
      });
      const home = await Home.findById(donation.home_id).select('name').lean();
      const homeName = home?.name || 'the home';
      if (donation.need_id) {
        const need = await Need.findById(donation.need_id).select('description').lean();
        await notifyDonorNeedSponsored(donorId, {
          needDescription: need?.description || 'a need',
          homeName,
          amount: amountRupees,
          needId: donation.need_id,
          receiptReference: issued?.referenceKey,
        });
      } else {
        await deliverReceiptNotification(
          donorId,
          issued?.referenceKey || `donation-${donationId}-${paymentId}`,
          {
            description: `Donation to ${homeName}`,
            amount: amountRupees,
          },
        );
        await checkAndNotifyMilestones(donorId);
      }
      const sponsorshipType = String(donation.sponsorship_type || '').toUpperCase();
      if (sponsorshipType.includes('RECURRING') || sponsorshipType.includes('MONTHLY') || sponsorshipType.includes('YEARLY')) {
        await notifyDonorRecurringReceived(donorId, {
          amount: amountRupees,
          homeName,
          donationId,
        });
      }
    }
  }

  const isFoodSlot =
    purpose === 'food_slot' ||
    (homeId && trustId && date && timeSlot);

  if (isFoodSlot && donorId) {
    const result = await completeFoodSlotPayment(donorId, {
      food_slot_id: foodSlotId,
      home_id: homeId,
      trust_id: trustId,
      date,
      time_slot: timeSlot,
      amount: amountRupees,
      occasion_type: occasionType,
      occasion_note: occasionNote,
      recurring_frequency: recurringFrequency,
      donation_for: donationFor,
      event_date: eventDate,
      donor_board_name: donorBoardName,
    });
    return {
      payment_id: paymentId,
      order_id: orderId,
      ...result,
    };
  }

  if (donationId) {
    return { success: true, payment_id: paymentId, order_id: orderId };
  }

  return { success: true, ignored: true, payment_id: paymentId, order_id: orderId };
}

export async function verifyRazorpayPayment(
  data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    donation_id?: string;
    amount?: number;
    payment_date?: string;
    food_slot_id?: string;
    home_id?: string;
    trust_id?: string;
    date?: string;
    time_slot?: string;
    food_slot_amount?: number;
    occasion_type?: string;
    occasion_note?: string;
    recurring_frequency?: string;
    donation_for?: string;
    event_date?: string;
    donor_board_name?: string;
  },
  donorId?: string,
) {
  if (!verifyCheckoutSignature(data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature)) {
    throw new AppError('Payment verification failed. Signature mismatch.', 400);
  }

  const amountPaise = data.amount ?? Math.round((data.food_slot_amount ?? 0) * 100);

  return fulfillRazorpayCapturedPayment({
    paymentId: data.razorpay_payment_id,
    orderId: data.razorpay_order_id,
    amountPaise,
    notes: {
      donation_id: data.donation_id || '',
      donor_id: donorId || '',
      food_slot_id: data.food_slot_id || '',
      home_id: data.home_id || '',
      trust_id: data.trust_id || '',
      date: data.date || '',
      time_slot: data.time_slot || '',
      purpose: data.home_id ? 'food_slot' : data.donation_id ? 'donation' : '',
      occasion_type: data.occasion_type || '',
      occasion_note: data.occasion_note || '',
      recurring_frequency: data.recurring_frequency || '',
      donation_for: data.donation_for || '',
      event_date: data.event_date || '',
      donor_board_name: data.donor_board_name || '',
    },
    donorIdFallback: donorId,
  });
}

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: { entity?: Record<string, unknown> };
    order?: { entity?: Record<string, unknown> };
  };
}

export async function handleRazorpayWebhook(rawBody: Buffer) {
  const body = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhookPayload;
  const event = body.event || '';

  if (event !== 'payment.captured' && event !== 'order.paid') {
    return { received: true, event, handled: false };
  }

  const paymentEntity = body.payload?.payment?.entity;

  if (!paymentEntity) {
    return { received: true, event, handled: false, reason: 'no_payment_entity' };
  }

  const paymentId = noteValue(paymentEntity, 'id');
  const orderId = noteValue(paymentEntity, 'order_id');
  const amountPaise = Number(paymentEntity.amount ?? 0);
  const status = noteValue(paymentEntity, 'status');

  if (!paymentId || !orderId) {
    return { received: true, event, handled: false, reason: 'missing_ids' };
  }

  if (event === 'payment.captured' && status && status !== 'captured') {
    return { received: true, event, handled: false, reason: 'not_captured' };
  }

  let notes: Record<string, unknown> = (paymentEntity.notes as Record<string, unknown>) || {};
  const paymentNotesEmpty =
    !noteValue(notes, 'donor_id') &&
    !noteValue(notes, 'donation_id') &&
    !noteValue(notes, 'home_id');
  if (paymentNotesEmpty) {
    const order = await fetchRazorpayOrder(orderId);
    notes = order.notes || {};
  }

  const result = await fulfillRazorpayCapturedPayment({
    paymentId,
    orderId,
    amountPaise,
    notes,
  });

  return { received: true, event, handled: true, ...result };
}
