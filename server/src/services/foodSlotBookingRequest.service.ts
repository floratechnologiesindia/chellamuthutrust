import { FoodSlot, FoodSlotBookingRequest } from '../models/Finance.js';
import { Home } from '../models/Core.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Operations.js';
import { AppError } from '../middleware/errorHandler.js';
import { toApiDoc } from '../utils/serializers.js';
import { dedupeFoodSlotCell, pickCanonicalFoodSlot, slotIsOpen } from './foodSlot.service.js';
import {
  notifyDonorPayLaterReceived,
  notifyDonorBookingConfirmed,
  notifyDonorBookingDeclined,
} from './donorNotification.service.js';
import { getSocialWorkerIdsForHome } from './projectAssignment.service.js';

export type FoodSlotPaymentStatus = 'FULLY_PAID' | 'PARTIALLY_PAID' | 'FULLY_PENDING';

async function getStaffUserIdsForHome(homeId: string, trustId: string): Promise<string[]> {
  const ids = new Set<string>(await getSocialWorkerIdsForHome(homeId));

  const admins = await User.find({
    role: { $in: ['admin', 'super_admin'] },
    $or: [{ trust_id: trustId }, { role: 'super_admin' }],
  }).select('_id');
  admins.forEach((u) => ids.add(u._id));

  return [...ids];
}

async function notifyStaffOfBookingRequest(
  homeId: string,
  trustId: string,
  message: string,
  title = 'Food Slot Booking Request',
) {
  const userIds = await getStaffUserIdsForHome(homeId, trustId);
  if (!userIds.length) return;

  await Notification.insertMany(
    userIds.map((user_id) => ({
      user_id,
      type: 'food_slot_booking_request',
      title,
      message,
    })),
  );
}

export async function createFoodSlotBookingRequest(
  donorId: string,
  data: {
    home_id: string;
    trust_id: string;
    date: string;
    time_slot: string;
    amount: number;
    food_slot_id?: string;
    notes?: string;
  },
) {
  const siblings = await FoodSlot.find({
    home_id: data.home_id,
    date: data.date,
    time_slot: data.time_slot,
  });
  const canonical = pickCanonicalFoodSlot(siblings);
  if (canonical && !slotIsOpen(canonical)) {
    throw new AppError('This slot is no longer open for booking', 409);
  }

  const existingPending = await FoodSlotBookingRequest.findOne({
    home_id: data.home_id,
    date: data.date,
    time_slot: data.time_slot,
    donor_id: donorId,
    status: 'PENDING',
  });
  if (existingPending) {
    throw new AppError('You already have a pending request for this slot', 409);
  }

  const donor = await User.findById(donorId);
  const request = await FoodSlotBookingRequest.create({
    ...data,
    donor_id: donorId,
    donor_name: donor?.name,
    food_slot_id: data.food_slot_id || canonical?._id,
    status: 'PENDING',
  });

  const home = await Home.findById(data.home_id);
  await notifyStaffOfBookingRequest(
    data.home_id,
    data.trust_id,
    `${donor?.name || 'A donor'} requested to book ${data.time_slot} on ${data.date} at ${home?.name || 'a home'} (₹${data.amount}). Pay-later — please review and confirm.`,
  );

  await notifyDonorPayLaterReceived(donorId, {
    home_id: data.home_id,
    date: data.date,
    time_slot: data.time_slot,
    amount: data.amount,
  });

  return toApiDoc(request);
}

