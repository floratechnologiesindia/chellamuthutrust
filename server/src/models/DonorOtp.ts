import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IDonorOtp {
  _id: string;
  phone: string;
  name?: string;
  code_hash: string;
  expires_at: Date;
  attempts: number;
  created_at: Date;
}

const donorOtpSchema = new Schema<IDonorOtp>({
  _id: { type: String, default: uuidv4 },
  phone: { type: String, required: true, unique: true, index: true },
  name: String,
  code_hash: { type: String, required: true, select: false },
  expires_at: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export const DonorOtp = mongoose.model<IDonorOtp>('DonorOtp', donorOtpSchema);
