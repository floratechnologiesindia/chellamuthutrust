import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { createRazorpayOrder, verifyRazorpayPayment } from '../services/razorpay.service.js';
import { normalizePhone } from '../services/auth.service.js';
import { User } from '../models/User.js';
import { sendDonorEmail, sendWhatsApp, listWatiTemplates } from '../services/integrations.service.js';
import { completeDonationPayment, completeFoodSlotPayment } from '../services/payment.service.js';
import {
  createFoodSlotBookingRequest,
  approveBookingRequest,
  rejectBookingRequest,
  listFoodSlotBookingRequests,
  confirmFoodSlotBooking,
} from '../services/foodSlotBookingRequest.service.js';
import { authorize } from '../middleware/auth.js';
import { assertWardenCanAccessHome, getWardenAssignedHomeIds } from '../middleware/wardenScope.js';
import { AppError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';
import { notifyDonorPaymentFailed } from '../services/donorNotification.service.js';
import { sanitizeDonorProfileUpdate, serializeUserForClient } from '../services/auth.service.js';
import {
  listDonorReceipts,
  getDonorReceipt,
  getDonorReceiptByReference,
} from '../services/receipt.service.js';
import { sendReceiptEmailById } from '../services/receiptEmail.service.js';
import { Donation, DonationPayment } from '../models/Operations.js';
import { FoodSlot } from '../models/Finance.js';
import { toApiDoc } from '../utils/serializers.js';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';

const router = Router();

router.post('/create-razorpay-order', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    amount,
    donation_id,
    donor_name,
    donor_email,
    donor_phone,
    food_slot_id,
    home_id,
    trust_id,
    date,
    time_slot,
    occasion_type,
    occasion_note,
    recurring_frequency,
    donation_for,
    event_date,
    donor_board_name,
  } = req.body;

  const dbUser = await User.findById(req.userId).select('name email phone').lean();
  const resolvedPhone = normalizePhone(String(donor_phone || dbUser?.phone || ''));
  const resolvedName = String(donor_name || dbUser?.name || '').trim();
  const resolvedEmail = String(donor_email || dbUser?.email || '').trim();

  const result = await createRazorpayOrder(amount, {
    donation_id,
    donor_id: req.userId,
    donor_name: resolvedName,
    donor_email: resolvedEmail,
    food_slot_id,
    home_id,
    trust_id,
    date,
    time_slot,
    purpose: home_id ? 'food_slot' : donation_id ? 'donation' : undefined,
    occasion_type,
    occasion_note,
    recurring_frequency,
    donation_for,
    event_date,
    donor_board_name,
  });

  res.json({
    ...result,
    donor_name: resolvedName,
    donor_email: resolvedEmail,
    donor_phone: resolvedPhone,
  });
}));

router.post('/verify-razorpay-payment', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await verifyRazorpayPayment(req.body, req.userId);
  res.json(result);
}));

router.post('/send-donor-report', asyncHandler(async (req, res: Response) => {
  const { to, subject, html, text } = req.body;
  const result = await sendDonorEmail(to, subject, html, text);
  res.json(result);
}));

router.post('/send-whatsapp', asyncHandler(async (req, res: Response) => {
  const { phone, message, templateName } = req.body;
  const result = await sendWhatsApp(phone, message, templateName);
  res.json(result);
}));

router.get('/wati-templates', asyncHandler(async (_req, res: Response) => {
  const templates = await listWatiTemplates();
  res.json(templates);
}));

