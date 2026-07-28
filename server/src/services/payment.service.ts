import { Donation, DonationPayment } from '../models/Operations.js';
import { AppError } from '../middleware/errorHandler.js';
import { toApiDoc } from '../utils/serializers.js';
import { bookSlotOnPayment, applyDonorFoodSlotPayment, pickCanonicalFoodSlot, slotIsBooked } from './foodSlot.service.js';
import { FoodSlot } from '../models/Finance.js';
import { Home } from '../models/Core.js';
import {
  notifyDonorFoodSlotPaymentSuccess,
  notifyDonorNeedSponsored,
  notifyDonorRecurringReceived,
  notifyDonorRecurringEnded,
  deliverReceiptNotification,
} from './donorNotification.service.js';
import { issueDonationPaymentReceipt } from './receipt.service.js';

export async function completeDonationPayment(donationId: string, donorId: string) {
  const donation = await Donation.findById(donationId);
  if (!donation) throw new AppError('Donation not found', 404);
  if (donation.donor_id !== donorId) throw new AppError('Not authorized for this donation', 403);
  if (donation.status === 'ACTIVE' || donation.status === 'COMPLETED') {
    return { success: true, alreadyPaid: true, donation };
  }

  const today = new Date().toISOString().split('T')[0];
  const payment = await DonationPayment.create({
    donation_id: donationId,
    amount: donation.amount_pledged,
    payment_date: today,
    payment_reference: `MANUAL-${Date.now()}`,
    notes: 'Manual payment (development)',
  });

  donation.status = 'ACTIVE';
  donation.last_paid_date = today;
  await donation.save();

  const issued = await issueDonationPaymentReceipt({
    donorId,
    donation: donation.toObject() as typeof donation,
    payment: payment.toObject() as typeof payment,
  });

  const home = await Home.findById(donation.home_id).select('name').lean();
  const homeName = home?.name || 'the home';

  if (donation.need_id) {
    const { Need } = await import('../models/Operations.js');
    const { recalculateNeedProgress } = await import('./needProgress.service.js');
    await recalculateNeedProgress(donation.need_id);
    const need = await Need.findById(donation.need_id).select('description').lean();
    await notifyDonorNeedSponsored(donorId, {
      needDescription: need?.description || 'a need',
      homeName,
      amount: donation.amount_pledged,
      needId: donation.need_id,
      receiptReference: issued?.referenceKey,
    });
  } else if (issued?.referenceKey) {
    await deliverReceiptNotification(donorId, issued.referenceKey, {
      description: `Donation to ${homeName}`,
      amount: donation.amount_pledged,
    });
  }

  const sponsorshipType = String(donation.sponsorship_type || '').toUpperCase();
  if (sponsorshipType.includes('RECURRING') || sponsorshipType.includes('MONTHLY') || sponsorshipType.includes('YEARLY')) {
    await notifyDonorRecurringReceived(donorId, {
      amount: donation.amount_pledged,
      homeName,
      donationId: donationId,
    });
  }

  return { success: true, donation };
}

export interface CompleteFoodSlotPaymentInput {
  food_slot_id?: string;
  home_id?: string;
  trust_id?: string;
  date?: string;
  time_slot?: string;
  amount?: number;
  occasion_type?: string;
  occasion_note?: string;
  recurring_frequency?: string;
  donation_for?: string;
  event_date?: string;
  donor_board_name?: string;
}

/** Book slot on payment, or apply balance payment on an already-booked slot. */
export async function completeFoodSlotPayment(
  donorId: string,
  input: CompleteFoodSlotPaymentInput,
) {
  const {
    food_slot_id: foodSlotId,
    home_id: homeId,
    trust_id: trustId,
    date,
    time_slot: timeSlot,
    amount,
    occasion_type: occasionType,
    occasion_note: occasionNote,
    recurring_frequency: recurringFrequency,
    donation_for: donationFor,
    event_date: eventDate,
    donor_board_name: donorBoardName,
  } = input;

  if (!homeId || !trustId || !date || !timeSlot || amount == null) {
    throw new AppError('home_id, trust_id, date, time_slot, and amount are required', 400);
  }

  const { parseFoodRecurringFrequency, createFoodRecurringPledge } = await import(
    './foodRecurringPledge.service.js'
  );
  const frequency = parseFoodRecurringFrequency(recurringFrequency);

  const attachPledge = async (slot: { _id: string; date: string; time_slot: string; amount?: number }) => {
    if (!frequency) return null;
    const pledge = await createFoodRecurringPledge({
      donorId,
      homeId,
      trustId,
      timeSlot: slot.time_slot || timeSlot,
      amount: slot.amount ?? amount,
      frequency,
      startDate: slot.date || date,
      firstFoodSlotId: slot._id,
      occasionType,
      occasionNote,
      donationFor,
      eventDate,
      donorBoardName,
    });
    return toApiDoc(pledge);
  };

  if (foodSlotId) {
    const existing = await FoodSlot.findById(foodSlotId);
    if (existing && slotIsBooked(existing) && existing.donor_id === donorId) {
      const paymentStatus = String(existing.payment_status ?? '').toUpperCase();
      if (paymentStatus === 'FULLY_PAID' || paymentStatus === 'PAID') {
        return { success: true, alreadyPaid: true, slot: toApiDoc(existing) };
      }
      const slot = await applyDonorFoodSlotPayment(existing, donorId, amount);
      await notifyDonorFoodSlotPaymentSuccess(donorId, slot, amount);
      const pledge = await attachPledge(slot);
      return { success: true, slot: toApiDoc(slot), pledge };
    }
  }

  const siblings = await FoodSlot.find({ home_id: homeId, date, time_slot: timeSlot });
  const bookedForDonor = pickCanonicalFoodSlot(
    siblings.filter((s) => slotIsBooked(s) && s.donor_id === donorId),
  );
  if (bookedForDonor) {
    const paymentStatus = String(bookedForDonor.payment_status ?? '').toUpperCase();
    if (paymentStatus === 'FULLY_PAID' || paymentStatus === 'PAID') {
      return { success: true, alreadyPaid: true, slot: toApiDoc(bookedForDonor) };
    }
    const slot = await applyDonorFoodSlotPayment(bookedForDonor, donorId, amount);
    await notifyDonorFoodSlotPaymentSuccess(donorId, slot, amount);
    const pledge = await attachPledge(slot);
    return { success: true, slot: toApiDoc(slot), pledge };
  }

  const slot = await bookSlotOnPayment({
    donorId,
    homeId,
    trustId,
    date,
    timeSlot,
    amount,
    foodSlotId,
    occasionType,
    occasionNote,
  });

  await notifyDonorFoodSlotPaymentSuccess(donorId, slot, amount);
  const pledge = await attachPledge(slot);

  return { success: true, slot: toApiDoc(slot), pledge };
}
