import { FoodSlot, IFoodSlot } from '../models/Finance.js';
import { Donation } from '../models/Operations.js';
import { User } from '../models/User.js';
import { Home } from '../models/Core.js';
import { sendDonorEmail, sendWhatsApp } from './integrations.service.js';
import { notifyDonor, DONOR_NOTIFICATION_TYPES } from './donorNotification.service.js';
import { buildDetailFromSlot } from './foodSponsorshipAcknowledgement.service.js';

const TRUST_NAME = 'M.S. Chellamuthu Trust and Research Foundation';

function appBaseUrl(): string {
  return (process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function buildPaymentLink(params: { donationId?: string | null; donorPortal?: boolean }): string {
  const base = appBaseUrl();
  if (params.donationId) return `${base}/pay?donationId=${params.donationId}`;
  return `${base}/donor?tab=food`;
}

function paragraphsToHtml(text: string): string {
  return text
    .split('\n\n')
    .map((p) => `<p style="font-size:14px;line-height:1.8;margin:10px 0;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

export type OccasionReminderKind = 'birthday' | 'memorial' | 'general';

export function buildOccasionReminderMessage(params: {
  kind: OccasionReminderKind;
  donorName: string;
  honoreeName?: string;
  occasionLabel?: string;
  paymentLink?: string | null;
}): { subject: string; text: string; html: string } {
  const greeting = params.donorName.trim()
    ? `Dear Mr./Ms. ${params.donorName.trim()},`
    : 'Dear Donor,';
  const honoree = params.honoreeName?.trim() || 'your loved one';
  const occasion = params.occasionLabel?.trim() || 'this occasion';
  const linkBlock = params.paymentLink
    ? `\n\nIf you would like to make a booking or need any assistance, please use the payment link below or contact us.\n${params.paymentLink}`
    : '';

  let body: string;

  if (params.kind === 'birthday') {
    body = `${greeting}

Greetings from ${TRUST_NAME}.

Last year, you generously celebrated ${honoree}'s birthday by sponsoring a meal for our residents. Your thoughtful gesture brought joy and nourishment to many, and we remain sincerely grateful for your kindness.

As ${honoree}'s birthday is approaching once again, we would like to gently remind you that, if you wish, you can continue this meaningful tradition by sponsoring a meal this year as well.${linkBlock}

Thank you for your continued kindness and support.

With gratitude,
${TRUST_NAME}`;
  } else if (params.kind === 'memorial') {
    body = `${greeting}

Greetings from ${TRUST_NAME}.

Last year, you honoured the memory of ${honoree} by sponsoring a meal for our residents. Your generous support helped us serve those in need with dignity and compassion.

As the memorial day is approaching, we would like to gently remind you that you may continue this meaningful tribute by sponsoring a meal again this year, should you wish to do so.${linkBlock}

Thank you for your continued trust and generosity.

With gratitude,
${TRUST_NAME}`;
  } else {
    body = `${greeting}

Greetings from ${TRUST_NAME}.

We fondly remember your generous sponsorship on the occasion of ${occasion} last year. Your support made a meaningful difference in the lives of our residents.

As the same occasion is approaching this year, we would like to check if you would like to sponsor a meal once again. We would be honoured to have your continued support.${linkBlock}

Thank you for your kindness and generosity.

With gratitude,
${TRUST_NAME}`;
  }

  return {
    subject: `${params.kind === 'birthday' ? 'Birthday' : params.kind === 'memorial' ? 'Memorial Day' : 'Occasion'} Sponsorship Reminder — ${TRUST_NAME}`,
    text: body,
    html: paragraphsToHtml(body),
  };
}

function reminderKindFromOccasion(occasionType?: string | null): OccasionReminderKind {
  const v = String(occasionType || '').toLowerCase();
  if (v.includes('birthday') || v === 'birthday') return 'birthday';
  if (v.includes('memorial') || v.includes('ancestor') || v === 'ancestor_remembrance') return 'memorial';
  return 'general';
}

function occasionLabel(occasionType?: string | null, occasionNote?: string | null): string {
  if (occasionNote?.trim()) return occasionNote.trim();
  const v = String(occasionType || '').toLowerCase();
  if (v === 'birthday') return 'Birthday';
  if (v === 'ancestor_remembrance') return 'Memorial Day';
  if (v === 'festival') return 'Festival';
  if (v === 'special_day') return 'Special Occasion';
  return 'this occasion';
}

function isAnniversaryApproaching(isoDate: string, windowDays = 21): boolean {
  const today = new Date();
  const ref = new Date(`${isoDate}T12:00:00`);
  const thisYear = new Date(today.getFullYear(), ref.getMonth(), ref.getDate(), 12, 0, 0);
  const diffMs = thisYear.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return diffDays >= 0 && diffDays <= windowDays;
}

function lastYearIsoDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

export async function sendOccasionReminderForFoodSlot(slotId: string, options?: { force?: boolean }) {
  const slot = await FoodSlot.findById(slotId);
  if (!slot) return { sent: false, skipped: 'not_found' };
  if (!slot.donor_id) return { sent: false, skipped: 'no_donor' };

  const refDate = slot.event_date || slot.date;
  if (!isAnniversaryApproaching(refDate)) {
    return { sent: false, skipped: 'not_in_window' };
  }

  const yearKey = new Date().getFullYear();
  if (slot.occasion_reminder_sent_at?.startsWith(String(yearKey)) && !options?.force) {
    return { sent: false, skipped: 'already_sent' };
  }

  const donor = await User.findById(slot.donor_id).select('name email phone').lean();
  const home = await Home.findById(slot.home_id).select('name').lean();
  const kind = reminderKindFromOccasion(slot.occasion_type);
  const honoree = slot.sponsor_for || slot.donate_on_behalf_of || undefined;
  const paymentLink = buildPaymentLink({ donationId: slot.donation_id });

  const message = buildOccasionReminderMessage({
    kind,
    donorName: donor?.name || slot.donor_name || '',
    honoreeName: honoree,
    occasionLabel: occasionLabel(slot.occasion_type, slot.occasion_note),
    paymentLink,
  });

  let emailSent = false;
  let whatsappSent = false;
  if (donor?.email) {
    try {
      await sendDonorEmail(donor.email, message.subject, message.html, message.text);
      emailSent = true;
    } catch {
      emailSent = false;
    }
  }
  if (donor?.phone) {
    try {
      await sendWhatsApp(donor.phone, message.text);
      whatsappSent = true;
    } catch {
      whatsappSent = false;
    }
  }

  await notifyDonor({
    userId: slot.donor_id,
    type: DONOR_NOTIFICATION_TYPES.RECURRING_DUE_SOON,
    title: 'Occasion sponsorship reminder',
    message: `Would you like to sponsor a meal again for ${occasionLabel(slot.occasion_type, slot.occasion_note)} at ${home?.name || 'our project'}?`,
    dedupeKey: `occasion_reminder:${slot._id}:${yearKey}`,
  });

  slot.occasion_reminder_sent_at = new Date().toISOString();
  await slot.save();

  return { sent: emailSent || whatsappSent, emailSent, whatsappSent };
}

export async function runOccasionReminders() {
  const today = new Date();
  const year = today.getFullYear();
  const slots = await FoodSlot.find({
    donor_id: { $exists: true, $ne: null },
    status: 'BOOKED',
    payment_status: { $in: ['FULLY_PAID', 'PAID'] },
    occasion_type: { $exists: true, $ne: null },
  }).lean();

  let sent = 0;
  for (const slot of slots) {
    const refDate = slot.event_date || slot.date;
    if (!refDate) continue;
    const lastYear = lastYearIsoDate(refDate);
    const lastYearWindowStart = new Date(`${lastYear}T12:00:00`);
    lastYearWindowStart.setDate(lastYearWindowStart.getDate() - 14);
    const approxLastYearSponsorship =
      Math.abs(new Date(`${refDate}T12:00:00`).getTime() - lastYearWindowStart.getTime()) < 400 * 24 * 60 * 60 * 1000;

    if (!approxLastYearSponsorship && !isAnniversaryApproaching(refDate)) continue;
    if (slot.occasion_reminder_sent_at?.startsWith(String(year))) continue;

    const result = await sendOccasionReminderForFoodSlot(String(slot._id));
    if (result.sent) sent += 1;
  }

  const donations = await Donation.find({
    donor_id: { $exists: true },
    occasion_type: { $exists: true, $ne: null },
    status: { $in: ['ACTIVE', 'COMPLETED'] },
  }).lean();

  for (const donation of donations) {
    if (donation.occasion_reminder_sent_at?.startsWith(String(year))) continue;
    if (!donation.start_date || !isAnniversaryApproaching(donation.start_date)) continue;

    const donor = await User.findById(donation.donor_id).select('name email phone').lean();
    const kind = reminderKindFromOccasion(donation.occasion_type);
    const message = buildOccasionReminderMessage({
      kind,
      donorName: donor?.name || '',
      occasionLabel: occasionLabel(donation.occasion_type, donation.occasion_note),
      paymentLink: buildPaymentLink({ donationId: donation._id }),
    });

    if (donor?.email) {
      await sendDonorEmail(donor.email, message.subject, message.html, message.text);
    }
    if (donor?.phone) {
      await sendWhatsApp(donor.phone, message.text);
    }

    await Donation.updateOne(
      { _id: donation._id },
      { occasion_reminder_sent_at: new Date().toISOString() },
    );
    sent += 1;
  }

  return { sent };
}

export type { IFoodSlot };
