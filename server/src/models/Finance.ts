import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const uuidField = { type: String, default: uuidv4 };
const timestamps = { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } };

export interface IKindDonation {
  _id: string; donor_id?: string; donor_name?: string; trust_id: string; home_id: string; need_id?: string;
  item_type: string; item_description?: string; quantity: number; estimated_value?: number; received_date: string;
  status?: string; delivery_mode?: string;
  notes?: string; completion_photos?: string[]; completion_notes?: string; report_sent_at?: string; created_at: Date;
}

const kindDonationSchema = new Schema<IKindDonation>({
  _id: uuidField, donor_id: String, donor_name: String, trust_id: { type: String, required: true }, home_id: { type: String, required: true },
  need_id: String, item_type: { type: String, required: true }, item_description: String, quantity: { type: Number, default: 1 },
  estimated_value: Number, received_date: { type: String, required: true },
  status: { type: String, default: 'RECEIVED', index: true },
  delivery_mode: { type: String, default: 'DIRECT' },
  notes: String, completion_photos: [String],
  completion_notes: String, report_sent_at: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export const KindDonation = mongoose.model<IKindDonation>('KindDonation', kindDonationSchema);

export interface ICorpusFundContribution {
  _id: string; donor_id?: string; donor_name?: string; trust_id: string; amount: number; contribution_date: string;
  purpose?: string; notes?: string; created_at: Date;
}

const corpusSchema = new Schema<ICorpusFundContribution>({
  _id: uuidField, donor_id: String, donor_name: String, trust_id: { type: String, required: true },
  amount: { type: Number, required: true }, contribution_date: { type: String, required: true }, purpose: String, notes: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export const CorpusFundContribution = mongoose.model<ICorpusFundContribution>('CorpusFundContribution', corpusSchema);

export interface IFoodSlot {
  _id: string; home_id: string; trust_id: string; donor_id?: string; donor_name?: string; date: string;
  time_slot: string; meal_type?: string; amount?: number; status: string;
  payment_status?: string; amount_paid?: number; payment_mode?: string;
  notes?: string; donation_id?: string;
  occasion_type?: string; occasion_note?: string; completion_photos?: string[]; completion_notes?: string; report_sent_at?: string;
  created_at: Date; updated_at: Date;
}

const foodSlotSchema = new Schema<IFoodSlot>({
  _id: uuidField, home_id: { type: String, required: true, index: true }, trust_id: { type: String, required: true },
  donor_id: String, donor_name: String, date: { type: String, required: true, index: true }, time_slot: { type: String, required: true },
  meal_type: String, amount: Number, status: { type: String, default: 'NEED' }, notes: String, donation_id: String,
  payment_status: String, amount_paid: Number, payment_mode: String,
  occasion_type: String, occasion_note: String, completion_photos: [String], completion_notes: String, report_sent_at: String,
}, timestamps);

export const FoodSlot = mongoose.model<IFoodSlot>('FoodSlot', foodSlotSchema);

export interface IFoodSlotBookingRequest {
  _id: string; home_id: string; trust_id: string; food_slot_id?: string; date: string; time_slot: string;
  donor_id: string; donor_name?: string; amount: number; status: string; notes?: string;
  created_at: Date; updated_at: Date;
}

const foodSlotBookingRequestSchema = new Schema<IFoodSlotBookingRequest>({
  _id: uuidField,
  home_id: { type: String, required: true, index: true },
  trust_id: { type: String, required: true, index: true },
  food_slot_id: String,
  date: { type: String, required: true },
  time_slot: { type: String, required: true },
  donor_id: { type: String, required: true, index: true },
  donor_name: String,
  amount: { type: Number, required: true },
  status: { type: String, default: 'PENDING', index: true },
  notes: String,
}, timestamps);

export const FoodSlotBookingRequest = mongoose.model<IFoodSlotBookingRequest>(
  'FoodSlotBookingRequest',
  foodSlotBookingRequestSchema,
);

export interface IFoodSlotPricing {
  _id: string; time_slot: string; label: string; price: number; description?: string;
  is_active: boolean; created_at: Date; updated_at: Date;
}

const foodSlotPricingSchema = new Schema<IFoodSlotPricing>({
  _id: uuidField, time_slot: { type: String, required: true, unique: true }, label: { type: String, required: true },
  price: { type: Number, required: true, default: 0 }, description: String, is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const FoodSlotPricing = mongoose.model<IFoodSlotPricing>('FoodSlotPricing', foodSlotPricingSchema);

export type FoodRecurringFrequency = 'monthly' | 'annual';
export type FoodRecurringPledgeStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export interface IFoodRecurringPledge {
  _id: string;
  donor_id: string;
  donor_name?: string;
  home_id: string;
  trust_id: string;
  time_slot: string;
  amount: number;
  frequency: FoodRecurringFrequency;
  day_of_month: number;
  start_date: string;
  next_due_date: string;
  last_paid_date?: string;
  status: FoodRecurringPledgeStatus;
  first_food_slot_id?: string;
  occasion_type?: string;
  occasion_note?: string;
  donation_for?: string;
  event_date?: string;
  donor_board_name?: string;
  created_at: Date;
  updated_at: Date;
}

const foodRecurringPledgeSchema = new Schema<IFoodRecurringPledge>({
  _id: uuidField,
  donor_id: { type: String, required: true, index: true },
  donor_name: String,
  home_id: { type: String, required: true, index: true },
  trust_id: { type: String, required: true, index: true },
  time_slot: { type: String, required: true },
  amount: { type: Number, required: true },
  frequency: { type: String, required: true, enum: ['monthly', 'annual'] },
  day_of_month: { type: Number, required: true, min: 1, max: 31 },
  start_date: { type: String, required: true },
  next_due_date: { type: String, required: true, index: true },
  last_paid_date: String,
  status: { type: String, default: 'ACTIVE', index: true },
  first_food_slot_id: String,
  occasion_type: String,
  occasion_note: String,
  donation_for: String,
  event_date: String,
  donor_board_name: String,
}, timestamps);

foodRecurringPledgeSchema.index({ donor_id: 1, status: 1 });
foodRecurringPledgeSchema.index({ home_id: 1, status: 1 });

export const FoodRecurringPledge = mongoose.model<IFoodRecurringPledge>(
  'FoodRecurringPledge',
  foodRecurringPledgeSchema,
);

export interface IBankTransaction {
  _id: string; trust_id: string; transaction_date: string; description: string; amount: number; transaction_type: string;
  reference_number?: string; assigned_donor_id?: string; assigned_need_id?: string; assigned_category_id?: string;
  reconciliation_status: string; notes?: string; created_at: Date; updated_at: Date;
}

const bankTxSchema = new Schema<IBankTransaction>({
  _id: uuidField, trust_id: { type: String, required: true, index: true }, transaction_date: { type: String, required: true },
  description: { type: String, required: true }, amount: { type: Number, required: true }, transaction_type: { type: String, required: true },
  reference_number: String, assigned_donor_id: String, assigned_need_id: String, assigned_category_id: String,
  reconciliation_status: { type: String, default: 'pending' }, notes: String,
}, timestamps);

export const BankTransaction = mongoose.model<IBankTransaction>('BankTransaction', bankTxSchema);