router.get('/donors', authenticate, asyncHandler(async (_req, res: Response) => {
  const donors = await User.find({ role: 'donor' }).select('-passwordHash').lean();
  const donorIds = donors.map((d) => d._id);
  const [donations, foodSlots] = await Promise.all([
    Donation.find({ donor_id: { $in: donorIds } }).select('donor_id amount_pledged created_at').lean(),
    FoodSlot.find({ donor_id: { $in: donorIds } }).select('donor_id amount created_at').lean(),
  ]);
  const statsMap: Record<string, { total_donations_amount: number; total_donations_count: number; total_food_slots_amount: number; total_food_slots_count: number; last_interaction: string | null }> = {};
  for (const id of donorIds) statsMap[id] = { total_donations_amount: 0, total_donations_count: 0, total_food_slots_amount: 0, total_food_slots_count: 0, last_interaction: null };
  const lastTimes: Record<string, number> = {};
  for (const d of donations) {
    const s = statsMap[d.donor_id]; if (!s) continue;
    s.total_donations_amount += Number(d.amount_pledged) || 0;
    s.total_donations_count += 1;
    const t = d.created_at ? new Date(d.created_at).getTime() : 0;
    if (t > (lastTimes[d.donor_id] || 0)) lastTimes[d.donor_id] = t;
  }
  for (const f of foodSlots) {
    if (!f.donor_id) continue;
    const s = statsMap[f.donor_id]; if (!s) continue;
    s.total_food_slots_amount += Number(f.amount) || 0;
    s.total_food_slots_count += 1;
    const t = f.created_at ? new Date(f.created_at).getTime() : 0;
    if (t > (lastTimes[f.donor_id] || 0)) lastTimes[f.donor_id] = t;
  }
  for (const id of Object.keys(lastTimes)) {
    if (statsMap[id] && lastTimes[id] > 0) statsMap[id].last_interaction = new Date(lastTimes[id]).toISOString();
  }
  const result = donors.map((p) => ({ ...p, id: p._id, ...(statsMap[p._id] || {}) }));
  res.json(result);
}));

router.get('/users', authenticate, asyncHandler(async (req, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.trust_id) filter.trust_id = req.query.trust_id;
  if (req.query.home_id) filter.home_id = req.query.home_id;
  const users = await User.find(filter).select('-passwordHash').sort({ name: 1 }).lean();
  const { Home, Trust } = await import('../models/Core.js');
  const { ProjectAssignment } = await import('../models/ProjectAssignment.js');

  const wardenIds = users.filter((u) => u.role === 'warden').map((u) => u._id);
  const assignmentRows = wardenIds.length
    ? await ProjectAssignment.find({ user_id: { $in: wardenIds } }).lean()
    : [];
  const assignmentHomeIds = [...new Set(assignmentRows.map((a) => a.home_id))];

  const homeIds = [...new Set([
    ...users.map((u) => u.home_id).filter(Boolean),
    ...assignmentHomeIds,
  ])] as string[];
  const trustIds = [...new Set(users.map((u) => u.trust_id).filter(Boolean))] as string[];
  const [homes, trusts] = await Promise.all([
    Home.find({ _id: { $in: homeIds } }).select('_id name city').lean(),
    Trust.find({ _id: { $in: trustIds } }).select('_id name').lean(),
  ]);
  const homeMap = Object.fromEntries(homes.map((h) => [h._id, h]));
  const trustMap = Object.fromEntries(trusts.map((t) => [t._id, t.name]));

  const assignmentsByUser = new Map<string, typeof assignmentRows>();
  for (const row of assignmentRows) {
    const list = assignmentsByUser.get(row.user_id) || [];
    list.push(row);
    assignmentsByUser.set(row.user_id, list);
  }

  res.json(users.map((u) => {
    const userAssignments = assignmentsByUser.get(u._id) || [];
    const assignedProjects = userAssignments.map((a) => ({
      home_id: a.home_id,
      is_primary: a.is_primary,
      name: homeMap[a.home_id]?.name || null,
      city: homeMap[a.home_id]?.city || null,
    }));
    const primaryAssignment = userAssignments.find((a) => a.is_primary) || userAssignments[0];
    const legacyHomeName = u.home_id ? homeMap[u.home_id]?.name || null : null;

    return {
      ...u,
      id: u._id,
      home_name: primaryAssignment
        ? homeMap[primaryAssignment.home_id]?.name || legacyHomeName
        : legacyHomeName,
      trust_name: u.trust_id ? trustMap[u.trust_id] || null : null,
      assigned_projects: assignedProjects,
      assigned_project_names: assignedProjects.map((p) => p.name).filter(Boolean),
    };
  }));
}));

router.get('/profiles/:id', authenticate, asyncHandler(async (req, res: Response) => {
  const user = await User.findById(req.params.id).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(serializeUserForClient(user) || toApiDoc(user));
}));

router.patch('/profiles/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.params.id !== req.userId && !['super_admin', 'admin'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const updateBody = req.user?.role === 'donor' && req.params.id === req.userId
    ? sanitizeDonorProfileUpdate(req.body as Record<string, unknown>)
    : { ...req.body };
  if (req.user?.role === 'warden') {
    delete updateBody.home_id;
    delete updateBody.trust_id;
    delete updateBody.role;
  }
  const user = await User.findByIdAndUpdate(req.params.id, updateBody, { new: true }).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(serializeUserForClient(user) || toApiDoc(user));
}));

