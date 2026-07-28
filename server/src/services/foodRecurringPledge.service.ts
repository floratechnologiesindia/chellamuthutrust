import { FoodRecurringPledge, type FoodRecurringFrequency, type IFoodRecurringPledge } from '../models/Finance.js';
import { Home } from '../models/Core.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Operations.js';
import { AppError } from '../middleware/errorHandler.js';
import { toApiDoc } from '../utils/serializers.js';
import { getSocialWorkerIdsForHome } from './projectAssignment.service.js';
import {
  formatInr,
  notifyDonor,
  DONOR_NOTIFICATION_TYPES,
  timeSlotLabel,
} from './donorNotification.service.js';

export function dayOfMonthFromIsoDate(isoDate: string): number {
  return new Date(`${isoDate}T12:00:00`).getDate();
}

/**
 * Advance by one month (monthly) or one year (annual), keeping the same
 * day of the month. If the target month is shorter (e.g. the 31st in a
 * 30-day month, or the 29th–31st in February), it clamps to that month's
 * last day.
 */
export function nextSameDayOfMonthDate(isoDate: string, frequency: FoodRecurringFrequency): string {
  const d = new Date(`${isoDate}T12:00:00`);
  const targetDay = d.getDate();

  let targetYear = d.getFullYear();
  let targetMonth = d.getMonth();
  if (frequency === 'annual') {
    targetYear += 1;
  } else {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(targetDay, lastDayOfTargetMonth);
  const result = new Date(targetYear, targetMonth, day, 12, 0, 0);
  return result.toISOString().slice(0, 10);
}

async function getStaffUserIdsForHome(homeId: string, trustId: string): Promise<string[]> {
  const ids = new Set<string>(await getSocialWorkerIdsForHome(homeId));
  const admins = await User.find({
    role: { $in: ['admin', 'super_admin'] },
    $or: [{ trust_id: trustId }, { role: 'super_admin' }],
  }).select('_id');
  admins.forEach((u) => ids.add(u._id));
  return [...ids];
}

export async function notifyStaffFoodRecurring(
  homeId: string,
  trustId: string,
  title: string,
  message: string,
  type = 'food_recurring_pledge',
) {
  const userIds = await getStaffUserIdsForHome(homeId, trustId);
  if (!userIds.length) return;
  await Notification.insertMany(
    userIds.map((user_id) => ({
      user_id,
      type,
      title,
      message,
      is_read: false,
    })),
  );
}

export interface CreateFoodRecurringPledgeInput {
  donorId: string;
  homeId: string;
  trustId: string;
  timeSlot: string;
  amount: number;
  frequency: FoodRecurringFrequency;
  startDate: string;
  firstFoodSlotId?: string;
  occasionType?: string;
  occasionNote?: string;
  donationFor?: string;
  eventDate?: string;
  donorBoardName?: string;
}

export async function createFoodRecurringPledge(input: CreateFoodRecurringPledgeInput) {
  const donor = await User.findById(input.donorId).select('name').lean();
  const home = await Home.findById(input.homeId).select('name').lean();
  const homeName = home?.name || 'the project';
  const meal = timeSlotLabel(input.timeSlot);
  const nextDue = nextSameDayOfMonthDate(input.startDate, input.frequency);
  const dayOfMonth = dayOfMonthFromIsoDate(input.startDate);

  const pledge = await FoodRecurringPledge.create({
    donor_id: input.donorId,
    donor_name: donor?.name,
    home_id: input.homeId,
    trust_id: input.trustId,
    time_slot: input.timeSlot,
    amount: input.amount,
    frequency: input.frequency,
    day_of_month: dayOfMonth,
    start_date: input.startDate,
    next_due_date: nextDue,
    last_paid_date: input.startDate,
    status: 'ACTIVE',
    first_food_slot_id: input.firstFoodSlotId,
    occasion_type: input.occasionType,
    occasion_note: input.occasionNote,
    donation_for: input.donationFor,
    event_date: input.eventDate,
    donor_board_name: input.donorBoardName,
  });

  const freqLabel = input.frequency === 'annual' ? 'annual' : 'monthly';

  await notifyDonor({
    userId: input.donorId,
    type: DONOR_NOTIFICATION_TYPES.RECURRING_RECEIVED,
    title: 'Food recurring pledge set',
    message: `Your first ${meal.toLowerCase()} payment for ${homeName} is confirmed. A ${freqLabel} recurring pledge is active — next due ${nextDue}.`,
    dedupeKey: `food_recurring_created:${pledge._id}`,
  });

  await notifyStaffFoodRecurring(
    input.homeId,
    input.trustId,
    'New food recurring pledge',
    `${donor?.name || 'A donor'} paid for ${meal.toLowerCase()} at ${homeName} and pledged ${freqLabel} sponsorship (₹${input.amount}). Next due: ${nextDue}.`,
  );

  return pledge;
}

export async function listFoodRecurringPledges(filters: {
  donorId?: string;
  homeId?: string;
  trustId?: string;
  status?: string;
  homeIds?: string[];
}) {
  const query: Record<string, unknown> = {};
  if (filters.donorId) query.donor_id = filters.donorId;
  if (filters.homeId) query.home_id = filters.homeId;
  if (filters.trustId) query.trust_id = filters.trustId;
  if (filters.status) query.status = filters.status;
  if (filters.homeIds?.length) query.home_id = { $in: filters.homeIds };

  const rows = await FoodRecurringPledge.find(query).sort({ next_due_date: 1 }).lean();
  const homeIds = [...new Set(rows.map((r) => r.home_id))];
  const homes = await Home.find({ _id: { $in: homeIds } }).select('name city').lean();
  const homeMap = Object.fromEntries(homes.map((h) => [h._id, h]));

  return rows.map((row) => {
    const home = homeMap[row.home_id];
    return {
      ...toApiDoc(row),
      homes: home ? { id: home._id, name: home.name, city: home.city } : null,
    };
  });
}

export async function updateFoodRecurringPledgeStatus(
  pledgeId: string,
  donorId: string,
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED',
  options?: { isStaff?: boolean },
) {
  const pledge = await FoodRecurringPledge.findById(pledgeId);
  if (!pledge) throw new AppError('Pledge not found', 404);
  if (!options?.isStaff && pledge.donor_id !== donorId) {
    throw new AppError('Not authorized for this pledge', 403);
  }

  pledge.status = status;
  await pledge.save();

  const home = await Home.findById(pledge.home_id).select('name').lean();
  const homeName = home?.name || 'the project';

  await notifyDonor({
    userId: pledge.donor_id,
    type: DONOR_NOTIFICATION_TYPES.RECURRING_ENDED,
    title: status === 'ACTIVE' ? 'Food recurring pledge resumed' : `Food recurring pledge ${status.toLowerCase()}`,
    message:
      status === 'ACTIVE'
        ? `Your ${pledge.frequency} food sponsorship for ${homeName} is active again. Next due ${pledge.next_due_date}.`
        : `Your ${pledge.frequency} food sponsorship for ${homeName} has been marked ${status.toLowerCase()}.`,
    dedupeKey: `food_recurring_status:${pledge._id}:${status}:${new Date().toISOString().slice(0, 10)}`,
  });

  await notifyStaffFoodRecurring(
    pledge.home_id,
    pledge.trust_id,
    'Food recurring pledge updated',
    `${pledge.donor_name || 'A donor'}'s ${pledge.frequency} food pledge for ${homeName} is now ${status.toLowerCase()}.`,
  );

  return toApiDoc(pledge);
}

export async function runFoodRecurringReminders() {
  const today = new Date().toISOString().split('T')[0];
  const pledges = await FoodRecurringPledge.find({
    status: 'ACTIVE',
    next_due_date: { $exists: true, $ne: null },
  }).lean();

  for (const pledge of pledges) {
    if (!pledge.next_due_date) continue;
    const home = await Home.findById(pledge.home_id).select('name').lean();
    const homeName = home?.name || 'the project';
    const meal = timeSlotLabel(pledge.time_slot);
    const due = pledge.next_due_date;
    const ms = new Date(`${due}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime();
    const days = Math.round(ms / (24 * 60 * 60 * 1000));
    const freqLabel = pledge.frequency === 'annual' ? 'annual' : 'monthly';

    if (days >= 0 && days <= 7) {
      await notifyDonor({
        userId: pledge.donor_id,
        type: DONOR_NOTIFICATION_TYPES.RECURRING_DUE_SOON,
        title: 'Food recurring donation due soon',
        message: `Your ${freqLabel} ${meal.toLowerCase()} sponsorship for ${homeName} is due on ${due} (${formatInr(pledge.amount)}).`,
        dedupeKey: `food_recurring_due_soon:${pledge._id}:${due}`,
      });
      await notifyStaffFoodRecurring(
        pledge.home_id,
        pledge.trust_id,
        'Food recurring due soon',
        `${pledge.donor_name || 'A donor'}'s ${freqLabel} ${meal.toLowerCase()} pledge for ${homeName} is due on ${due} (₹${pledge.amount}).`,
        'food_recurring_due_soon',
      );
    } else if (days < 0) {
      await notifyDonor({
        userId: pledge.donor_id,
        type: DONOR_NOTIFICATION_TYPES.RECURRING_OVERDUE,
        title: 'Food recurring donation overdue',
        message: `Your ${freqLabel} ${meal.toLowerCase()} sponsorship for ${homeName} was due on ${due}. Please complete payment when ready.`,
        dedupeKey: `food_recurring_overdue:${pledge._id}:${due}`,
      });
      await notifyStaffFoodRecurring(
        pledge.home_id,
        pledge.trust_id,
        'Food recurring overdue',
        `${pledge.donor_name || 'A donor'}'s ${freqLabel} ${meal.toLowerCase()} pledge for ${homeName} was due on ${due} (₹${pledge.amount}).`,
        'food_recurring_overdue',
      );
    }
  }
}

export function parseFoodRecurringFrequency(value: unknown): FoodRecurringFrequency | null {
  const v = String(value || '').toLowerCase().trim();
  if (v === 'monthly' || v === 'annual') return v;
  return null;
}

export type { IFoodRecurringPledge };
