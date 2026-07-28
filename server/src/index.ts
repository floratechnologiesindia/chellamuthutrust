import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { ensureSparseEmailIndex } from './utils/userIndexes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ensureUploadDirs } from './services/storage.service.js';
import { createResourceRouter } from './routes/resource.js';
import authRoutes from './routes/auth.routes.js';
import projectAssignmentRoutes from './routes/projectAssignment.routes.js';
import specialRoutes from './routes/special.routes.js';
import storageRoutes from './routes/storage.routes.js';

import { Trust, Home, Resident, HomePhoto, HomeType, DonorCategory, Religion } from './models/Core.js';
import { Category, Subcategory, SubSubcategory, Need, Donation, Task, Notification } from './models/Operations.js';
import { User } from './models/User.js';
import { KindDonation, CorpusFundContribution, FoodSlot, FoodSlotBookingRequest, FoodSlotPricing, BankTransaction } from './models/Finance.js';
import { HomeEvent, CaseStudy } from './models/HomeContent.js';
import { migratePaidFoodSlots, ensureOutsideFoodPricing } from './services/foodSlot.service.js';
import { startDonorNotificationCron } from './services/donorNotification.cron.js';
import {
  notifyDonorsOfNewNeed,
  notifyDonorsOfNeedFulfilled,
  notifyDonorRecurringEnded,
} from './services/donorNotification.service.js';
import { asyncHandler } from './middleware/asyncHandler.js';
import { razorpayWebhookHandler } from './routes/razorpay.webhook.js';

const app = express();

const allowedOrigins = env.clientUrl.split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Razorpay webhooks require the raw body for signature verification
app.post(
  '/api/razorpay/webhook',
  express.raw({ type: 'application/json' }),
  asyncHandler(razorpayWebhookHandler),
);

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(env.uploadDir));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Auth & special endpoints
app.use('/api/auth', authRoutes);
app.use('/api/project-assignments', projectAssignmentRoutes);
app.use('/api', specialRoutes);
app.use('/api/storage', storageRoutes);

