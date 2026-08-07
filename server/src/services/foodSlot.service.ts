import type { HydratedDocument } from 'mongoose';
import { FoodSlot, IFoodSlot } from '../models/Finance.js';
import { AppError } from '../middleware/errorHandler.js';

type FoodSlotDoc = HydratedDocument<IFoodSlot>;

export type FoodSlotPaymentStatus = 'FULLY_PAID' | 'PARTIALLY_PAID' | 'FULLY_PENDING';

const STATUS_PRIORITY: Record<string, number> = {
  PAID: 4,
  BOOKED: 3,
  NEED: 1,
  AVAILABLE: 1,
};

const PAYMENT_PRIORITY: Record<string, number> = {
  FULLY_PAID: 3,
  PARTIALLY_PAID: 2,
  FULLY_PENDING: 1,
};

function statusPriority(status: string | undefined): number {
  return STATUS_PRIORITY[String(status ?? '').toUpperCase()] ?? 0;
}

function paymentPriority(status: string | undefined): number {
  return PAYMENT_PRIORITY[String(status ?? '').toUpperCase()] ?? 0;
}

export function slotIsOpen(slot: Pick<IFoodSlot, 'status'>): boolean {
  const s = String(slot.status ?? '').toUpperCase();
  return s === 'NEED' || s === 'AVAILABLE';
}

export function slotIsBooked(slot: Pick<IFoodSlot, 'status'>): boolean {
  const s = String(slot.status ?? '').toUpperCase();
  return s === 'BOOKED' || s === 'PAID';
}

export function pickCanonicalFoodSlot(slots: FoodSlotDoc[]): FoodSlotDoc | undefined {
  return [...slots].sort((a, b) => {
    const byStatus = statusPriority(b.status) - statusPriority(a.status);
    if (byStatus !== 0) return byStatus;
    const byPayment = paymentPriority(b.payment_status) - paymentPriority(a.payment_status);
    if (byPayment !== 0) return byPayment;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  })[0];
}

/** Remove duplicate records for the same home / date / meal, keeping one canonical row. */
export async function dedupeFoodSlotCell(
  homeId: string,
  date: string,
  timeSlot: string,
  keepId: string,
): Promise<number> {
  const result = await FoodSlot.deleteMany({
    home_id: homeId,
    date,
    time_slot: timeSlot,
    _id: { $ne: keepId },
  });
  return result.deletedCount ?? 0;
}

/** Apply donor payment to an already-booked slot (pay-later confirmation flow). */
export async function applyDonorFoodSlotPayment(
  slot: FoodSlotDoc,
  donorId: string,
  amountPaidNow: number,
): Promise<IFoodSlot> {
  if (!slotIsBooked(slot)) {
    throw new AppError('This slot is not booked yet', 409);
  }
  if (slot.donor_id !== donorId) {
    throw new AppError('Not authorized for this food slot', 403);
  }

  const total = slot.amount ?? amountPaidNow;
  const currentPaid = slot.amount_paid ?? 0;
  const status = String(slot.payment_status ?? '').toUpperCase();

  if (status === 'FULLY_PAID' || status === 'PAID') {
    return slot;
  }

  const balanceDue =
    status === 'PARTIALLY_PAID' ? Math.max(0, total - currentPaid) : total;

  if (amountPaidNow <= 0) {
    throw new AppError('Payment amount must be greater than zero', 400);
  }

  const newPaid = currentPaid + amountPaidNow;

  if (newPaid >= total) {
    slot.payment_status = 'FULLY_PAID';
    slot.amount_paid = total;
  } else {
    slot.payment_status = 'PARTIALLY_PAID';
    slot.amount_paid = newPaid;
  }

  if (!slot.payment_mode) slot.payment_mode = 'online';
  else if (!slot.payment_mode.includes('online')) slot.payment_mode = `${slot.payment_mode}, online`;

  await slot.save();
  await dedupeFoodSlotCell(slot.home_id, slot.date, slot.time_slot, slot._id);
  return slot;
}

/** Apply donor booking metadata (occasion, purpose, outside meal type). */
export function applyDonorFoodBookingMetadata(
  slot: IFoodSlot,
  params: {
    timeSlot: string;
    occasionType?: string;
    occasionNote?: string;
    donationFor?: string;
    eventDate?: string;
    mealType?: string;
    reason?: string;
    sponsorFor?: string;
    donateOnBehalfOf?: string;
  },
): void {
  if (params.occasionType) slot.occasion_type = params.occasionType;
  if (params.occasionNote) slot.occasion_note = params.occasionNote;
  if (params.donationFor) slot.donate_on_behalf_of = params.donationFor;
  if (params.donateOnBehalfOf) slot.donate_on_behalf_of = params.donateOnBehalfOf;
  if (params.sponsorFor) slot.sponsor_for = params.sponsorFor;
  if (params.reason?.trim()) slot.reason = params.reason.trim();
  if (params.timeSlot === 'OUTSIDE_FOOD') {
    if (!params.mealType?.trim()) {
      throw new AppError('Meal type is required for Outside Food sponsorship', 400);
    }
    slot.meal_type = params.mealType.trim();
  }
}

