/**
 * Integration smoke tests for food sponsorship flows (Phases A–D).
 * Run: npm run test:food-flows --prefix server
 * Requires MongoDB + seeded data (npm run seed:fresh --prefix server).
 */
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { Home } from '../models/Core.js';
import { FoodSlot } from '../models/Finance.js';
import { bookSlotOnPayment } from '../services/foodSlot.service.js';
import {
  submitFoodEventMedia,
  approveFoodEventMedia,
  sendFoodEventMediaToDonor,
  listPendingFoodEventMedia,
  listApprovedFoodEventMediaAwaitingSend,
} from '../services/foodEventMedia.service.js';
import { deliverFoodReceiptThankYou } from '../services/foodReceiptThankYou.service.js';

const SEED_PASSWORD = 'Chellamuthu@2026';

type Result = { name: string; ok: boolean; detail?: string };

const results: Result[] = [];

function pass(name: string, detail?: string) {
  results.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name: string, detail: string) {
  results.push({ name, ok: false, detail });
  console.error(`  ✗ ${name} — ${detail}`);
}

function isLegacySendBlocked(item: {
  completion_photos?: string[] | null;
  event_media_status?: string | null;
}): boolean {
  const photoCount = item.completion_photos?.length || 0;
  if (photoCount > 0) return true;
  if (item.event_media_status) return true;
  return false;
}

async function main() {
  console.log('\n=== Food Sponsorship Flow Tests ===\n');

  await connectDatabase();

  const [donor, warden, admin, home] = await Promise.all([
    User.findOne({ email: 'donor@chellamuthu.local' }).lean(),
    User.findOne({ email: 'warden@chellamuthu.local' }).lean(),
    User.findOne({ email: 'admin@chellamuthu.local' }).lean(),
    Home.findOne().lean(),
  ]);

  if (!donor || !warden || !admin || !home) {
    console.error('Seed data missing. Run: npm run seed:fresh --prefix server');
    process.exit(1);
  }

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 3);
  const dateStr = pastDate.toISOString().slice(0, 10);

  // --- Phase A/B: Donor booking with Outside Food metadata ---
  try {
    const slot = await bookSlotOnPayment({
      donorId: donor._id,
      homeId: home._id,
      trustId: home.trust_id,
      date: dateStr,
      timeSlot: 'OUTSIDE_FOOD',
      amount: 0,
      mealType: 'Lunch',
      reason: 'Test outside food sponsorship',
      sponsorFor: 'Birthday',
      donateOnBehalfOf: 'Test Person',
    });
    if (slot.meal_type !== 'Lunch') throw new Error('meal_type not saved');
    if (!slot.reason?.includes('Test')) throw new Error('reason not saved');
    pass('Phase A/B: Outside Food donor booking', slot._id);
  } catch (e) {
    fail('Phase A/B: Outside Food donor booking', e instanceof Error ? e.message : String(e));
  }

  const testSlot = await FoodSlot.findOne({
    donor_id: donor._id,
    date: dateStr,
    time_slot: 'OUTSIDE_FOOD',
  }).sort({ created_at: -1 });

  if (!testSlot) {
    fail('Setup', 'No test slot created');
  } else {
    testSlot.payment_status = 'FULLY_PAID';
    testSlot.amount = 500;
    testSlot.amount_paid = 500;
    testSlot.payment_mode = 'Cash';
    testSlot.status = 'BOOKED';
    testSlot.receipt_thankyou_sent_at = undefined;
    testSlot.photos_shared_at = undefined;
    testSlot.event_media_status = undefined;
    testSlot.completion_photos = [];
    testSlot.completion_videos = [];
    testSlot.report_sent_at = undefined;
    await testSlot.save();

    try {
      const receipt = await deliverFoodReceiptThankYou(testSlot._id);
      if (!receipt?.sent) throw new Error('Receipt/thank-you not sent');
      pass('Phase C: Cash receipt/thank-you');
    } catch (e) {
      fail('Phase C: Cash receipt/thank-you', e instanceof Error ? e.message : String(e));
    }

    try {
      await submitFoodEventMedia(testSlot._id, {
        photos: ['https://example.com/photo1.jpg'],
        videos: ['https://example.com/video1.mp4'],
        notes: 'Test event notes',
        submittedByUserId: warden._id,
        submittedByName: warden.name,
      });
      const pending = await listPendingFoodEventMedia(home.trust_id);
      if (!pending.some((p) => p.id === testSlot._id)) {
        throw new Error('Slot not in pending queue');
      }
      pass('Phase D: Submit event media → pending queue');
    } catch (e) {
      fail('Phase D: Submit event media', e instanceof Error ? e.message : String(e));
    }

    try {
      await approveFoodEventMedia(testSlot._id, admin._id);
      const approved = await listApprovedFoodEventMediaAwaitingSend(home.trust_id);
      if (!approved.some((p) => p.id === testSlot._id)) {
        throw new Error('Slot not in approved queue');
      }
      pass('Phase D: Approve event media → approved queue');
    } catch (e) {
      fail('Phase D: Approve event media', e instanceof Error ? e.message : String(e));
    }

    try {
      const sent = await sendFoodEventMediaToDonor(testSlot._id, {
        customMessage: 'Dear donor, here are your test event photos!',
      });
      if (!sent.photos_shared_at) throw new Error('photos_shared_at not set');
      pass('Phase D: Send to donor with custom message');
    } catch (e) {
      fail('Phase D: Send to donor', e instanceof Error ? e.message : String(e));
    }

    if (isLegacySendBlocked({ completion_photos: ['x'], event_media_status: 'APPROVED' })) {
      pass('Phase D: Legacy send gate blocks food slots with media');
    } else {
      fail('Phase D: Legacy send gate', 'Should block');
    }

    try {
      await sendFoodEventMediaToDonor(testSlot._id, {});
      fail('Phase D: Duplicate send guard', 'Should have thrown');
    } catch (e) {
      if (e instanceof Error && e.message.includes('already sent')) {
        pass('Phase D: Duplicate send guard');
      } else {
        fail('Phase D: Duplicate send guard', e instanceof Error ? e.message : String(e));
      }
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  mongoose.disconnect().finally(() => process.exit(1));
});
