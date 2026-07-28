import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { DonorOtp } from '../models/DonorOtp.js';
import { DonorEmailOtp } from '../models/DonorEmailOtp.js';
import { Notification } from '../models/Operations.js';
import { AppError } from '../middleware/errorHandler.js';
import { signToken } from '../middleware/auth.js';
import { toApiDoc } from '../utils/serializers.js';
import { env } from '../config/env.js';
import { sendWhatsApp, sendDonorEmail } from './integrations.service.js';
import {
  isPlaceholderDonorEmail,
  isValidDonorEmail,
  normalizeDonorEmail,
} from '../utils/donorEmail.js';
import { emailUnsentReceiptsForDonor } from './receiptEmail.service.js';
import {
  notifyDonorWelcome,
  notifyDonorAccountSecurity,
} from './donorNotification.service.js';

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export async function requestDonorOtp(phone: string, name?: string) {
  const normalized = normalizePhone(phone);
  if (normalized.length < 10) throw new AppError('Please enter a valid WhatsApp number');

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await bcrypt.hash(code, 10);

  await DonorOtp.findOneAndUpdate(
    { phone: normalized },
    {
      name: name?.trim() || undefined,
      code_hash: codeHash,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
    },
    { upsert: true, new: true },
  );

  if (env.watiAccessToken) {
    try {
      await sendWhatsApp(
        normalized,
        `Your Chellamuthu Connect login code is ${code}. Valid for 10 minutes.`,
        'otp_login',
      );
    } catch (err) {
      console.warn('WhatsApp OTP delivery failed:', err);
    }
  }

  const showDevOtp = env.nodeEnv === 'development' || process.env.SHOW_DEV_OTP === 'true';
  return {
    success: true,
    message: 'OTP sent to your WhatsApp number',
    ...(showDevOtp ? { devOtp: code } : {}),
  };
}

export async function verifyDonorOtp(phone: string, otp: string) {
  const normalized = normalizePhone(phone);
  const record = await DonorOtp.findOne({ phone: normalized }).select('+code_hash');
  if (!record) throw new AppError('OTP expired or not found. Please request a new code.', 400);
  if (record.expires_at < new Date()) {
    await DonorOtp.deleteOne({ _id: record._id });
    throw new AppError('OTP has expired. Please request a new code.', 400);
  }
  if (record.attempts >= 5) throw new AppError('Too many attempts. Please request a new code.', 429);

  const valid = await bcrypt.compare(otp, record.code_hash);
  if (!valid) {
    record.attempts += 1;
    await record.save();
    throw new AppError('Invalid OTP. Please try again.', 401);
  }

  await DonorOtp.deleteOne({ _id: record._id });

  let user = await User.findOne({ phone: normalized });
  const isNewUser = !user;
  if (!user) {
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    user = await User.create({
      name: record.name?.trim() || 'Donor',
      phone: normalized,
      passwordHash,
      role: 'donor',
      status: 'active',
      donor_category: 'public',
      email_verified: false,
    });
  } else {
    if (!user.phone) user.phone = normalized;
    await user.save();
  }

  if (isNewUser) {
    await notifyDonorWelcome(user._id, user.name);
  }

  const token = signToken(user);
  return { user: toApiDoc(user), token, isNewUser };
}

