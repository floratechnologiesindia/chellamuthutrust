import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const uuidField = { type: String, default: uuidv4 };
const timestamps = { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } };

export interface ICategory { _id: string; key: string; label: string; description?: string; icon?: string; is_active: boolean; sort_order?: number; created_at: Date; }
const categorySchema = new Schema<ICategory>({ _id: uuidField, key: { type: String, unique: true }, label: String, description: String, icon: String, is_active: { type: Boolean, default: true }, sort_order: Number }, { timestamps: { createdAt: 'created_at', updatedAt: false } });
export const Category = mongoose.model<ICategory>('Category', categorySchema);

export interface ISubcategory { _id: string; category_id: string; label: string; description?: string; is_active: boolean; sort_order?: number; created_at: Date; }
const subcategorySchema = new Schema<ISubcategory>({ _id: uuidField, category_id: { type: String, required: true, index: true }, label: String, description: String, is_active: { type: Boolean, default: true }, sort_order: Number }, { timestamps: { createdAt: 'created_at', updatedAt: false } });
export const Subcategory = mongoose.model<ISubcategory>('Subcategory', subcategorySchema);

export interface ISubSubcategory { _id: string; subcategory_id: string; label: string; description?: string; is_active: boolean; sort_order?: number; created_at: Date; }
const subSubcategorySchema = new Schema<ISubSubcategory>({ _id: uuidField, subcategory_id: { type: String, required: true, index: true }, label: String, description: String, is_active: { type: Boolean, default: true }, sort_order: Number }, { timestamps: { createdAt: 'created_at', updatedAt: false } });
export const SubSubcategory = mongoose.model<ISubSubcategory>('SubSubcategory', subSubcategorySchema);

export interface INeed {
  _id: string; home_id: string; trust_id: string; category_id: string; subcategory_id?: string; sub_subcategory_id?: string;
  date: string; quantity: number; unit: string; help_mode: string; recurring_frequency?: string; recurring_end_date?: string;
  description?: string; max_sponsors_allowed: number; current_sponsors_count: number; status: string; created_by?: string;
  donation_mode?: string; required_amount?: number; collected_amount?: number; required_product_qty?: number; fulfilled_product_qty?: number;
  product_name?: string; product_unit?: string; product_specification?: string; product_link?: string; estimated_unit_price?: number;
  photo_urls?: string[]; quotation_urls?: string[]; staff_name?: string; submitter_email?: string;
  approval_status?: string; approved_by?: string; approved_at?: string; approval_notes?: string; fulfillment_details?: string;
  completion_photos?: string[]; completion_notes?: string; report_sent_at?: string;
  created_at: Date; updated_at: Date;
}

const needSchema = new Schema<INeed>({
  _id: uuidField, home_id: { type: String, required: true, index: true }, trust_id: { type: String, required: true, index: true },
  category_id: { type: String, required: true }, subcategory_id: String, sub_subcategory_id: String,
  date: { type: String, required: true }, quantity: { type: Number, default: 1 }, unit: { type: String, required: true },
  help_mode: { type: String, default: 'ONE_TIME' }, recurring_frequency: String, recurring_end_date: String,
  description: String, max_sponsors_allowed: { type: Number, default: 1 }, current_sponsors_count: { type: Number, default: 0 },
  status: { type: String, default: 'OPEN' }, created_by: String, donation_mode: String, required_amount: Number,
  collected_amount: { type: Number, default: 0 }, required_product_qty: Number, fulfilled_product_qty: { type: Number, default: 0 },
  product_name: String, product_unit: String, product_specification: String, product_link: String, estimated_unit_price: Number,
  photo_urls: [String], quotation_urls: [String], staff_name: String, submitter_email: String,
  approval_status: String, approved_by: String, approved_at: String, approval_notes: String, fulfillment_details: String,
  completion_photos: [String], completion_notes: String, report_sent_at: String,
}, timestamps);

export const Need = mongoose.model<INeed>('Need', needSchema);

export interface IDonation {
  _id: string; donor_id: string; need_id?: string; trust_id: string; home_id: string; sponsorship_type: string;
  amount_pledged: number; payment_mode: string; in_kind_details?: string; start_date: string; next_due_date?: string;
  last_paid_date?: string; status: string; occasion_type?: string; occasion_note?: string; created_at: Date; updated_at: Date;
}

