import { FoodSlot, IFoodSlot } from '../models/Finance.js';
import { Home } from '../models/Core.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendDonorEmail, sendWhatsApp } from './integrations.service.js';
import { formatInr, notifyDonor, timeSlotLabel, DONOR_NOTIFICATION_TYPES } from './donorNotification.service.js';

const TRUST_NAME = 'M.S. Chellamuthu Trust and Research Foundation';

function formatEventDate(date?: string): string {
  if (!date) return '';
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/** Turn stored purpose/reason into the clause used after "contribution of ₹X". */
export function sponsorshipDetailClause(reason: string): string {
  const trimmed = reason.trim().replace(/\.$/, '');
  if (!trimmed) return 'towards supporting our food sponsorship programme';

  if (/^towards providing /i.test(trimmed)) {
    return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  }
  return `towards ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
}

export function buildDetailFromSlot(slot: IFoodSlot, homeName: string): string {
  if (slot.reason?.trim()) {
    return sponsorshipDetailClause(slot.reason);
  }

  const meal =
    slot.time_slot === 'OUTSIDE_FOOD' && slot.meal_type
      ? slot.meal_type.toLowerCase()
      : timeSlotLabel(slot.time_slot).toLowerCase();
  const home = homeName || 'our project';
  const person = slot.donate_on_behalf_of?.trim();
  const occasion = slot.sponsor_for?.trim() || slot.occasion_type?.replace(/_/g, ' ') || 'your occasion';
  const eventDate = formatEventDate(slot.date);

  let clause = `towards providing ${meal} at ${home}`;
  if (person) {
    clause += ` on the occasion of ${person}'s ${occasion.toLowerCase()}`;
  } else {
    clause += ` on the occasion of ${occasion.toLowerCase()}`;
  }
  if (eventDate) clause += ` (${eventDate})`;
  return clause;
}

export function buildFoodSponsorshipAcknowledgementMessage(params: {
  donorName: string;
  totalAmount: number;
  detailClause: string;
}): { subject: string; text: string; html: string } {
  const greeting = params.donorName.trim() ? `Dear ${params.donorName.trim()},` : 'Dear Donor,';

  const text = `${greeting}

Greetings from ${TRUST_NAME}!

Thank you for registering your sponsorship with us.

We are grateful for your generous contribution of ${formatInr(params.totalAmount)} ${params.detailClause}.

Your kindness will help us serve those in need with dignity and care. We are honored to have you as a valued member of the Chellamuthu Trust family.

If you have any questions or would like to update your sponsorship details, please feel free to contact us.

Thank you once again for your trust and support.

With gratitude,
${TRUST_NAME}`;

  const html = text
    .split('\n\n')
    .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return {
    subject: 'Thank you for registering your food sponsorship',
    text,
    html,
  };
}

function combineDetailClauses(slots: IFoodSlot[], homeNames: Map<string, string>): string {
  const clauses = slots.map((slot) =>
    buildDetailFromSlot(slot, homeNames.get(slot.home_id) || 'our project'),
  );
  const unique = [...new Set(clauses)];
  if (unique.length === 1) return unique[0];
  return `towards your food sponsorships: ${unique.join('; ')}`;
}

export async function sendFoodSponsorshipAcknowledgement(
  slotIds: string[],
): Promise<{ sent: boolean; emailSent: boolean; whatsappSent: boolean; slotIds: string[] }> {
  const ids = [...new Set(slotIds.filter(Boolean))];
  if (!ids.length) {
    return { sent: false, emailSent: false, whatsappSent: false, slotIds: [] };
  }

  const slots = await FoodSlot.find({ _id: { $in: ids } }).lean();
  if (!slots.length) throw new AppError('Food slot(s) not found', 404);

  const pending = slots.filter((s) => !s.acknowledgement_sent_at && s.donor_id && s.status === 'BOOKED');
  if (!pending.length) {
    return { sent: false, emailSent: false, whatsappSent: false, slotIds: ids };
  }

  const donorIds = [...new Set(pending.map((s) => s.donor_id!).filter(Boolean))];
  if (donorIds.length !== 1) {
    throw new AppError('All slots must belong to the same donor for a combined acknowledgement', 400);
  }

  const donorId = donorIds[0]!;
  const donor = await User.findById(donorId).select('name email phone role status').lean();
  if (!donor || donor.role !== 'donor') {
    throw new AppError('Donor not found', 404);
  }

  const homeIds = [...new Set(pending.map((s) => s.home_id))];
  const homes = await Home.find({ _id: { $in: homeIds } }).select('name').lean();
  const homeNames = new Map(homes.map((h) => [h._id, h.name]));

  const totalAmount = pending.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const detailClause = combineDetailClauses(pending as IFoodSlot[], homeNames);
  const { subject, text, html } = buildFoodSponsorshipAcknowledgementMessage({
    donorName: donor.name || 'Donor',
    totalAmount: totalAmount || pending.reduce((sum, s) => sum + (Number(s.amount_paid) || 0), 0),
    detailClause,
  });

  let emailSent = false;
  let whatsappSent = false;

  if (donor.email) {
    try {
      await sendDonorEmail(donor.email, subject, html, text);
      emailSent = true;
    } catch (err) {
      console.error('[food-ack] email failed:', err);
    }
  }

  if (donor.phone) {
    try {
      await sendWhatsApp(donor.phone, text);
      whatsappSent = true;
    } catch (err) {
      console.error('[food-ack] whatsapp failed:', err);
    }
  }

  const sentAt = new Date().toISOString();
  await FoodSlot.updateMany(
    { _id: { $in: pending.map((s) => s._id) } },
    { $set: { acknowledgement_sent_at: sentAt } },
  );

  const slotLabel = pending.length === 1
    ? timeSlotLabel(pending[0]!.time_slot).toLowerCase()
    : `${pending.length} food sponsorships`;

  await notifyDonor({
    userId: donorId,
    type: DONOR_NOTIFICATION_TYPES.FOOD_SPONSORSHIP_ACKNOWLEDGEMENT,
    title: 'Sponsorship registered — thank you!',
    message: `Thank you for registering your ${slotLabel}. We are grateful for your support.`,
    dedupeKey: `food_ack:${pending.map((s) => s._id).sort().join(',')}`,
  });

  return {
    sent: emailSent || whatsappSent,
    emailSent,
    whatsappSent,
    slotIds: pending.map((s) => s._id),
  };
}
