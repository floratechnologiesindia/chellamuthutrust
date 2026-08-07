import { FoodSlot, IFoodSlot } from '../models/Finance.js';
import { Home } from '../models/Core.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { issueFoodSlotReceipt } from './receipt.service.js';
import { sendDonorEmail, sendWhatsApp } from './integrations.service.js';
import { generateReceiptHtml, generateReceiptEmailText } from '../utils/generateReceiptHtml.js';
import { generateThanksLetterHtml } from '../utils/generateThanksLetterHtml.js';
import { generateThanksLetterText } from '../utils/generateThanksLetterText.js';
import { Receipt } from '../models/Operations.js';
import { notifyDonorReceiptReady, timeSlotLabel } from './donorNotification.service.js';
import { normalizePaymentStatus } from './foodSlotPaymentNormalize.js';
import { getDonorDisplayEmail } from '../utils/donorEmail.js';

const TIME_SLOT_LABELS: Record<string, string> = {
  MORNING: 'Breakfast',
  AFTERNOON: 'Lunch',
  EVENING: 'Dinner',
  REFRESHMENTS: 'Refreshments',
  OUTSIDE_FOOD: 'Outside Food',
};

function slotLabel(slot: IFoodSlot): string {
  const base = TIME_SLOT_LABELS[slot.time_slot] || timeSlotLabel(slot.time_slot);
  if (slot.time_slot === 'OUTSIDE_FOOD' && slot.meal_type) {
    return `${base} (${slot.meal_type})`;
  }
  return base;
}

function normalizeMode(mode?: string | null): string {
  const value = String(mode ?? '').trim();
  if (!value) return 'Online';
  if (value.toLowerCase() === 'online') return 'Online';
  return value;
}

export function isFoodReceiptThankYouEligible(slot: Pick<IFoodSlot, 'status' | 'payment_status' | 'payment_mode' | 'cheque_status' | 'donor_id'>): boolean {
  if (!slot.donor_id) return false;
  if (String(slot.status ?? '').toUpperCase() !== 'BOOKED') return false;

  const payment = normalizePaymentStatus(slot.payment_status, slot.status);
  if (payment !== 'FULLY_PAID') return false;

  const mode = String(slot.payment_mode ?? '').toLowerCase();
  if (mode === 'cheque') {
    return String(slot.cheque_status ?? '').toUpperCase() === 'REALIZED';
  }

  return true;
}

function buildDescription(slot: IFoodSlot, homeName: string): string {
  const meal = slotLabel(slot).toLowerCase();
  if (slot.reason?.trim()) return slot.reason.trim();
  return `${meal} sponsorship at ${homeName} on ${slot.date}`;
}

export async function getFoodReceiptThankYouDocuments(slotId: string) {
  const slot = await FoodSlot.findById(slotId).lean();
  if (!slot) throw new AppError('Food slot not found', 404);
  if (!slot.donor_id) throw new AppError('No donor on this booking', 400);
  if (!isFoodReceiptThankYouEligible(slot as IFoodSlot)) {
    throw new AppError('Receipt and thank-you letter are available only after full payment is confirmed', 400);
  }

  const amountPaid = Number(slot.amount_paid ?? slot.amount ?? 0);
  const issued = await issueFoodSlotReceipt({
    donorId: slot.donor_id,
    slot: slot as IFoodSlot,
    amountPaid,
  });
  if (!issued?.receipt) throw new AppError('Could not prepare receipt', 500);

  const home = await Home.findById(slot.home_id).select('name').lean();
  const donor = await User.findById(slot.donor_id).select('name').lean();
  const homeName = home?.name || 'our project';
  const description = buildDescription(slot as IFoodSlot, homeName);

  const thanksData = {
    donorName: donor?.name || slot.donor_name || 'Donor',
    amount: amountPaid,
    paymentMode: normalizeMode(slot.payment_mode),
    paymentDate: slot.updated_at?.toISOString?.()?.slice(0, 10) || slot.date,
    description,
    homeName,
  };

  const invoice = {
    ...issued.receipt.invoice_data,
    receiptNumber: issued.receipt.receipt_number,
  };

  return {
    slotId: slot._id,
    referenceKey: issued.referenceKey,
    receiptNumber: issued.receipt.receipt_number,
    invoice,
    thankYouHtml: generateThanksLetterHtml(thanksData),
    thankYouText: generateThanksLetterText(thanksData),
    receiptHtml: generateReceiptHtml(invoice),
    sentAt: slot.receipt_thankyou_sent_at || null,
  };
}

