import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type UserRole = 'super_admin' | 'admin' | 'employee' | 'warden' | 'donor' | 'finance';

export interface IUser {
  _id: string;
  id: string;
  email?: string;
  passwordHash: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  status: 'active' | 'inactive';
  role: UserRole;
  trust_id?: string;
  home_id?: string;
  organization?: string;
  donor_category?: 'monthly' | 'yearly' | 'public' | 'csr';
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  pan_number?: string;
  aadhar_number?: string;
  requires_80g?: boolean;
  notes?: string;
  working_sector?: 'private' | 'govt' | 'others';
  designation?: string;
  donor_type?: 'indian' | 'nri' | 'foreigner';
  religion?: string;
  referred_by?: string;
  email_verified?: boolean;
  email_verified_at?: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
  created_at: Date;
  updated_at: Date;
}

const userSchema = new Schema<IUser>(
  {
    _id: { type: String, default: uuidv4 },
    email: { type: String, sparse: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true },
    phone: { type: String, sparse: true, index: true },
    avatar_url: String,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'employee', 'warden', 'donor', 'finance'],
      default: 'donor',
    },
    trust_id: String,
    home_id: String,
    organization: String,
    donor_category: { type: String, enum: ['monthly', 'yearly', 'public', 'csr'] },
    address: String,
    city: String,
    state: String,
    pincode: String,
    pan_number: String,
    aadhar_number: String,
    requires_80g: Boolean,
    notes: String,
    working_sector: { type: String, enum: ['private', 'govt', 'others'] },
    designation: String,
    donor_type: { type: String, enum: ['indian', 'nri', 'foreigner'] },
    religion: String,
    referred_by: String,
    email_verified: { type: Boolean, default: false },
    email_verified_at: Date,
    resetToken: { type: String, select: false },
    resetTokenExpiry: { type: Date, select: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.virtual('id').get(function () {
  return this._id;
});

export const User = mongoose.model<IUser>('User', userSchema);
