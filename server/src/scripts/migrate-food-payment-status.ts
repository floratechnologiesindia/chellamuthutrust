/**
 * Normalize legacy food slot payment_status values to FULLY_PAID / PARTIALLY_PAID / FULLY_PENDING.
 * Run: npm run migrate-food-payment-status
 * Prod: docker compose -f docker-compose.prod.yml exec -T app node server/dist/scripts/migrate-food-payment-status.js
 */
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { FoodSlot } from '../models/Finance.js';

const MAP: Record<string, string> = {
  PAID: 'FULLY_PAID',
  YET_TO_PAY: 'FULLY_PENDING',
  PREPAID: 'PARTIALLY_PAID',
  UNPAID: 'FULLY_PENDING',
  PARTIAL: 'PARTIALLY_PAID',
};

async function migrate() {
  await connectDatabase();

  let updated = 0;
  const slots = await FoodSlot.find({
    payment_status: { $in: Object.keys(MAP) },
  });

  for (const slot of slots) {
    const current = String(slot.payment_status || '').toUpperCase();
    const next = MAP[current];
    if (!next) continue;
    slot.payment_status = next;
    if (String(slot.status).toUpperCase() === 'PAID') {
      slot.status = 'BOOKED';
    }
    await slot.save();
    updated += 1;
    console.log(`${slot._id}: ${current} → ${next}`);
  }

  console.log(`Done. updated=${updated}`);
  await disconnectDatabase();
}

migrate().catch(async (err) => {
  console.error(err);
  try {
    await disconnectDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
