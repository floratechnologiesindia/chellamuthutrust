import { Receipt, Donation, DonationPayment, Need } from '../models/Operations.js';
import type { IDonation, IDonationPayment, IReceipt, IReceiptInvoiceData } from '../models/Operations.js';
import { FoodSlot, IFoodSlot } from '../models/Finance.js';
import { Home } from '../models/Core.js';
import { User } from '../models/User.js';
import { toApiDoc } from '../utils/serializers.js';
import { getDonorDisplayEmail } from '../utils/donorEmail.js';

const TIME_SLOT_LABELS: Record<string, string> = {
  MORNING: 'Breakfast',
  AFTERNOON: 'Lunch',
  EVENING: 'Dinner',
  REFRESHMENTS: 'Refreshments',
};

function formatDonorAddress(user: {
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}): string | undefined {
  const parts = [user.address, user.city, user.state, user.pincode].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

async function allocateReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RCP-${year}-`;
  const count = await Receipt.countDocuments({
    receipt_number: { $regex: `^${prefix}` },
  });
  return `${prefix}${String(count + 1).padStart(6, '0')}`;
}

async function loadDonorProfile(donorId: string) {
  return User.findById(donorId)
    .select('name email phone address city state pincode pan_number aadhar_number requires_80g')
    .lean();
}

function buildInvoiceSnapshot(
  donor: NonNullable<Awaited<ReturnType<typeof loadDonorProfile>>>,
  fields: Omit<IReceiptInvoiceData, 'donorName' | 'donorAddress' | 'donorPhone' | 'donorEmail' | 'panNumber' | 'aadharNumber' | 'requires80g'>,
): IReceiptInvoiceData {
  const requires80g = Boolean(donor.requires_80g);
  return {
    ...fields,
    donorName: donor.name || 'Donor',
    donorAddress: formatDonorAddress(donor),
    donorPhone: donor.phone,
    donorEmail: getDonorDisplayEmail(donor.email) || undefined,
    panNumber: requires80g ? donor.pan_number : undefined,
    aadharNumber: requires80g ? donor.aadhar_number : undefined,
    requires80g,
  };
}

export async function issueDonationPaymentReceipt(params: {
  donorId: string;
  donation: IDonation;
  payment: IDonationPayment;
}): Promise<{ receipt: IReceipt; referenceKey: string } | null> {
  const { donorId, donation, payment } = params;
  if (donation.donor_id !== donorId) return null;

  const paymentRef = payment.payment_reference || String(payment._id);
  const referenceKey = `donation-${donation._id}-${paymentRef}`;

  const existing = await Receipt.findOne({ reference_key: referenceKey }).lean();
  if (existing) return { receipt: existing as IReceipt, referenceKey };

  const donor = await loadDonorProfile(donorId);
  if (!donor) return null;

  const home = await Home.findById(donation.home_id).select('name').lean();
  const homeName = home?.name;
  let description = 'Voluntary contribution';
  let entityType: IReceipt['entity_type'] = 'donation';

  if (donation.need_id) {
    entityType = 'need';
    const need = await Need.findById(donation.need_id).select('description').lean();
    description = need?.description || description;
  } else if (donation.occasion_note) {
    description = donation.occasion_note;
  }

  const invoiceData = buildInvoiceSnapshot(donor, {
    date: donation.start_date,
    description,
    amount: payment.amount,
    homeName,
    donationType: donation.need_id ? 'need' : 'donation',
    paymentMode: donation.payment_mode === 'online' ? 'Online' : 'Online',
    referenceNumber: paymentRef,
    paymentDate: payment.payment_date,
  });

  const receiptNumber = await allocateReceiptNumber();
  const receipt = await Receipt.create({
    donor_id: donorId,
    receipt_number: receiptNumber,
    amount: payment.amount,
    payment_reference: paymentRef,
    entity_type: entityType,
    entity_id: donation._id,
    donation_payment_id: String(payment._id),
    description,
    home_name: homeName,
    payment_date: payment.payment_date,
    payment_mode: invoiceData.paymentMode || 'Online',
    reference_key: referenceKey,
    invoice_data: invoiceData,
  });

  return { receipt: receipt.toObject() as IReceipt, referenceKey };
}

export async function issueFoodSlotReceipt(params: {
  donorId: string;
  slot: IFoodSlot;
  amountPaid: number;
  paymentReference?: string;
}): Promise<{ receipt: IReceipt; referenceKey: string } | null> {
  const { donorId, slot, amountPaid, paymentReference } = params;
  if (String(slot.donor_id) !== donorId) return null;

  const paymentStatus = String(slot.payment_status ?? '').toUpperCase();
  if (paymentStatus !== 'FULLY_PAID' && paymentStatus !== 'PAID') return null;

  const referenceKey = `food-${slot._id}`;
  const existing = await Receipt.findOne({ reference_key: referenceKey }).lean();
  if (existing) return { receipt: existing as IReceipt, referenceKey };

  const donor = await loadDonorProfile(donorId);
  if (!donor) return null;

  const home = await Home.findById(slot.home_id).select('name').lean();
  const homeName = home?.name;
  const slotLabel =
    slot.time_slot === 'OUTSIDE_FOOD' && slot.meal_type
      ? `Outside Food (${slot.meal_type})`
      : TIME_SLOT_LABELS[slot.time_slot] || slot.time_slot;
  const description = `${slotLabel} sponsorship · ${homeName || 'home'} · ${slot.date}`;

  const invoiceData = buildInvoiceSnapshot(donor, {
    date: slot.date,
    description: `${slotLabel} meal sponsorship${slot.notes || slot.note || slot.occasion_note ? ` — ${slot.notes || slot.note || slot.occasion_note}` : slot.reason ? ` — ${slot.reason}` : ''}`,
    amount: amountPaid,
    homeName,
    donationType: 'food_slot',
    paymentMode: slot.payment_mode || 'Online',
    referenceNumber: paymentReference || referenceKey,
    paymentDate: slot.date,
  });

  const receiptNumber = await allocateReceiptNumber();
  const receipt = await Receipt.create({
    donor_id: donorId,
    receipt_number: receiptNumber,
    amount: amountPaid,
    payment_reference: paymentReference,
    entity_type: 'food_slot',
    entity_id: String(slot._id),
    description,
    home_name: homeName,
    payment_date: slot.date,
    payment_mode: invoiceData.paymentMode || 'Online',
    reference_key: referenceKey,
    invoice_data: invoiceData,
  });

  return { receipt: receipt.toObject() as IReceipt, referenceKey };
}

/** Legacy need-only reference for older notifications. */
export async function findReceiptByLegacyReference(
  donorId: string,
  referenceKey: string,
): Promise<IReceipt | null> {
  const direct = await Receipt.findOne({ donor_id: donorId, reference_key: referenceKey }).lean();
  if (direct) return direct as IReceipt;

  if (referenceKey.startsWith('need-')) {
    const needId = referenceKey.slice(5);
    const donation = await Donation.findOne({ donor_id: donorId, need_id: needId })
      .sort({ created_at: -1 })
      .lean();
    if (!donation) return null;
    const payment = await DonationPayment.findOne({ donation_id: donation._id })
      .sort({ payment_date: -1, created_at: -1 })
      .lean();
    if (!payment) return null;
    const issued = await issueDonationPaymentReceipt({
      donorId,
      donation: donation as IDonation,
      payment: payment as IDonationPayment,
    });
    return issued?.receipt ?? null;
  }

  return null;
}

export async function listDonorReceipts(donorId: string, includeInvoice = true) {
  const receipts = await Receipt.find({ donor_id: donorId })
    .sort({ issued_at: -1 })
    .lean();
  return receipts.map((r) => serializeReceipt(r as IReceipt, includeInvoice));
}

export async function getDonorReceiptByReference(donorId: string, referenceKey: string) {
  const direct = await Receipt.findOne({ donor_id: donorId, reference_key: referenceKey }).lean();
  if (direct) return serializeReceipt(direct as IReceipt, true);

  const legacy = await findReceiptByLegacyReference(donorId, referenceKey);
  if (!legacy) return null;
  return serializeReceipt(legacy, true);
}

export async function getDonorReceipt(donorId: string, receiptId: string) {
  const receipt = await Receipt.findOne({ _id: receiptId, donor_id: donorId }).lean();
  if (!receipt) return null;
  return serializeReceipt(receipt as IReceipt, true);
}

export function serializeReceipt(receipt: IReceipt, includeInvoice = false) {
  const doc = toApiDoc(receipt as unknown as Record<string, unknown>);
  if (!doc) return null;
  const base = {
    id: doc.id,
    donor_id: doc.donor_id,
    receipt_number: doc.receipt_number,
    amount: doc.amount,
    payment_reference: doc.payment_reference,
    entity_type: doc.entity_type,
    entity_id: doc.entity_id,
    description: doc.description,
    home_name: doc.home_name,
    payment_date: doc.payment_date,
    payment_mode: doc.payment_mode,
    reference_key: doc.reference_key,
    issued_at: doc.issued_at,
    receipt_emailed_at: doc.receipt_emailed_at,
    created_at: doc.created_at,
  };
  if (includeInvoice) {
    return {
      ...base,
      invoice_data: {
        ...(doc.invoice_data as IReceiptInvoiceData),
        receiptNumber: doc.receipt_number,
      },
    };
  }
  return base;
}
