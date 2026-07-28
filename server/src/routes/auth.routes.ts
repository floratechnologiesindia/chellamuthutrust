import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate, authorize, AuthRequest, signToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  registerUser, loginUser, createUserByAdmin, resetUserPassword,
  requestPasswordReset, resetPasswordWithToken, deleteDonor,
  requestDonorOtp, verifyDonorOtp,
  requestDonorEmailOtp, verifyDonorEmailOtp,
  serializeUserForClient,
} from '../services/auth.service.js';
import { toApiDoc } from '../utils/serializers.js';
import { User } from '../models/User.js';
import { listAssignmentsForUser, resolvePrimarySocialWorkerIdForHome } from '../services/projectAssignment.service.js';

const router = Router();

router.post('/register', asyncHandler(async (req, res: Response) => {
  const { name, email, password } = req.body;
  const result = await registerUser(name, email, password);
  res.json(result);
}));

router.post('/login', asyncHandler(async (req, res: Response) => {
  const { email, password } = req.body;
  const result = await loginUser(email, password);
  res.json(result);
}));

router.post('/otp/request', asyncHandler(async (req, res: Response) => {
  const { name, phone } = req.body;
  if (!phone?.trim()) throw new AppError('WhatsApp number is required', 400);
  const result = await requestDonorOtp(phone, name);
  res.json(result);
}));

router.post('/otp/verify', asyncHandler(async (req, res: Response) => {
  const { phone, otp } = req.body;
  if (!phone?.trim() || !otp?.trim()) throw new AppError('Phone and OTP are required', 400);
  const result = await verifyDonorOtp(phone, otp);
  res.json({
    token: result.token,
    user: {
      ...(serializeUserForClient(result.user as never) || result.user),
      is_new_user: result.isNewUser,
    },
  });
}));

router.post('/email-otp/request', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email } = req.body;
  if (!email?.trim()) throw new AppError('Email is required', 400);
  const result = await requestDonorEmailOtp(req.userId!, email);
  res.json(result);
}));

router.post('/email-otp/verify', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, otp } = req.body;
  if (!email?.trim() || !otp?.trim()) throw new AppError('Email and verification code are required', 400);
  const result = await verifyDonorEmailOtp(req.userId!, email, otp);
  res.json({
    success: true,
    user: serializeUserForClient(result.user as never) || result.user,
    receipts_emailed: result.receipts_emailed ?? 0,
  });
}));

router.post('/forgot-password', asyncHandler(async (req, res: Response) => {
  const result = await requestPasswordReset(req.body.email);
  res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
}));

router.post('/reset-password', asyncHandler(async (req, res: Response) => {
  const { token, password } = req.body;
  await resetPasswordWithToken(token, password);
  res.json({ success: true });
}));

router.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = serializeUserForClient(req.user!) || toApiDoc(req.user!);
  if (req.user?.role === 'warden' && user) {
    const assignments = await listAssignmentsForUser(req.userId!);
    user.assigned_projects = assignments;
    user.assigned_project_ids = assignments.map((a) => a.home_id);
  }
  res.json(user);
}));

router.post('/create-user', authenticate, authorize('super_admin', 'admin', 'warden'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const requestedRole = String(req.body?.role || 'donor');
  if (req.user?.role !== 'super_admin' && requestedRole !== 'donor') {
    throw new AppError('Only super admins can create non-donor users', 403);
  }
  const result = await createUserByAdmin(req.body, req.userId!);
  res.json(result);
}));

router.post('/reset-user-password', authenticate, authorize('super_admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId, password, email } = req.body;
  const result = await resetUserPassword(userId, password, email);
  res.json(result);
}));

router.post('/delete-donor', authenticate, authorize('super_admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { donorId } = req.body;
  if (!donorId) throw new AppError('donorId is required');
  const result = await deleteDonor(donorId);
  res.json(result);
}));

router.post('/impersonate-home', authenticate, authorize('super_admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const homeId = req.body.homeId || req.body.home_id;
  if (!homeId) throw new AppError('home_id is required', 400);

  const wardenId = await resolvePrimarySocialWorkerIdForHome(String(homeId));
  if (!wardenId) throw new AppError('Project has no social worker assigned', 400);

  const warden = await User.findById(wardenId);
  if (!warden) throw new AppError('Social worker not found', 404);

  const home = await (await import('../models/Core.js')).Home.findById(homeId).select('name').lean();
  const token = signToken(warden);
  res.json({
    success: true,
    token,
    email: warden.email,
    home_name: home?.name,
    redirect_url: `${process.env.CLIENT_URL || 'http://localhost:8080'}/warden`,
  });
}));

export default router;