const donationSchema = new Schema<IDonation>({
  _id: uuidField, donor_id: { type: String, required: true, index: true }, need_id: String, trust_id: { type: String, required: true },
  home_id: { type: String, required: true }, sponsorship_type: { type: String, default: 'ONE_TIME' }, amount_pledged: { type: Number, required: true },
  payment_mode: { type: String, default: 'online' }, in_kind_details: String, start_date: { type: String, required: true },
  next_due_date: String, last_paid_date: String, status: { type: String, default: 'PLEDGED' }, occasion_type: String, occasion_note: String,
}, timestamps);

export const Donation = mongoose.model<IDonation>('Donation', donationSchema);

export interface IDonationPayment {
  _id: string; donation_id: string; amount: number; payment_date: string; payment_reference?: string; notes?: string; created_at: Date;
}

const donationPaymentSchema = new Schema<IDonationPayment>({
  _id: uuidField, donation_id: { type: String, required: true, index: true }, amount: { type: Number, required: true },
  payment_date: { type: String, required: true }, payment_reference: String, notes: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export const DonationPayment = mongoose.model<IDonationPayment>('DonationPayment', donationPaymentSchema);

export interface ITask {
  _id: string; title: string; description?: string; assigned_by: string; assigned_to: string; trust_id?: string; home_id?: string;
  related_need_id?: string; related_donor_id?: string; priority: string; status: string; due_date: string;
  started_at?: Date; completed_at?: Date; completion_photos?: string[]; completion_notes?: string; report_sent_at?: string;
  created_at: Date; updated_at: Date;
}

const taskSchema = new Schema<ITask>({
  _id: uuidField, title: { type: String, required: true }, description: String, assigned_by: { type: String, required: true },
  assigned_to: { type: String, required: true, index: true }, trust_id: String, home_id: String, related_need_id: String,
  related_donor_id: String, priority: { type: String, default: 'medium' }, status: { type: String, default: 'OPEN' },
  due_date: { type: String, required: true }, started_at: Date, completed_at: Date, completion_photos: [String],
  completion_notes: String, report_sent_at: String,
}, timestamps);

export const Task = mongoose.model<ITask>('Task', taskSchema);

export interface INotification {
  _id: string; user_id: string; type: string; title: string; message: string; is_read: boolean; dedupe_key?: string; created_at: Date;
}

const notificationSchema = new Schema<INotification>({
  _id: uuidField, user_id: { type: String, required: true, index: true }, type: { type: String, required: true },
  title: { type: String, required: true }, message: { type: String, required: true }, is_read: { type: Boolean, default: false },
  dedupe_key: { type: String, sparse: true, index: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);

export type ReceiptEntityType = 'food_slot' | 'donation' | 'need';

export interface IReceiptInvoiceData {
  date: string;
  donorName: string;
  donorAddress?: string;
  donorPhone?: string;
  donorEmail?: string;
  description: string;
  amount: number;
  homeName?: string;
  donationType: 'need' | 'food_slot' | 'kind_donation' | 'corpus_fund' | 'donation';
  paymentMode?: string;
  referenceNumber?: string;
  paymentDate?: string;
  panNumber?: string;
  aadharNumber?: string;
  requires80g?: boolean;
}

export interface IReceipt {
  _id: string;
  donor_id: string;
  receipt_number: string;
  amount: number;
  payment_reference?: string;
  entity_type: ReceiptEntityType;
  entity_id: string;
  donation_payment_id?: string;
  description: string;
  home_name?: string;
  payment_date: string;
  payment_mode: string;
  reference_key: string;
  invoice_data: IReceiptInvoiceData;
  issued_at: Date;
  receipt_emailed_at?: Date;
  created_at: Date;
}

const receiptSchema = new Schema<IReceipt>({
  _id: uuidField,
  donor_id: { type: String, required: true, index: true },
  receipt_number: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  payment_reference: String,
  entity_type: { type: String, required: true },
  entity_id: { type: String, required: true, index: true },
  donation_payment_id: String,
  description: { type: String, required: true },
  home_name: String,
  payment_date: { type: String, required: true },
  payment_mode: { type: String, default: 'Online' },
  reference_key: { type: String, required: true, unique: true },
  invoice_data: { type: Schema.Types.Mixed, required: true },
  issued_at: { type: Date, default: Date.now },
  receipt_emailed_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export const Receipt = mongoose.model<IReceipt>('Receipt', receiptSchema);
