import { FoodSlot, IFoodSlot } from '../models/Finance.js';
import { Home } from '../models/Core.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Operations.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendDonorEmail, sendWhatsApp } from './integrations.service.js';
import { getSocialWorkerIdsForHome } from './projectAssignment.service.js';
import { formatInr, timeSlotLabel } from './donorNotification.service.js';
import { normalizePaymentStatus } from './foodSlotPaymentNormalize.js';

const TRUST_NAME = 'M.S. Chellamuthu Trust and Research Foundation';
export const ADMIN_FOOD_BOOKING_NOTIFY_TYPE = 'admin_food_booking';

function formatEventDate(date?: string): string {
  if (!date) return '';
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function paymentStatusLabel(slot: IFoodSlot): string {
  const payment = normalizePaymentStatus(slot.payment_status, slot.status);
  if (payment === 'FULLY_PAID') return 'Paid Fully';
  if (payment === 'PARTIALLY_PAID') return 'Partially Paid';
  return 'Fully Pending';
}

function formatSlotLine(slot: IFoodSlot): string {
  const date = formatEventDate(slot.date);
  const meal = timeSlotLabel(slot.time_slot);
  const amount = formatInr(Number(slot.amount) || 0);
  return `${date} — ${meal} — ${amount} (${paymentStatusLabel(slot)})`;
}

function buildStaffAdminBookingMessage(params: {
  workerName: string;
  adminName: string;
  homeName: string;
  donorName: string;
  slotLines: string[];
  totalAmount: number;
}): { subject: string; text: string; html: string; title: string; inAppMessage: string } {
  const greeting = params.workerName.trim() ? `Dear ${params.workerName.trim()},` : 'Dear Social Worker,';
  const slotBlock = params.slotLines.map((line) => `- ${line}`).join('\n');
  const slotCount = params.slotLines.length;
  const slotWord = slotCount === 1 ? 'slot' : 'slots';

  const text = `${greeting}

${params.adminName} has booked ${slotCount} food sponsorship ${slotWord} at ${params.homeName}.

Donor: ${params.donorName}

${slotBlock}

Total amount: ${formatInr(params.totalAmount)}

Please review the booking in the CRM and coordinate food distribution accordingly.

${TRUST_NAME}`;

  const html = text
    .split('\n\n')
    .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  const title = `New food sponsorship booked by ${params.adminName}`;
  const inAppMessage = `${params.adminName} booked ${slotCount} food sponsorship ${slotWord} for ${params.donorName} at ${params.homeName}. Total ${formatInr(params.totalAmount)}.`;

  return {
    subject: `Food sponsorship booked at ${params.homeName}`,
    text,
    html,
    title,
    inAppMessage,
  };
}

async function notifyStaffInApp(params: {
  userId: string;
  title: string;
  message: string;
  dedupeKey: string;
}): Promise<boolean> {
  const existing = await Notification.findOne({
    user_id: params.userId,
    dedupe_key: params.dedupeKey,
  }).lean();
  if (existing) return false;

  await Notification.create({
    user_id: params.userId,
    type: ADMIN_FOOD_BOOKING_NOTIFY_TYPE,
    title: params.title,
    message: params.message,
    dedupe_key: params.dedupeKey,
    is_read: false,
  });
  return true;
}

export async function notifySocialWorkersOfAdminFoodBooking(
  slotIds: string[],
  bookedByUserId: string,
): Promise<{
  notifiedHomes: number;
  workersNotified: number;
  inAppSent: number;
  emailSent: number;
  whatsappSent: number;
  slotIds: string[];
  skipped?: string;
}> {
  const booker = await User.findById(bookedByUserId).select('name role').lean();
  if (!booker || !['admin', 'super_admin'].includes(booker.role)) {
    return {
      notifiedHomes: 0,
      workersNotified: 0,
      inAppSent: 0,
      emailSent: 0,
      whatsappSent: 0,
      slotIds: [],
      skipped: 'not_admin_booking',
    };
  }

  const ids = [...new Set(slotIds.filter(Boolean))];
  if (!ids.length) {
    return {
      notifiedHomes: 0,
      workersNotified: 0,
      inAppSent: 0,
      emailSent: 0,
      whatsappSent: 0,
      slotIds: [],
      skipped: 'no_slots',
    };
  }

  const slots = await FoodSlot.find({ _id: { $in: ids } }).lean();
  if (!slots.length) throw new AppError('Food slot(s) not found', 404);

  const pending = slots.filter(
    (s) => s.status === 'BOOKED' && !s.staff_admin_booking_notify_sent_at,
  );
  if (!pending.length) {
    return {
      notifiedHomes: 0,
      workersNotified: 0,
      inAppSent: 0,
      emailSent: 0,
      whatsappSent: 0,
      slotIds: ids,
      skipped: 'already_notified',
    };
  }

  const homeIds = [...new Set(pending.map((s) => s.home_id))];
  const homes = await Home.find({ _id: { $in: homeIds } }).select('name').lean();
  const homeNames = new Map(homes.map((h) => [h._id, h.name]));

  const donorIds = [...new Set(pending.map((s) => s.donor_id).filter(Boolean))] as string[];
  const donorNameById = new Map<string, string>();
  if (donorIds.length) {
    const donors = await User.find({ _id: { $in: donorIds } }).select('name').lean();
    donors.forEach((d) => donorNameById.set(d._id, d.name || 'Donor'));
  }

  let notifiedHomes = 0;
  let workersNotified = 0;
  let inAppSent = 0;
  let emailSent = 0;
  let whatsappSent = 0;

  const slotsByHome = new Map<string, IFoodSlot[]>();
  for (const slot of pending as IFoodSlot[]) {
    const list = slotsByHome.get(slot.home_id) || [];
    list.push(slot);
    slotsByHome.set(slot.home_id, list);
  }

  for (const [homeId, homeSlots] of slotsByHome) {
    const workerIds = await getSocialWorkerIdsForHome(homeId);
    if (!workerIds.length) continue;

    const workers = await User.find({ _id: { $in: workerIds }, role: 'warden', status: 'active' })
      .select('name email phone')
      .lean();

    if (!workers.length) continue;

    const sortedSlotIds = homeSlots.map((s) => s._id).sort().join(',');
    const homeName = homeNames.get(homeId) || 'your project';
    const slotLines = homeSlots
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.time_slot.localeCompare(b.time_slot))
      .map(formatSlotLine);
    const totalAmount = homeSlots.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    const donorNames = [
      ...new Set(
        homeSlots.map((s) => s.donor_name?.trim() || (s.donor_id ? donorNameById.get(s.donor_id) : '') || 'Donor'),
      ),
    ];
    const donorName = donorNames.length === 1 ? donorNames[0]! : donorNames.join(', ');

    notifiedHomes += 1;

    for (const worker of workers) {
      workersNotified += 1;
      const { subject, text, html, title, inAppMessage } = buildStaffAdminBookingMessage({
        workerName: worker.name || 'Social Worker',
        adminName: booker.name || 'Admin',
        homeName,
        donorName,
        slotLines,
        totalAmount,
      });

      const dedupeKey = `admin_food_booking:${homeId}:${sortedSlotIds}:${worker._id}`;
      if (await notifyStaffInApp({ userId: worker._id, title, message: inAppMessage, dedupeKey })) {
        inAppSent += 1;
      }

      if (worker.email) {
        try {
          await sendDonorEmail(worker.email, subject, html, text);
          emailSent += 1;
        } catch (err) {
          console.error('[admin-food-notify] email failed:', worker._id, err);
        }
      }

      if (worker.phone) {
        try {
          await sendWhatsApp(worker.phone, text);
          whatsappSent += 1;
        } catch (err) {
          console.error('[admin-food-notify] whatsapp failed:', worker._id, err);
        }
      }
    }
  }

  const sentAt = new Date().toISOString();
  await FoodSlot.updateMany(
    { _id: { $in: pending.map((s) => s._id) } },
    { $set: { staff_admin_booking_notify_sent_at: sentAt } },
  );

  return {
    notifiedHomes,
    workersNotified,
    inAppSent,
    emailSent,
    whatsappSent,
    slotIds: pending.map((s) => s._id),
  };
}