export async function requestDonorEmailOtp(userId: string, email: string) {
  const normalized = normalizeDonorEmail(email);
  if (!isValidDonorEmail(normalized)) {
    throw new AppError('Please enter a valid email address', 400);
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  if (user.role !== 'donor') throw new AppError('Email verification is only for donor accounts', 403);

  const existing = await User.findOne({
    email: normalized,
    _id: { $ne: userId },
  }).lean();
  if (existing) throw new AppError('This email is already registered to another account', 409);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await bcrypt.hash(code, 10);

  await DonorEmailOtp.findOneAndUpdate(
    { user_id: userId },
    {
      email: normalized,
      code_hash: codeHash,
      expires_at: new Date(Date.now() + 15 * 60 * 1000),
      attempts: 0,
    },
    { upsert: true, new: true },
  );

  const subject = 'Verify your email — MS Chellamuthu Trust';
  const html = `
    <p>Dear ${user.name || 'Donor'},</p>
    <p>Your verification code is:</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
    <p>This code is valid for 15 minutes.</p>
    <p>If you did not request this, you can ignore this email.</p>
    <p>Warm regards,<br/>MS Chellamuthu Trust</p>
  `;
  const text = `Your Chellamuthu Connect email verification code is ${code}. Valid for 15 minutes.`;

  const gmailConfigured = Boolean(env.gmailUser && env.gmailAppPassword);
  if (gmailConfigured) {
    try {
      await sendDonorEmail(normalized, subject, html, text);
    } catch (err) {
      if (env.showDevOtp) {
        console.warn('Email OTP delivery failed (dev mode):', err);
      } else {
        throw new AppError('Could not send verification email. Please try again later.', 502);
      }
    }
  } else if (!env.showDevOtp) {
    throw new AppError('Could not send verification email. Please try again later.', 502);
  }

  return {
    success: true,
    message: 'Verification code sent to your email',
    ...(env.showDevOtp ? { devOtp: code } : {}),
  };
}

export async function verifyDonorEmailOtp(userId: string, email: string, otp: string) {
  const normalized = normalizeDonorEmail(email);
  if (!isValidDonorEmail(normalized)) {
    throw new AppError('Please enter a valid email address', 400);
  }

  const record = await DonorEmailOtp.findOne({ user_id: userId }).select('+code_hash');
  if (!record) throw new AppError('Verification code expired or not found. Please request a new code.', 400);
  if (record.email !== normalized) {
    throw new AppError('Email does not match the pending verification request', 400);
  }
  if (record.expires_at < new Date()) {
    await DonorEmailOtp.deleteOne({ _id: record._id });
    throw new AppError('Verification code has expired. Please request a new code.', 400);
  }
  if (record.attempts >= 5) {
    throw new AppError('Too many attempts. Please request a new code.', 429);
  }

  const valid = await bcrypt.compare(otp, record.code_hash);
  if (!valid) {
    record.attempts += 1;
    await record.save();
    throw new AppError('Invalid verification code. Please try again.', 401);
  }

  const existing = await User.findOne({ email: normalized, _id: { $ne: userId } });
  if (existing) throw new AppError('This email is already registered to another account', 409);

  await DonorEmailOtp.deleteOne({ _id: record._id });

  const user = await User.findByIdAndUpdate(
    userId,
    {
      email: normalized,
      email_verified: true,
      email_verified_at: new Date(),
    },
    { new: true },
  );
  if (!user) throw new AppError('User not found', 404);

  let receiptsEmailed = 0;
  try {
    receiptsEmailed = await emailUnsentReceiptsForDonor(userId);
  } catch (err) {
    console.warn('Failed to email unsent receipts after verification:', err);
  }

  return { success: true, user: toApiDoc(user), receipts_emailed: receiptsEmailed };
}

export function sanitizeDonorProfileUpdate(body: Record<string, unknown>): Record<string, unknown> {
  const data = { ...body };
  delete data.email;
  delete data.email_verified;
  delete data.email_verified_at;
  delete data.passwordHash;
  delete data.role;
  delete data.resetToken;
  delete data.resetTokenExpiry;
  return data;
}

export function serializeUserForClient(user: unknown) {
  const doc = toApiDoc(user as never);
  if (!doc) return null;
  if (isPlaceholderDonorEmail(doc.email as string | undefined)) {
    doc.email = null;
    doc.email_verified = false;
  }
  return doc;
}

export async function registerUser(name: string, email: string, password: string, role = 'donor') {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new AppError('This email is already registered. Please sign in instead.');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), passwordHash, role, email_verified: true, email_verified_at: new Date() });
  if (role === 'donor') {
    await notifyDonorWelcome(user._id, user.name);
  }
  const token = signToken(user);
  return { user: toApiDoc(user), token, requiresEmailConfirmation: false };
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
  if (!user) throw new AppError('Invalid email or password', 401);
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid email or password', 401);
  const token = signToken(user);
  return { user: toApiDoc(user), token };
}