router.get('/user-roles', authenticate, asyncHandler(async (req, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.role) {
    const roles = String(req.query.role).split(',').map((s) => s.trim()).filter(Boolean);
    filter.role = roles.length > 1 ? { $in: roles } : roles[0];
  }
  const users = await User.find(filter).select('_id role');
  res.json(users.map((u) => ({ user_id: u._id, role: u.role })));
}));

router.get('/user-roles/:userId', authenticate, asyncHandler(async (req, res: Response) => {
  const user = await User.findById(req.params.userId).select('role');
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ role: user.role });
}));

router.post('/bulk-upload-donors', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { donors, homeId, trustId } = req.body;
  let created = 0;
  for (const donor of donors || []) {
    const email = donor.email || `donor_${(donor.phone || Date.now().toString()).replace(/[^0-9]/g, '')}@chellamuthu.local`;
    const existing = await User.findOne({ email });
    if (existing) continue;
    const passwordHash = await bcrypt.hash('changeme123', 12);
    await User.create({
      email, passwordHash, name: donor.name, phone: donor.phone, role: 'donor',
      organization: donor.organization, donor_category: donor.donor_category,
      address: donor.address, city: donor.city, state: donor.state, pincode: donor.pincode,
      pan_number: donor.pan_number, trust_id: trustId, home_id: homeId,
    });
    created++;
  }
  res.json({ success: true, created });
}));

router.post('/bulk-upload-donors/file', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  res.status(501).json({ error: 'Use JSON bulk-upload-donors endpoint' });
}));

router.get('/analytics/dashboard', authenticate, asyncHandler(async (_req, res: Response) => {
  const { Need, Donation, Task } = await import('../models/Operations.js');
  const { Home, Trust } = await import('../models/Core.js');
  const [totalDonations, activeNeeds, completedTasks, totalHomes, totalTrusts, totalDonors] = await Promise.all([
    Donation.aggregate([{ $group: { _id: null, total: { $sum: '$amount_pledged' }, count: { $sum: 1 } } }]),
    Need.countDocuments({ status: { $in: ['OPEN', 'PARTIAL'] } }),
    Task.countDocuments({ status: 'COMPLETED' }),
    Home.countDocuments(),
    Trust.countDocuments(),
    User.countDocuments({ role: 'donor' }),
  ]);
  res.json({
    total_donation_amount: totalDonations[0]?.total || 0,
    total_donations: totalDonations[0]?.count || 0,
    active_needs: activeNeeds,
    completed_tasks: completedTasks,
    total_homes: totalHomes,
    total_trusts: totalTrusts,
    total_donors: totalDonors,
  });
}));

router.get('/reports/data', authenticate, asyncHandler(async (req, res: Response) => {
  const { homeId, trustId, startDate, endDate } = req.query as Record<string, string>;
  const { Need, Donation, Task } = await import('../models/Operations.js');
  const { KindDonation, CorpusFundContribution } = await import('../models/Finance.js');
  const filter: Record<string, unknown> = {};
  if (homeId) filter.home_id = homeId;
  if (trustId) filter.trust_id = trustId;
  const dateFilter = startDate && endDate ? { $gte: startDate, $lte: endDate } : undefined;
  const [donations, needs, tasks, kindDonations, corpus] = await Promise.all([
    Donation.find({ ...filter, ...(dateFilter ? { start_date: dateFilter } : {}) }).lean(),
    Need.find(filter).lean(),
    Task.find(filter).lean(),
    KindDonation.find(filter).lean(),
    CorpusFundContribution.find(trustId ? { trust_id: trustId } : {}).lean(),
  ]);
  res.json({
    donations: donations.map((d) => ({ ...d, id: d._id })),
    needs: needs.map((n) => ({ ...n, id: n._id })),
    tasks: tasks.map((t) => ({ ...t, id: t._id })),
    kind_donations: kindDonations.map((k) => ({ ...k, id: k._id })),
    corpus_fund: corpus.map((c) => ({ ...c, id: c._id })),
  });
}));

