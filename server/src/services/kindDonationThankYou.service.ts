import { KindDonation, IKindDonation } from '../models/Finance.js';
import { Home } from '../models/Core.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendDonorEmail, sendWhatsApp } from './integrations.service.js';
import { generateReceiptHtml } from '../utils/generateReceiptHtml.js';
import {
  generateKindDonationThanksLetterHtml,
  generateKindDonationThanksLetterText,
} from '../utils/generateKindDonationThanksLetterHtml.js';
import { getDonorDisplayEmail } from '../utils/donorEmail.js';
import { notifyDonor, DONOR_NOTIFICATION_TYPES } from './donorNotification.service.js';

const TRUST_NAME = 'M.S. Chellamuthu Trust and Research Foundation';

function buildKindDonationDescription(kind: IKindDonation): string {
  const parts = [kind.item_type];
  if (kind.item_description) parts.push(kind.item_description);
  if (kind.quantity) parts.push(`Qty: ${kind.quantity}`);
  return parts.join(' — ');
}

function buildKindDonationReceiptHtml(kind: IKindDonation, homeName: string, donorName: string) {
  const receiptNumber = `KD-${kind._id.slice(0, 8).toUpperCase()}`;
  return generateReceiptHtml({
    receiptNumber,
    date: kind.received_date,
    donorName,
    donorAddress: kind.donor_address,
    donorPhone: kind.donor_phone,
    donorEmail: kind.donor_email,
    panNumber: kind.donor_pan,
    amount: Number(kind.estimated_value || 0),
    description: buildKindDonationDescription(kind),
    homeName,
    donationType: 'kind_donation',
    paymentMode: 'In-Kind',
  });
}

export async function getKindDonationThankYouDocuments(kindDonationId: string) {
  const kind = await KindDonation.findById(kindDonationId).lean();
  if (!kind) throw new AppError('Kind donation not found', 404);

  const home = await Home.findById(kind.home_id).select('name').lean();
  const donorName =
    kind.donor_name ||
    (kind.donor_id ? (await User.findById(kind.donor_id).select('name').lean())?.name : null) ||
    'Donor';

  return {
    kindDonationId: kind._id,
    thankYouHtml: generateKindDonationThanksLetterHtml({ donorName }),
    thankYouText: generateKindDonationThanksLetterText({ donorName }),
    receiptHtml: buildKindDonationReceiptHtml(kind as IKindDonation, home?.name || 'our project', donorName),
    sentAt: kind.thank_you_sent_at || null,
  };
}

export async function deliverKindDonationThankYou(
  kindDonationId: string,
  options?: { force?: boolean },
): Promise<{ sent: boolean; skipped?: string; emailSent: boolean; whatsappSent: boolean }> {
  const kind = await KindDonation.findById(kindDonationId);
  if (!kind) throw new AppError('Kind donation not found', 404);

  const status = String(kind.status || '').toUpperCase();
  if (!['RECEIVED', 'VERIFIED'].includes(status)) {
    throw new AppError('Thank-you letter is available after the donation is received', 400);
  }

  if (kind.thank_you_sent_at && !options?.force) {
    return { sent: false, skipped: 'already_sent', emailSent: false, whatsappSent: false };
  }

  const home = await Home.findById(kind.home_id).select('name').lean();
  const profile = kind.donor_id
    ? await User.findById(kind.donor_id).select('name email phone').lean()
    : null;

  const donorName = kind.donor_name || profile?.name || 'Donor';
  const donorEmail = kind.donor_email || getDonorDisplayEmail(profile?.email);
  const donorPhone = kind.donor_phone || profile?.phone;

  const docs = await getKindDonationThankYouDocuments(kindDonationId);
  const subject = `Thank You for Your In-Kind Donation — ${TRUST_NAME}`;

  let emailSent = false;
  let whatsappSent = false;

  if (donorEmail) {
    try {
      await sendDonorEmail(
        donorEmail,
        subject,
        `${docs.thankYouHtml}<hr/><h3>Donation Receipt</h3>${docs.receiptHtml}`,
        docs.thankYouText,
      );
      emailSent = true;
    } catch {
      emailSent = false;
    }
  }

  if (donorPhone) {
    try {
      await sendWhatsApp(donorPhone, `${docs.thankYouText}\n\n— ${TRUST_NAME}`);
      whatsappSent = true;
    } catch {
      whatsappSent = false;
    }
  }

  if (kind.donor_id) {
    await notifyDonor({
      userId: kind.donor_id,
      type: DONOR_NOTIFICATION_TYPES.RECEIPT_READY,
      title: 'Thank you for your in-kind donation',
      message: `Your thank-you letter and receipt for ${buildKindDonationDescription(kind)} are ready.`,
      dedupeKey: `kind_thankyou:${kind._id}`,
    });
  }

  kind.thank_you_sent_at = new Date().toISOString();
  kind.receipt_sent_at = kind.receipt_sent_at || kind.thank_you_sent_at;
  await kind.save();

  return { sent: emailSent || whatsappSent || Boolean(kind.donor_id), emailSent, whatsappSent };
}