/** Atomically book a slot on successful payment — slot must still be open. */
export async function bookSlotOnPayment(params: {
  donorId: string;
  homeId: string;
  trustId: string;
  date: string;
  timeSlot: string;
  amount: number;
  foodSlotId?: string;
  occasionType?: string;
  occasionNote?: string;
  donationFor?: string;
  eventDate?: string;
  mealType?: string;
  reason?: string;
  sponsorFor?: string;
  donateOnBehalfOf?: string;
}): Promise<IFoodSlot> {
  const {
    donorId,
    homeId,
    trustId,
    date,
    timeSlot,
    amount,
    foodSlotId,
    occasionType,
    occasionNote,
    donationFor,
    eventDate,
    mealType,
    reason,
    sponsorFor,
    donateOnBehalfOf,
  } = params;

  const siblings = await FoodSlot.find({ home_id: homeId, date, time_slot: timeSlot });
  const bookedByOther = siblings.find((s) => slotIsBooked(s) && s.donor_id && s.donor_id !== donorId);
  if (bookedByOther) {
    throw new AppError('This slot is already booked by another donor', 409);
  }

  let slot: FoodSlotDoc | null = foodSlotId
    ? await FoodSlot.findById(foodSlotId)
    : pickCanonicalFoodSlot(siblings) ?? null;

  if (slot && !slotIsOpen(slot)) {
    if (slotIsBooked(slot) && slot.donor_id === donorId && slot.payment_status === 'FULLY_PAID') {
      return slot;
    }
    throw new AppError('This slot is no longer open for booking', 409);
  }

  if (!slot) {
    slot = await FoodSlot.create({
      home_id: homeId,
      trust_id: trustId,
      date,
      time_slot: timeSlot,
      status: 'NEED',
      amount,
    });
  }

  slot.status = 'BOOKED';
  slot.donor_id = donorId;
  slot.amount = amount;
  slot.payment_status = 'FULLY_PAID';
  slot.amount_paid = amount;
  slot.payment_mode = 'online';
  applyDonorFoodBookingMetadata(slot, {
    timeSlot,
    occasionType,
    occasionNote,
    donationFor,
    eventDate,
    mealType,
    reason,
    sponsorFor,
    donateOnBehalfOf,
  });
  await slot.save();
  await dedupeFoodSlotCell(homeId, date, timeSlot, slot._id);

  try {
    const { sendFoodSponsorshipAcknowledgement } = await import('./foodSponsorshipAcknowledgement.service.js');
    await sendFoodSponsorshipAcknowledgement([slot._id]);
  } catch (err) {
    console.error('[bookSlotOnPayment] acknowledgement failed:', err);
  }

  return slot;
}

function normalizeFoodSlotBody(body: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...body };
  if (normalized.note === undefined && normalized.notes !== undefined) {
    normalized.note = normalized.notes;
  }
  if (normalized.notes === undefined && normalized.note !== undefined) {
    normalized.notes = normalized.note;
  }
  return normalized;
}

/** Book or update the single canonical slot for a calendar cell (staff flows). */
export async function bookOrUpdateFoodSlot(body: Record<string, unknown>): Promise<IFoodSlot> {
  const payload = normalizeFoodSlotBody(body);
  const homeId = String(payload.home_id ?? '');
  const date = String(payload.date ?? '');
  const timeSlot = String(payload.time_slot ?? '');

  if (!homeId || !date || !timeSlot) {
    return FoodSlot.create(payload) as Promise<IFoodSlot>;
  }

  const siblings = await FoodSlot.find({ home_id: homeId, date, time_slot: timeSlot });
  const bookedByOther = siblings.find(
    (s) => slotIsBooked(s) && s.donor_id && payload.donor_id && s.donor_id !== payload.donor_id,
  );
  if (bookedByOther) {
    throw new AppError('This slot is already booked by another donor', 409);
  }

  const canonical = pickCanonicalFoodSlot(siblings);
  if (canonical) {
    Object.assign(canonical, payload);
    await canonical.save();
    await dedupeFoodSlotCell(homeId, date, timeSlot, canonical._id);
    return canonical;
  }

  const created = await FoodSlot.create(payload);
  return created;
}

/** One-time / maintenance pass: collapse every duplicate calendar cell in the database. */
export async function dedupeAllFoodSlots(): Promise<{ cells: number; removed: number }> {
  const groups = await FoodSlot.aggregate<{ _id: { home_id: string; date: string; time_slot: string }; count: number }>([
    { $group: { _id: { home_id: '$home_id', date: '$date', time_slot: '$time_slot' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  let removed = 0;
  for (const group of groups) {
    const { home_id, date, time_slot } = group._id;
    const slots = await FoodSlot.find({ home_id, date, time_slot });
    const keep = pickCanonicalFoodSlot(slots);
    if (!keep) continue;
    removed += await dedupeFoodSlotCell(home_id, date, time_slot, keep._id);
  }

  return { cells: groups.length, removed };
}

/** Migrate legacy PAID status rows to BOOKED + FULLY_PAID. */
export async function migratePaidFoodSlots(): Promise<number> {
  const paidSlots = await FoodSlot.find({ status: 'PAID' });
  let count = 0;
  for (const slot of paidSlots) {
    slot.status = 'BOOKED';
    if (!slot.payment_status) slot.payment_status = 'FULLY_PAID';
    if (!slot.amount_paid && slot.amount) slot.amount_paid = slot.amount;
    await slot.save();
    count += 1;
  }
  return count;
}

/** Ensure Outside Food pricing row exists for booking UI. */
export async function ensureOutsideFoodPricing(): Promise<boolean> {
  const { FoodSlotPricing } = await import('../models/Finance.js');
  const existing = await FoodSlotPricing.findOne({ time_slot: 'OUTSIDE_FOOD' });
  if (existing) {
    if (!existing.is_active) {
      existing.is_active = true;
      await existing.save();
      return true;
    }
    return false;
  }
  await FoodSlotPricing.create({
    time_slot: 'OUTSIDE_FOOD',
    label: 'Outside Food',
    price: 0,
    description: 'Donor brings and serves food directly (tracked, no fee)',
    is_active: true,
  });
  return true;
}