export async function confirmFoodSlotBooking(
  slotId: string,
  staffUserId: string,
  payment: {
    payment_status: FoodSlotPaymentStatus;
    amount_paid?: number;
    payment_mode?: string;
    donor_id?: string;
  },
) {
  const slot = await FoodSlot.findById(slotId);
  if (!slot) throw new AppError('Food slot not found', 404);

  if (payment.donor_id) slot.donor_id = payment.donor_id;
  if (!slot.donor_id) throw new AppError('Donor is required to confirm booking', 400);

  slot.status = 'BOOKED';
  slot.payment_status = payment.payment_status;
  slot.payment_mode = payment.payment_mode;

  if (payment.payment_status === 'FULLY_PAID') {
    slot.amount_paid = payment.amount_paid ?? slot.amount ?? 0;
  } else if (payment.payment_status === 'PARTIALLY_PAID') {
    if (!payment.amount_paid || payment.amount_paid <= 0) {
      throw new AppError('Amount paid is required for partial payment', 400);
    }
    if (!payment.payment_mode?.trim()) {
      throw new AppError('Payment mode is required for partial payment', 400);
    }
    slot.amount_paid = payment.amount_paid;
  } else {
    slot.amount_paid = 0;
    slot.payment_mode = payment.payment_mode;
  }

  await slot.save();
  await dedupeFoodSlotCell(slot.home_id, slot.date, slot.time_slot, slot._id);

  await FoodSlotBookingRequest.updateMany(
    {
      home_id: slot.home_id,
      date: slot.date,
      time_slot: slot.time_slot,
      donor_id: slot.donor_id,
      status: 'PENDING',
    },
    { status: 'APPROVED' },
  );

  if (slot.donor_id) {
    await notifyDonorBookingConfirmed(slot.donor_id, slot);
  }

  return toApiDoc(slot);
}

export async function approveBookingRequest(
  requestId: string,
  staffUserId: string,
  payment: {
    payment_status: FoodSlotPaymentStatus;
    amount_paid?: number;
    payment_mode?: string;
  },
) {
  const request = await FoodSlotBookingRequest.findById(requestId);
  if (!request) throw new AppError('Booking request not found', 404);
  if (request.status !== 'PENDING') throw new AppError('Request is no longer pending', 409);

  const siblings = await FoodSlot.find({
    home_id: request.home_id,
    date: request.date,
    time_slot: request.time_slot,
  });
  let slot = pickCanonicalFoodSlot(siblings);

  if (slot && !slotIsOpen(slot)) {
    throw new AppError('This slot is no longer open', 409);
  }

  if (!slot) {
    slot = await FoodSlot.create({
      home_id: request.home_id,
      trust_id: request.trust_id,
      date: request.date,
      time_slot: request.time_slot,
      status: 'NEED',
      amount: request.amount,
    });
  }

  const confirmed = await confirmFoodSlotBooking(slot._id, staffUserId, {
    ...payment,
    donor_id: request.donor_id,
  });

  request.status = 'APPROVED';
  await request.save();

  return { request: toApiDoc(request), slot: confirmed };
}

export async function listFoodSlotBookingRequests(filters: {
  home_id?: string;
  home_ids?: string;
  trust_id?: string;
  donor_id?: string;
  status?: string;
}) {
  const query: Record<string, unknown> = {};
  if (filters.home_ids) {
    query.home_id = { $in: filters.home_ids.split(',').map((s) => s.trim()).filter(Boolean) };
  } else if (filters.home_id) {
    query.home_id = filters.home_id;
  }
  if (filters.trust_id) query.trust_id = filters.trust_id;
  if (filters.donor_id) query.donor_id = filters.donor_id;
  if (filters.status) query.status = filters.status;

  const docs = await FoodSlotBookingRequest.find(query).sort({ created_at: -1 }).lean();
  const homeIds = [...new Set(docs.map((d) => d.home_id))];
  const homes = await Home.find({ _id: { $in: homeIds } }).select('name').lean();
  const homeNames = new Map(homes.map((h) => [h._id, h.name]));

  return docs.map((d) => ({
    ...d,
    id: d._id,
    home_name: homeNames.get(d.home_id) ?? undefined,
  }));
}

export async function rejectBookingRequest(requestId: string, reason?: string) {
  const request = await FoodSlotBookingRequest.findById(requestId);
  if (!request) throw new AppError('Booking request not found', 404);
  if (request.status !== 'PENDING') throw new AppError('Request is no longer pending', 409);

  request.status = 'REJECTED';
  await request.save();

  await notifyDonorBookingDeclined(request.donor_id, {
    home_id: request.home_id,
    date: request.date,
    time_slot: request.time_slot,
    reason,
  });

  return toApiDoc(request);
}
