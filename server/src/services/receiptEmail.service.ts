import { Receipt } from '../models/Operations.js';
import type { IReceipt } from '../models/Operations.js';
import { User } from '../models/User.js';
import { sendDonorEmail } from './integrations.service.js';
import { getDonorDisplayEmail, hasVerifiedDonorEmail } from '../utils/donorEmail.js';
import { generateReceiptHtml, generateReceiptEmailText } from '../utils/generateReceiptHtml.js';
import { env } from '../config/env.js';

async function loadDonorForEmail(donorId: string) {
  return User.findById(donorId).select('name email email_verified').lean();
}

export async function sendReceiptEmailIfEligible(receipt: IReceipt): Promise<boolean> {
  if (receipt.receipt_emailed_at) return true;

  const donor = await loadDonorForEmail(receipt.donor_id);
  if (!hasVerifiedDonorEmail(donor ?? undefined)) return false;

  const to = getDonorDisplayEmail(donor?.email);
  if (!to) return false;

  const invoice = receipt.invoice_data;
  const htmlData = {
    ...invoice,
    receiptNumber: receipt.receipt_number,
  };

  const subject = `Donation Receipt ${receipt.receipt_number} — MS Chellamuthu Trust`;
  const html = `
    <p>Dear ${donor?.name || invoice.donorName || 'Donor'},</p>
    <p>Thank you for your generous support. Please find your official donation receipt below.</p>
    ${generateReceiptHtml(htmlData)}
    <p style="font-size:12px;color:#666;margin-top:24px;">
      You can also view this receipt anytime under <strong>My Donations</strong> on the donor portal.
    </p>
  `;
  const text = generateReceiptEmailText(htmlData);

  try {
    await sendDonorEmail(to, subject, html, text);
    await Receipt.findByIdAndUpdate(receipt._id, { receipt_emailed_at: new Date() });
    return true;
  } catch (err) {
    if (env.nodeEnv === 'development') {
      console.warn(`Receipt email failed for ${receipt.receipt_number}:`, err);
    } else {
      console.error(`Receipt email failed for ${receipt.receipt_number}:`, err);
    }
    return false;
  }
}

export async function sendReceiptEmailById(donorId: string, receiptId: string): Promise<boolean> {
  const receipt = await Receipt.findOne({ _id: receiptId, donor_id: donorId }).lean();
  if (!receipt) return false;
  return sendReceiptEmailIfEligible(receipt as IReceipt);
}

/** Send any receipts that were issued before the donor verified their email. */
export async function emailUnsentReceiptsForDonor(donorId: string): Promise<number> {
  const donor = await loadDonorForEmail(donorId);
  if (!hasVerifiedDonorEmail(donor ?? undefined)) return 0;

  const receipts = await Receipt.find({
    donor_id: donorId,
    receipt_emailed_at: { $exists: false },
  }).sort({ issued_at: 1 }).lean();

  let sent = 0;
  for (const receipt of receipts) {
    if (await sendReceiptEmailIfEligible(receipt as IReceipt)) {
      sent += 1;
    }
  }
  return sent;
}