router.get('/donation-payments', authenticate, asyncHandler(async (req, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.donation_id) {
    const ids = String(req.query.donation_id).split(',').map((id) => id.trim()).filter(Boolean);
    if (ids.length === 1) filter.donation_id = ids[0];
    else if (ids.length > 1) filter.donation_id = { $in: ids };
  }
  const sortField = req.query.sort === 'payment_date' ? 'payment_date' : 'created_at';
  const sortOrder = req.query.order === 'asc' ? 1 : -1;
  const payments = await DonationPayment.find(filter).sort({ [sortField]: sortOrder }).lean();
  res.json(payments.map((p) => ({ ...p, id: p._id })));
}));

router.post('/donation-payments', authenticate, asyncHandler(async (req, res: Response) => {
  const payment = await DonationPayment.create(req.body);
  res.status(201).json(toApiDoc(payment as never));
}));

router.get('/recurring-donations', authenticate, asyncHandler(async (req, res: Response) => {
  const filter: Record<string, unknown> = { sponsorship_type: 'RECURRING' };
  if (req.query.donor_id) filter.donor_id = req.query.donor_id;
  const donations = await Donation.find(filter).lean();
  res.json(donations.map((d) => ({ ...d, id: d._id })));
}));

router.get('/upcoming-donations', authenticate, asyncHandler(async (req, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  const donations = await Donation.find({
    sponsorship_type: 'RECURRING',
    status: { $in: ['ACTIVE', 'PLEDGED'] },
    next_due_date: { $gte: today },
    ...(req.query.donor_id ? { donor_id: req.query.donor_id } : {}),
  }).lean();
  res.json(donations.map((d) => ({ ...d, id: d._id })));
}));

router.get('/donor-category-stats/:donorId', authenticate, asyncHandler(async (req, res: Response) => {
  const donorId = req.params.donorId;
  const { KindDonation, CorpusFundContribution } = await import('../models/Finance.js');
  const [donations, foodSlots, corpus, kind] = await Promise.all([
    Donation.find({ donor_id: donorId }).lean(),
    FoodSlot.find({ donor_id: donorId }).lean(),
    CorpusFundContribution.find({ donor_id: donorId }).lean(),
    KindDonation.find({ donor_id: donorId }).lean(),
  ]);
  res.json({ donations, food_slots: foodSlots, corpus_fund: corpus, kind_donations: kind });
}));

/** Development / manual payment simulation until Razorpay is integrated */
router.post('/manual/complete-donation', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!env.manualPaymentsEnabled) return res.status(403).json({ error: 'Manual payments are disabled' });
  const { donation_id: donationId } = req.body;
  if (!donationId) return res.status(400).json({ error: 'donation_id is required' });
  const result = await completeDonationPayment(donationId, req.userId!);
  res.json(result);
}));

router.post('/manual/complete-food-slot', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!env.manualPaymentsEnabled) return res.status(403).json({ error: 'Manual payments are disabled' });
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
  } = req.body;
  if (req.user?.role === 'warden') {
    await assertWardenCanAccessHome(req, homeId);
  }
  const result = await completeFoodSlotPayment(req.userId!, {
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
  });
  res.json(result);
}));

router.get('/food-recurring-pledges', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { home_id, trust_id, donor_id, status } = req.query as Record<string, string>;
  const {
    listFoodRecurringPledges,
  } = await import('../services/foodRecurringPledge.service.js');
  const user = req.user;
  const isStaff = ['warden', 'admin', 'super_admin'].includes(user?.role || '');

  const filters: {
    donorId?: string;
    homeId?: string;
    trustId?: string;
    status?: string;
    homeIds?: string[];
  } = {};

  if (status) filters.status = status;
  if (trust_id) filters.trustId = trust_id;

  if (!isStaff) {
    filters.donorId = req.userId!;
  } else if (donor_id) {
    filters.donorId = donor_id;
  }

  if (user?.role === 'warden') {
    const assigned = await getWardenAssignedHomeIds(req);
    if (!assigned?.length) return res.json([]);
    if (home_id) {
      if (!assigned.includes(home_id)) throw new AppError('Forbidden: not assigned to this project', 403);
      filters.homeId = home_id;
    } else {
      filters.homeIds = assigned;
    }
  } else if (home_id) {
    filters.homeId = home_id;
  }

  const results = await listFoodRecurringPledges(filters);
  res.json(results);
}));