export async function deliverFoodReceiptThankYou(
  slotId: string,
  options?: { force?: boolean },
): Promise<{
  sent: boolean;
  skipped?: string;
  emailSent: boolean;
  whatsappSent: boolean;
  referenceKey?: string;
  receiptNumber?: string;
}> {
  const slot = await FoodSlot.findById(slotId);
  if (!slot) throw new AppError('Food slot not found', 404);

  if (!isFoodReceiptThankYouEligible(slot)) {
    return { sent: false, skipped: 'not_eligible', emailSent: false, whatsappSent: false };
  }

  if (slot.receipt_thankyou_sent_at && !options?.force) {
    return { sent: false, skipped: 'already_sent', emailSent: false, whatsappSent: false };
  }

  const donorId = slot.donor_id!;
  const amountPaid = Number(slot.amount_paid ?? slot.amount ?? 0);
  const issued = await issueFoodSlotReceipt({ donorId, slot, amountPaid });
  if (!issued?.receipt) {
    return { sent: false, skipped: 'receipt_not_issued', emailSent: false, whatsappSent: false };
  }

  const [donor, home] = await Promise.all([
    User.findById(donorId).select('name email phone').lean(),
    Home.findById(slot.home_id).select('name').lean(),
  ]);
  if (!donor) throw new AppError('Donor not found', 404);

  const homeName = home?.name || 'our project';
  const meal = slotLabel(slot);
  const description = buildDescription(slot, homeName);
  const thanksData = {
    donorName: donor.name || slot.donor_name || 'Donor',
    amount: amountPaid,
    paymentMode: normalizeMode(slot.payment_mode),
    paymentDate: new Date().toISOString().slice(0, 10),
    description,
    homeName,
  };

  const invoice = {
    ...issued.receipt.invoice_data,
    receiptNumber: issued.receipt.receipt_number,
  };
  const thanksHtml = generateThanksLetterHtml(thanksData);
  const thanksText = generateThanksLetterText(thanksData);
  const receiptHtml = generateReceiptHtml(invoice);
  const receiptText = generateReceiptEmailText(invoice);

  let emailSent = false;
  let whatsappSent = false;
  const donorEmail = getDonorDisplayEmail(donor.email);

  if (donorEmail && !donorEmail.endsWith('@walkin.local')) {
    try {
      const subject = `Donation Receipt ${issued.receipt.receipt_number} & Thank You — MS Chellamuthu Trust`;
      const html = `
        <p>Dear ${thanksData.donorName},</p>
        <p>Thank you for your generous food sponsorship. Please find your thank-you letter and official receipt below.</p>
        ${thanksHtml}
        <hr style="margin: 32px 0; border: none; border-top: 1px solid #ddd;" />
        ${receiptHtml}
      `;
      const text = `${thanksText}\n\n--- RECEIPT ---\n\n${receiptText}`;
      await sendDonorEmail(donorEmail, subject, html, text);
      emailSent = true;
    } catch (err) {
      console.error('[food-receipt-thankyou] email failed:', err);
    }
  }

  if (donor.phone) {
    try {
      const whatsappMessage = `${thanksText}\n\nReceipt No.: ${issued.receipt.receipt_number}\nYou can also view your receipt in the donor portal under My Donations.`;
      await sendWhatsApp(donor.phone, whatsappMessage);
      whatsappSent = true;
    } catch (err) {
      console.error('[food-receipt-thankyou] whatsapp failed:', err);
    }
  }

  await notifyDonorReceiptReady(donorId, {
    description: `${meal} sponsorship · ${homeName} · ${slot.date}`,
    amount: amountPaid,
    reference: issued.referenceKey,
  }, { emailed: emailSent });

  if (emailSent) {
    await Receipt.findByIdAndUpdate(issued.receipt._id, { receipt_emailed_at: new Date() });
  }

  slot.receipt_thankyou_sent_at = new Date().toISOString();
  await slot.save();

  return {
    sent: emailSent || whatsappSent,
    emailSent,
    whatsappSent,
    referenceKey: issued.referenceKey,
    receiptNumber: issued.receipt.receipt_number,
  };
}

export async function deliverFoodReceiptThankYouBatch(
  slotIds: string[],
  options?: { force?: boolean },
) {
  const ids = [...new Set(slotIds.filter(Boolean))];
  const results = [];
  for (const slotId of ids) {
    try {
      results.push({ slotId, ...(await deliverFoodReceiptThankYou(slotId, options)) });
    } catch (err) {
      results.push({
        slotId,
        sent: false,
        emailSent: false,
        whatsappSent: false,
        error: err instanceof Error ? err.message : 'Failed',
      });
    }
  }
  return { results, count: results.filter((r) => r.sent).length };
}
