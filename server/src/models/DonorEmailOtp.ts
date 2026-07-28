import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IDonorEmailOtp {
  _id: string;
  user_id: string;
  email: string;
  code_hash: string;
  expires_at: Date;
  attempts: number;
  created_at: Date;
}

const donorEmailOtpSchema = new Schema<IDonorEmailOtp>({
  _id: { type: String, default: uuidv4 },
  user_id: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  code_hash: { type: String, required: true, select: false },
  expires_at: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export const DonorEmailOtp = mongoose.model<IDonorEmailOtp>('DonorEmailOtp', donorEmailOtpSchema);
