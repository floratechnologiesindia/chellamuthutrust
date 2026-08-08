import cron from 'node-cron';
import { Donation } from '../models/Operations.js';
import { FoodSlot } from '../models/Finance.js';
import { User } from '../models/User.js';
import { Home } from '../models/Core.js';
import {
  notifyDonorCalendarReminder,
  notifyDonorOpenSlotsDigest,
  notifyDonorAnniversary,
  notifyDonorTaxSummary,
  notifyDonorRecurringDueSoon,
  notifyDonorRecurringOverdue,
  computeDonorFyTotal,
  expireStaleBookingRequests,
} from './donorNotification.service.js';
import { runFoodRecurringReminders } from './foodRecurringPledge.service.js';

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

async function runRecurringReminders() {
  const today = new Date().toISOString().split('T')[0];
  const donations = await Donation.find({
    status: 'ACTIVE',
    next_due_date: { $exists: true, $ne: null },
  }).lean();

  for (const donation of donations) {
    if (!donation.donor_id || !donation.next_due_date) continue;
    const home = await Home.findById(donation.home_id).select('name').lean();
    const homeName = home?.name || 'the home';
    const days = daysBetween(today, donation.next_due_date);

    if (days >= 0 && days <= 7) {
      await notifyDonorRecurringDueSoon(donation.donor_id, {
        amount: donation.amount_pledged,
        homeName,
        dueDate: donation.next_due_date,
        donationId: donation._id,
      });
    } else if (days < 0) {
      await notifyDonorRecurringOverdue(donation.donor_id, {
        amount: donation.amount_pledged,
        homeName,
        dueDate: donation.next_due_date,
        donationId: donation._id,
      });
    }
  }
}

async function runCalendarReminders() {
  const today = new Date().toISOString().split('T')[0];
  const targetDate = addDays(today, 2);

  const slots = await FoodSlot.find({
    date: targetDate,
    donor_id: { $exists: true, $ne: null },
    status: { $in: ['BOOKED', 'PAID'] },
  }).lean();

  for (const slot of slots) {
    if (!slot.donor_id) continue;
    await notifyDonorCalendarReminder(slot.donor_id, slot as never, 2);
  }
}

async function runOpenSlotsDigest() {
  const today = new Date();
  const weekEnd = addDays(today.toISOString().split('T')[0], 6);
  const weekStart = today.toISOString().split('T')[0];
  const weekLabel = `${weekStart} to ${weekEnd}`;

  const homes = await Home.find({}).select('name').lean();
  const donors = await User.find({ role: 'donor', status: 'active' }).select('_id').lean();

  for (const home of homes) {
    const openCount = await FoodSlot.countDocuments({
      home_id: home._id,
      date: { $gte: weekStart, $lte: weekEnd },
      status: { $in: ['NEED', 'OPEN'] },
    });
    if (openCount < 1) continue;

    const homeDonorIds = await FoodSlot.distinct('donor_id', {
      home_id: home._id,
      donor_id: { $exists: true, $ne: null },
    });

    const recipientIds = homeDonorIds.length
      ? (homeDonorIds.filter(Boolean) as string[])
      : donors.map((d) => d._id);

    for (const donorId of recipientIds) {
      await notifyDonorOpenSlotsDigest(donorId, home.name, openCount, weekLabel);
    }
  }
}

async function runAnniversaryNotifications() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();

  const donors = await User.find({ role: 'donor', status: 'active' }).select('name created_at').lean();
  for (const donor of donors) {
    if (!donor.created_at) continue;
    const created = new Date(donor.created_at);
    if (created.getMonth() + 1 !== month || created.getDate() !== day) continue;
    const years = year - created.getFullYear();
    if (years < 1) continue;
    await notifyDonorAnniversary(donor._id, donor.name, years);
  }
}

async function runTaxSummaryNotifications() {
  const now = new Date();
  if (now.getMonth() !== 2 || now.getDate() !== 25) return; // March 25

  const fyEndYear = now.getFullYear();
  const fyStartYear = fyEndYear - 1;
  const fyLabel = `FY ${fyStartYear}–${String(fyEndYear).slice(2)}`;

  const donors = await User.find({ role: 'donor', status: 'active' }).select('_id').lean();
  for (const donor of donors) {
    const total = await computeDonorFyTotal(donor._id, fyStartYear);
    if (total <= 0) continue;
    await notifyDonorTaxSummary(donor._id, fyLabel, total);
  }
}

async function runDailyJobs() {
  try {
    await expireStaleBookingRequests();
    await runRecurringReminders();
    await runFoodRecurringReminders();
    const { processRecurringDonationSchedules } = await import('./recurringDonation.service.js');
    const { processFoodRecurringSchedules } = await import('./foodRecurringPledge.service.js');
    const { runOccasionReminders } = await import('./occasionReminder.service.js');
    await processRecurringDonationSchedules();
    await processFoodRecurringSchedules();
    await runOccasionReminders();
    await runCalendarReminders();
    await runAnniversaryNotifications();
    await runTaxSummaryNotifications();
  } catch (err) {
    console.error('Donor notification daily jobs failed:', err);
  }
}

async function runWeeklyJobs() {
  try {
    await runOpenSlotsDigest();
  } catch (err) {
    console.error('Donor notification weekly jobs failed:', err);
  }
}

export function startDonorNotificationCron() {
  cron.schedule('0 9 * * *', () => {
    void runDailyJobs();
  });

  cron.schedule('0 9 * * 1', () => {
    void runWeeklyJobs();
  });

  console.log('Donor notification cron jobs scheduled');
}