router.patch('/food-recurring-pledges/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.body as { status?: string };
  if (!status || !['ACTIVE', 'PAUSED', 'CANCELLED'].includes(status)) {
    return res.status(400).json({ error: 'status must be ACTIVE, PAUSED, or CANCELLED' });
  }
  const {
    updateFoodRecurringPledgeStatus,
  } = await import('../services/foodRecurringPledge.service.js');
  const isStaff = ['warden', 'admin', 'super_admin'].includes(req.user?.role || '');

  if (isStaff && req.user?.role === 'warden') {
    const { FoodRecurringPledge } = await import('../models/Finance.js');
    const pledge = await FoodRecurringPledge.findById(req.params.id).select('home_id').lean();
    if (!pledge) return res.status(404).json({ error: 'Not found' });
    await assertWardenCanAccessHome(req, pledge.home_id);
  }

  const result = await updateFoodRecurringPledgeStatus(
    req.params.id,
    req.userId!,
    status as 'ACTIVE' | 'PAUSED' | 'CANCELLED',
    { isStaff },
  );
  res.json(result);
}));

router.post('/food-slot-booking-requests', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { home_id, trust_id, date, time_slot, amount, food_slot_id, notes } = req.body;
  if (!home_id || !trust_id || !date || !time_slot || amount == null) {
    return res.status(400).json({ error: 'home_id, trust_id, date, time_slot, and amount are required' });
  }
  const result = await createFoodSlotBookingRequest(req.userId!, {
    home_id,
    trust_id,
    date,
    time_slot,
    amount,
    food_slot_id,
    notes,
  });
  res.status(201).json(result);
}));

router.get('/food-slot-booking-requests', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { home_id, trust_id, donor_id, status } = req.query as Record<string, string>;
  const user = req.user;
  const isStaff = ['warden', 'admin', 'super_admin'].includes(user?.role);
  const filters: Record<string, string> = {};
  if (trust_id) filters.trust_id = trust_id;
  if (status) filters.status = status;
  if (donor_id) filters.donor_id = donor_id;
  else if (!isStaff) filters.donor_id = req.userId!;

  if (user?.role === 'warden') {
    const assigned = await getWardenAssignedHomeIds(req);
    if (!assigned?.length) {
      return res.json([]);
    }
    if (home_id) {
      if (!assigned.includes(home_id)) throw new AppError('Forbidden: not assigned to this project', 403);
      filters.home_id = home_id;
    } else {
      filters.home_ids = assigned.join(',');
    }
  } else if (home_id) {
    filters.home_id = home_id;
  }

  const results = await listFoodSlotBookingRequests(filters);
  res.json(results);
}));

router.post(
  '/food-slot-booking-requests/:id/confirm',
  authenticate,
  authorize('warden', 'admin', 'super_admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { payment_status, amount_paid, payment_mode } = req.body;
    if (!payment_status) return res.status(400).json({ error: 'payment_status is required' });
    if (req.user?.role === 'warden') {
      const { FoodSlotBookingRequest } = await import('../models/Finance.js');
      const request = await FoodSlotBookingRequest.findById(req.params.id).select('home_id').lean();
      if (!request) return res.status(404).json({ error: 'Not found' });
      await assertWardenCanAccessHome(req, request.home_id);
    }
    const result = await approveBookingRequest(req.params.id, req.userId!, {
      payment_status,
      amount_paid,
      payment_mode,
    });
    res.json(result);
  }),
);

router.post(
  '/food-slot-booking-requests/:id/reject',
  authenticate,
  authorize('warden', 'admin', 'super_admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { reason } = req.body;
    if (req.user?.role === 'warden') {
      const { FoodSlotBookingRequest } = await import('../models/Finance.js');
      const request = await FoodSlotBookingRequest.findById(req.params.id).select('home_id').lean();
      if (!request) return res.status(404).json({ error: 'Not found' });
      await assertWardenCanAccessHome(req, request.home_id);
    }
    const result = await rejectBookingRequest(req.params.id, reason);
    res.json(result);
  }),
);

router.post('/donor-notifications/payment-failed', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { description, amount } = req.body;
  if (!description) return res.status(400).json({ error: 'description is required' });
  await notifyDonorPaymentFailed(req.userId!, { description, amount });
  res.json({ success: true });
}));

router.get('/donor/receipts', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const receipts = await listDonorReceipts(req.userId!);
  res.json(receipts);
}));

router.get('/donor/receipts/by-reference/:referenceKey', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const referenceKey = decodeURIComponent(req.params.referenceKey);
  const receipt = await getDonorReceiptByReference(req.userId!, referenceKey);
  if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
  res.json(receipt);
}));

router.get('/donor/receipts/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const receipt = await getDonorReceipt(req.userId!, req.params.id);
  if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
  res.json(receipt);
}));