// Resource CRUD routes (mirror Supabase table names)
app.use('/api/trusts', createResourceRouter({ name: 'trusts', model: Trust, filterFields: [], defaultSort: { name: 1 } }));
app.use('/api/homes', createResourceRouter({ name: 'homes', model: Home, filterFields: ['trust_id', 'primary_warden_id'], defaultSort: { name: 1 }, denyWardenWrites: true }));
app.use('/api/residents', createResourceRouter({ name: 'residents', model: Resident, filterFields: ['home_id', 'status'], defaultSort: { name: 1 }, wardenHomeScoped: true }));
app.use('/api/home_photos', createResourceRouter({ name: 'home_photos', model: HomePhoto, filterFields: ['home_id'], defaultSort: { sort_order: 1 }, wardenHomeScoped: true }));
app.use('/api/home_events', createResourceRouter({
  name: 'home_events',
  model: HomeEvent,
  filterFields: ['home_id', 'trust_id', 'status', 'event_type'],
  defaultSort: { event_date: -1 },
  wardenHomeScoped: true,
}));
app.use('/api/case_studies', createResourceRouter({
  name: 'case_studies',
  model: CaseStudy,
  filterFields: ['home_id', 'trust_id', 'status'],
  defaultSort: { created_at: -1 },
  wardenHomeScoped: true,
}));
app.use('/api/home_types', createResourceRouter({ name: 'home_types', model: HomeType, defaultSort: { sort_order: 1 } }));
app.use('/api/donor_categories', createResourceRouter({ name: 'donor_categories', model: DonorCategory, defaultSort: { sort_order: 1 } }));
app.use('/api/religions', createResourceRouter({ name: 'religions', model: Religion, defaultSort: { sort_order: 1 } }));
app.use('/api/categories', createResourceRouter({ name: 'categories', model: Category, defaultSort: { sort_order: 1 } }));
app.use('/api/subcategories', createResourceRouter({ name: 'subcategories', model: Subcategory, filterFields: ['category_id'], defaultSort: { sort_order: 1 } }));
app.use('/api/sub_subcategories', createResourceRouter({ name: 'sub_subcategories', model: SubSubcategory, filterFields: ['subcategory_id'], defaultSort: { sort_order: 1 } }));
app.use('/api/needs', createResourceRouter({
  name: 'needs',
  model: Need,
  filterFields: ['home_id', 'trust_id', 'category_id', 'status', 'date', 'help_mode', 'donation_mode'],
  defaultSort: { date: -1 },
  wardenHomeScoped: true,
  afterCreate: async (doc) => {
    if (doc.status === 'OPEN' || !doc.status) {
      await notifyDonorsOfNewNeed(
        String(doc.id),
        String(doc.home_id),
        String(doc.description || doc.product_name || 'New need'),
        doc.required_amount != null ? Number(doc.required_amount) : undefined,
      );
    }
  },
  afterUpdate: async (doc, previous) => {
    if (doc.status === 'COMPLETED' && previous.status !== 'COMPLETED') {
      await notifyDonorsOfNeedFulfilled(
        String(doc.id),
        String(doc.description || doc.product_name || 'a need'),
        String(doc.home_id),
      );
    }
  },
}));
app.use('/api/donations', createResourceRouter({
  name: 'donations',
  model: Donation,
  filterFields: ['donor_id', 'home_id', 'trust_id', 'need_id', 'status'],
  defaultSort: { created_at: -1 },
  afterCreate: async (doc) => {
    if (doc.need_id) {
      const { recalculateNeedProgress } = await import('./services/needProgress.service.js');
      await recalculateNeedProgress(String(doc.need_id));
    }
  },
  afterUpdate: async (doc, previous) => {
    if (doc.need_id) {
      const { recalculateNeedProgress } = await import('./services/needProgress.service.js');
      await recalculateNeedProgress(String(doc.need_id));
    }
    if (
      doc.donor_id &&
      (doc.status === 'COMPLETED' || doc.status === 'CANCELLED') &&
      previous.status !== doc.status
    ) {
      const { Home } = await import('./models/Core.js');
      const home = await Home.findById(doc.home_id).select('name').lean();
      await notifyDonorRecurringEnded(String(doc.donor_id), {
        homeName: home?.name || 'the home',
        donationId: String(doc.id),
        status: String(doc.status),
      });
    }
  },
}));
app.use('/api/tasks', createResourceRouter({ name: 'tasks', model: Task, filterFields: ['assigned_to', 'trust_id', 'home_id', 'status', 'related_need_id', 'related_donor_id'], defaultSort: { due_date: 1 }, wardenHomeScoped: true }));
app.use('/api/notifications', createResourceRouter({ name: 'notifications', model: Notification, filterFields: ['user_id', 'is_read', 'type'], defaultSort: { created_at: -1 } }));
app.use('/api/kind_donations', createResourceRouter({
  name: 'kind_donations',
  model: KindDonation,
  filterFields: ['donor_id', 'home_id', 'trust_id', 'need_id', 'status'],
  defaultSort: { received_date: -1 },
  wardenHomeScoped: true,
  afterCreate: async (doc) => {
    if (doc.need_id) {
      const { recalculateNeedProgress } = await import('./services/needProgress.service.js');
      await recalculateNeedProgress(String(doc.need_id));
    }
  },
  afterUpdate: async (doc) => {
    if (doc.need_id) {
      const { recalculateNeedProgress } = await import('./services/needProgress.service.js');
      await recalculateNeedProgress(String(doc.need_id));
    }
  },
}));
app.use('/api/corpus_fund_contributions', createResourceRouter({ name: 'corpus_fund_contributions', model: CorpusFundContribution, filterFields: ['donor_id', 'trust_id'], defaultSort: { contribution_date: -1 } }));
app.use('/api/food_slots', createResourceRouter({ name: 'food_slots', model: FoodSlot, filterFields: ['home_id', 'trust_id', 'donor_id', 'date', 'status'], defaultSort: { date: 1 }, wardenHomeScoped: true }));
app.use('/api/food_slot_booking_requests', createResourceRouter({ name: 'food_slot_booking_requests', model: FoodSlotBookingRequest, filterFields: ['home_id', 'trust_id', 'donor_id', 'status'], defaultSort: { created_at: -1 }, publicRead: false, wardenHomeScoped: true }));
app.use('/api/food_slot_pricing', createResourceRouter({ name: 'food_slot_pricing', model: FoodSlotPricing, defaultSort: { time_slot: 1 } }));
app.use('/api/bank_transactions', createResourceRouter({ name: 'bank_transactions', model: BankTransaction, filterFields: ['trust_id', 'reconciliation_status'], defaultSort: { transaction_date: -1 } }));

// Alias profiles to users for compatibility
app.use('/api/profiles', createResourceRouter({ name: 'profiles', model: User, filterFields: ['role', 'trust_id', 'home_id', 'status'], defaultSort: { name: 1 } }));

app.use(errorHandler);

async function start() {
  ensureUploadDirs();
  await connectDatabase();
  await ensureSparseEmailIndex();
  const migrated = await migratePaidFoodSlots();
  if (migrated > 0) console.log(`Migrated ${migrated} legacy PAID food slots to BOOKED + FULLY_PAID`);
  if (await ensureOutsideFoodPricing()) console.log('Ensured OUTSIDE_FOOD slot pricing');
  startDonorNotificationCron();
  app.listen(env.port, () => {
    console.log(`API server running on port ${env.port} (${env.nodeEnv})`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