export async function createUserByAdmin(data: Record<string, unknown>, _adminId: string) {
  const emailRaw = data.email != null ? String(data.email).toLowerCase().trim() : '';
  const email = emailRaw || undefined;
  if (email) {
    const existing = await User.findOne({ email });
    if (existing) throw new AppError('User with this email already exists');
  }
  const password = data.password ? String(data.password) : `Temp${Date.now().toString(36)}!`;
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email,
    passwordHash,
    name: String(data.name),
    role: data.role || 'donor',
    email_verified: Boolean(email) && !email?.endsWith('@walkin.local'),
    email_verified_at: email && !email.endsWith('@walkin.local') ? new Date() : undefined,
    phone: data.phone,
    trust_id: data.trust_id,
    home_id: data.home_id,
    organization: data.organization,
    donor_category: data.donor_category,
    address: data.address,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    pan_number: data.pan_number,
    aadhar_number: data.aadhar_number,
    requires_80g: data.requires_80g,
    notes: data.notes,
    working_sector: data.working_sector,
    designation: data.designation,
    donor_type: data.donor_type,
    religion: data.religion,
    referred_by: data.referred_by,
  });
  return { success: true, user_id: user.id, email: user.email, message: 'User created successfully' };
}

export async function resetUserPassword(userId: string, password?: string, email?: string) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  if (password) user.passwordHash = await bcrypt.hash(password, 12);
  if (email) user.email = email.toLowerCase().trim();
  await user.save();
  if (password && user.role === 'donor') {
    await notifyDonorAccountSecurity(user._id, 'Your account password was updated by an administrator.');
  }
  return { success: true };
}

export async function requestPasswordReset(email: string) {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+resetToken +resetTokenExpiry');
  if (!user) return { success: true };
  const token = crypto.randomBytes(32).toString('hex');
  user.resetToken = token;
  user.resetTokenExpiry = new Date(Date.now() + 3600000);
  await user.save();
  return { success: true, resetToken: token };
}

export async function resetPasswordWithToken(token: string, password: string) {
  const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } }).select('+resetToken +resetTokenExpiry +passwordHash');
  if (!user) throw new AppError('Invalid or expired reset token', 400);
  user.passwordHash = await bcrypt.hash(password, 12);
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();
  if (user.role === 'donor') {
    await notifyDonorAccountSecurity(user._id, 'Your password was changed successfully. If you did not make this change, contact the trust office immediately.');
  }
  return { success: true };
}

export async function deleteDonor(donorId: string) {
  const { Donation, DonationPayment } = await import('../models/Operations.js');
  const { FoodSlot } = await import('../models/Finance.js');
  const { KindDonation, CorpusFundContribution } = await import('../models/Finance.js');
  const { Task } = await import('../models/Operations.js');

  const donations = await Donation.find({ donor_id: donorId }).select('_id');
  const donationIds = donations.map((d) => d.id);
  if (donationIds.length) await DonationPayment.deleteMany({ donation_id: { $in: donationIds } });
  await Donation.deleteMany({ donor_id: donorId });
  await FoodSlot.deleteMany({ donor_id: donorId });
  await CorpusFundContribution.deleteMany({ donor_id: donorId });
  await KindDonation.deleteMany({ donor_id: donorId });
  await Notification.deleteMany({ user_id: donorId });
  await Task.deleteMany({ related_donor_id: donorId });
  await User.findByIdAndDelete(donorId);
  return { success: true };
}

export async function notifyTaskAssigned(userId: string, taskTitle: string) {
  await Notification.create({
    user_id: userId,
    type: 'task_assigned',
    title: 'New Task Assigned',
    message: `You have been assigned a new task: ${taskTitle}`,
  });
}
