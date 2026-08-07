import { FoodSlot, KindDonation } from '../models/Finance.js';
import { Need, Donation } from '../models/Operations.js';
import { normalizePaymentStatus } from './foodSlotPaymentNormalize.js';

export type PeriodPreset = 'month' | 'quarter' | 'year' | 'custom';

function startOfMonthIso(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function endOfMonthIso(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export function resolvePeriodRange(
  period: PeriodPreset,
  startDate?: string,
  endDate?: string,
): { start: string; end: string } {
  const today = new Date();
  const end = endDate || today.toISOString().slice(0, 10);
  if (period === 'custom' && startDate) {
    return { start: startDate, end: endDate || end };
  }
  if (period === 'year') {
    return { start: `${today.getFullYear()}-01-01`, end };
  }
  if (period === 'quarter') {
    const q = Math.floor(today.getMonth() / 3);
    const start = new Date(today.getFullYear(), q * 3, 1);
    return { start: start.toISOString().slice(0, 10), end };
  }
  // month (default)
  return { start: startOfMonthIso(today), end: endOfMonthIso(today) };
}

const MEAL_KEYS = ['MORNING', 'REFRESHMENTS', 'AFTERNOON', 'EVENING', 'OUTSIDE_FOOD'] as const;

export async function getWardenDashboardStats(homeId: string, start: string, end: string) {
  const dateFilter = { $gte: start, $lte: end };

  const [foodSlots, kindDonations, needs, donations] = await Promise.all([
    FoodSlot.find({
      home_id: homeId,
      date: dateFilter,
      status: { $in: ['BOOKED', 'PAID'] },
    }).lean(),
    KindDonation.find({
      home_id: homeId,
      received_date: dateFilter,
    }).lean(),
    Need.find({ home_id: homeId }).lean(),
    Donation.find({
      home_id: homeId,
      start_date: dateFilter,
      status: { $in: ['PLEDGED', 'ACTIVE', 'COMPLETED'] },
    }).lean(),
  ]);

  const mealCounts: Record<string, number> = Object.fromEntries(MEAL_KEYS.map((k) => [k, 0]));
  let foodValue = 0;
  let paid = 0;
  let pending = 0;
  let partial = 0;
  let cancelled = 0;
  const today = new Date().toISOString().slice(0, 10);
  let upcoming = 0;
  let completed = 0;

  for (const slot of foodSlots) {
    const key = String(slot.time_slot || '').toUpperCase();
    if (key in mealCounts) mealCounts[key] += 1;
    foodValue += Number(slot.amount) || 0;
    const pay = normalizePaymentStatus(slot.payment_status, slot.status);
    if (pay === 'FULLY_PAID') paid += 1;
    else if (pay === 'PARTIALLY_PAID') partial += 1;
    else pending += 1;
    if (slot.date >= today) upcoming += 1;
    else completed += 1;
  }

  // Cancelled food slots in range (if tracked as NEED with history — count BOOKED cancelled via notes not available)
  cancelled = await FoodSlot.countDocuments({
    home_id: homeId,
    date: dateFilter,
    status: 'CANCELLED',
  });

  const kindValue = kindDonations.reduce((s, k) => s + (Number(k.estimated_value) || 0), 0);
  const kindByType: Record<string, number> = {};
  for (const k of kindDonations) {
    const t = k.item_type || 'Other';
    kindByType[t] = (kindByType[t] || 0) + 1;
  }

  const listed = needs.length;
  const fully = needs.filter((n) => n.status === 'FULLY_SPONSORED' || n.status === 'COMPLETED').length;
  const partialNeeds = needs.filter((n) => n.status === 'PARTIAL').length;
  const pendingNeeds = needs.filter((n) => n.status === 'OPEN').length;
  const needsValue = needs.reduce((s, n) => s + (Number(n.required_amount) || 0), 0);

  // Chart series: food value by date in range
  const byDate: Record<string, number> = {};
  for (const slot of foodSlots) {
    byDate[slot.date] = (byDate[slot.date] || 0) + (Number(slot.amount) || 0);
  }
  const chart = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));

  return {
    period: { start, end },
    food: {
      total_sponsorships: foodSlots.length,
      total_value: foodValue,
      breakfast: mealCounts.MORNING,
      lunch: mealCounts.AFTERNOON,
      dinner: mealCounts.EVENING,
      refreshments: mealCounts.REFRESHMENTS,
      outside_food: mealCounts.OUTSIDE_FOOD,
    },
    payment: {
      total_bookings: foodSlots.length,
      paid,
      pending,
      partial,
      cancelled,
      upcoming,
      completed,
    },
    kind: {
      total_count: kindDonations.length,
      estimated_value: kindValue,
      by_type: kindByType,
    },
    requirements: {
      listed,
      listed_value: needsValue,
      fully_sponsored: fully,
      partially_sponsored: partialNeeds,
      pending: pendingNeeds,
    },
    donations_count: donations.length,
    chart,
  };
}
