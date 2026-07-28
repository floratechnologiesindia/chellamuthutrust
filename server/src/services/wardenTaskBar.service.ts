import { FoodSlot, KindDonation } from '../models/Finance.js';
import { Need } from '../models/Operations.js';
import { Resident, Home } from '../models/Core.js';
import { HomeEvent, CaseStudy } from '../models/HomeContent.js';
import { normalizePaymentStatus } from './foodSlotPaymentNormalize.js';

export type DerivedTaskItem = {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  href: string;
  due_date?: string;
};

function addDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function getDerivedTaskBar(homeId: string): Promise<DerivedTaskItem[]> {
  const today = new Date().toISOString().slice(0, 10);
  const in7 = addDaysIso(7);
  const in30 = addDaysIso(30);

  const [todaySlots, upcomingSlots, pendingPaySlots, needsPhotos, openNeeds, residents, home, events, stories] =
    await Promise.all([
      FoodSlot.find({
        home_id: homeId,
        date: today,
        status: { $in: ['BOOKED', 'PAID'] },
      }).lean(),
      FoodSlot.find({
        home_id: homeId,
        date: { $gt: today, $lte: in30 },
        status: { $in: ['BOOKED', 'PAID'] },
      })
        .sort({ date: 1 })
        .lean(),
      FoodSlot.find({
        home_id: homeId,
        date: { $gte: today },
        status: { $in: ['BOOKED', 'PAID'] },
      }).lean(),
      FoodSlot.find({
        home_id: homeId,
        date: { $lt: today, $gte: addDaysIso(-14) },
        status: { $in: ['BOOKED', 'PAID'] },
        $or: [{ completion_photos: { $exists: false } }, { completion_photos: { $size: 0 } }],
      }).lean(),
      Need.find({ home_id: homeId, status: { $in: ['OPEN', 'PARTIAL'] } }).lean(),
      Resident.find({ home_id: homeId, status: 'active' }).lean(),
      Home.findById(homeId).lean(),
      HomeEvent.find({ home_id: homeId, status: 'DRAFT' }).lean().catch(() => []),
      CaseStudy.find({ home_id: homeId, status: 'DRAFT' }).lean().catch(() => []),
    ]);

  const items: DerivedTaskItem[] = [];

  if (todaySlots.length) {
    items.push({
      id: `food-today`,
      category: 'food',
      title: `Today's food sponsorships (${todaySlots.length})`,
      description: todaySlots
        .map((s) => `${s.time_slot} — ${s.donor_name || 'Donor'}`)
        .slice(0, 4)
        .join('; '),
      priority: 'high',
      href: '/warden/food?tab=upcoming',
      due_date: today,
    });
  }

  const next7 = upcomingSlots.filter((s) => s.date <= in7);
  if (next7.length) {
    items.push({
      id: `food-upcoming-7`,
      category: 'food',
      title: `Upcoming sponsorships next 7 days (${next7.length})`,
      description: `Next meal on ${next7[0].date}`,
      priority: 'medium',
      href: '/warden/food?tab=upcoming',
      due_date: next7[0].date,
    });
  } else if (upcomingSlots.length) {
    items.push({
      id: `food-upcoming-30`,
      category: 'food',
      title: `Upcoming sponsorships next 30 days (${upcomingSlots.length})`,
      description: `Next meal on ${upcomingSlots[0].date}`,
      priority: 'low',
      href: '/warden/food?tab=upcoming',
      due_date: upcomingSlots[0].date,
    });
  }

  const pendingPay = pendingPaySlots.filter((s) => {
    const p = normalizePaymentStatus(s.payment_status, s.status);
    return p === 'FULLY_PENDING' || p === 'PARTIALLY_PAID' || !p;
  });
  if (pendingPay.length) {
    items.push({
      id: `food-pending-pay`,
      category: 'payment',
      title: `Pending payment follow-ups (${pendingPay.length})`,
      description: 'Follow up with donors who have unpaid or partially paid bookings',
      priority: 'high',
      href: '/warden/food?tab=upcoming',
    });
  }

  if (needsPhotos.length) {
    items.push({
      id: `food-photos`,
      category: 'photos',
      title: `Event photographs pending upload (${needsPhotos.length})`,
      description: 'Completed meals in the last 14 days without completion photos',
      priority: 'medium',
      href: '/warden/food?tab=completed',
    });
  }

  if (openNeeds.length) {
    items.push({
      id: `needs-update`,
      category: 'requirements',
      title: `Project requirements awaiting update (${openNeeds.length})`,
      description: 'Open or partially sponsored requirements need attention',
      priority: 'medium',
      href: '/warden/needs',
    });
  }

  const incompleteResidents = residents.filter(
    (r) => !r.photo_url || !r.admission_date || !(r.special_needs || r.age),
  );
  if (incompleteResidents.length) {
    items.push({
      id: `residents-incomplete`,
      category: 'residents',
      title: `Resident profiles pending completion (${incompleteResidents.length})`,
      description: 'Missing photo, admission date, or details',
      priority: 'low',
      href: '/warden/updates?tab=residents',
    });
  }

  if (home && (!home.description || !home.facilities || !home.image_url)) {
    items.push({
      id: `profile-update`,
      category: 'profile',
      title: 'Project profile updates due',
      description: 'Add description, facilities, or main photograph',
      priority: 'low',
      href: '/warden/updates?tab=profile',
    });
  }

  if (Array.isArray(events) && events.length) {
    items.push({
      id: `events-draft`,
      category: 'events',
      title: `Events pending documentation (${events.length})`,
      description: 'Draft events need photos or publishing',
      priority: 'low',
      href: '/warden/updates?tab=events',
    });
  }

  if (Array.isArray(stories) && stories.length) {
    items.push({
      id: `stories-draft`,
      category: 'stories',
      title: `Case studies awaiting submission (${stories.length})`,
      description: 'Draft success stories ready to complete',
      priority: 'low',
      href: '/warden/updates?tab=stories',
    });
  }

  // Thank-you pending: completed meals with FULLY_PAID but no report_sent_at
  const thankYouPending = await FoodSlot.countDocuments({
    home_id: homeId,
    date: { $lt: today, $gte: addDaysIso(-30) },
    status: { $in: ['BOOKED', 'PAID'] },
    payment_status: { $in: ['FULLY_PAID', 'PAID'] },
    $or: [{ report_sent_at: { $exists: false } }, { report_sent_at: null }],
  });
  if (thankYouPending > 0) {
    items.push({
      id: `thank-you`,
      category: 'thank_you',
      title: `Thank-you messages pending (${thankYouPending})`,
      description: 'Paid completed meals without a thank-you / report sent',
      priority: 'medium',
      href: '/warden/food?tab=completed',
    });
  }

  const priorityRank = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
}