router.post('/donor/receipts/:id/email', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const emailed = await sendReceiptEmailById(req.userId!, req.params.id);
  if (!emailed) {
    return res.status(400).json({
      error: 'Could not email receipt. Verify your email in My Account or try again later.',
    });
  }
  res.json({ success: true, message: 'Receipt emailed successfully' });
}));

router.post(
  '/food-slots/:id/confirm-booking',
  authenticate,
  authorize('warden', 'admin', 'super_admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { payment_status, amount_paid, payment_mode } = req.body;
    if (!payment_status) return res.status(400).json({ error: 'payment_status is required' });
    if (req.user?.role === 'warden') {
      const slot = await FoodSlot.findById(req.params.id).select('home_id').lean();
      if (!slot) return res.status(404).json({ error: 'Not found' });
      await assertWardenCanAccessHome(req, slot.home_id);
    }
    const result = await confirmFoodSlotBooking(req.params.id, req.userId!, {
      payment_status,
      amount_paid,
      payment_mode,
    });
    res.json(result);
  }),
);

router.get(
  '/warden/dashboard-stats',
  authenticate,
  authorize('warden', 'admin', 'super_admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const homeId = String(req.query.homeId || '');
    if (!homeId) throw new AppError('homeId is required', 400);
    if (req.user?.role === 'warden') await assertWardenCanAccessHome(req, homeId);
    const period = (String(req.query.period || 'month') as 'month' | 'quarter' | 'year' | 'custom');
    const { resolvePeriodRange, getWardenDashboardStats } = await import('../services/wardenDashboard.service.js');
    const { start, end } = resolvePeriodRange(period, req.query.startDate as string, req.query.endDate as string);
    const stats = await getWardenDashboardStats(homeId, start, end);
    res.json(stats);
  }),
);

router.get(
  '/warden/task-bar',
  authenticate,
  authorize('warden', 'admin', 'super_admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const homeId = String(req.query.homeId || '');
    if (!homeId) throw new AppError('homeId is required', 400);
    if (req.user?.role === 'warden') await assertWardenCanAccessHome(req, homeId);
    const { getDerivedTaskBar } = await import('../services/wardenTaskBar.service.js');
    const items = await getDerivedTaskBar(homeId);
    res.json({ items });
  }),
);

router.patch(
  '/warden/homes/:homeId/profile',
  authenticate,
  authorize('warden', 'admin', 'super_admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const homeId = req.params.homeId;
    if (req.user?.role === 'warden') await assertWardenCanAccessHome(req, homeId);
    const { Home } = await import('../models/Core.js');
    const home = await Home.findById(homeId);
    if (!home) throw new AppError('Project not found', 404);

    // Deliberately excludes name, type, trust_id and primary_warden_id — those stay admin-owned.
    const allowed = [
      'description',
      'facilities',
      'contact_details',
      'capacity_children_male',
      'capacity_children_female',
      'capacity_elderly_male',
      'capacity_elderly_female',
      'image_url',
      'supported_by',
      'year_established',
      'address',
      'city',
      'state',
      'country',
      'pincode',
    ] as const;
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        (home as unknown as Record<string, unknown>)[key] = req.body[key];
      }
    }
    await home.save();
    res.json({ ...home.toObject(), id: home._id });
  }),
);

router.post(
  '/food-slots/:id/thank-you',
  authenticate,
  authorize('warden', 'admin', 'super_admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const slot = await FoodSlot.findById(req.params.id).select('home_id').lean();
    if (!slot) throw new AppError('Not found', 404);
    if (req.user?.role === 'warden') await assertWardenCanAccessHome(req, slot.home_id);
    const { sendFoodThankYouLetter } = await import('../services/foodThankYou.service.js');
    const result = await sendFoodThankYouLetter(req.params.id);
    res.json(result);
  }),
);

router.post(
  '/food-slots/:id/share-photos',
  authenticate,
  authorize('warden', 'admin', 'super_admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const slot = await FoodSlot.findById(req.params.id).select('home_id').lean();
    if (!slot) throw new AppError('Not found', 404);
    if (req.user?.role === 'warden') await assertWardenCanAccessHome(req, slot.home_id);
    const { shareFoodEventPhotos } = await import('../services/foodThankYou.service.js');
    const result = await shareFoodEventPhotos(req.params.id);
    res.json(result);
  }),
);

export default router;
