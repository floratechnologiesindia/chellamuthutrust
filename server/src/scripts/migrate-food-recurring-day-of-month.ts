/**
 * Backfill food_recurring_pledges: weekday → day_of_month, and recalculate
 * next_due_date to the same calendar day (not weekday).
 *
 * Run: npm run migrate-food-recurring-day-of-month
 * Prod: docker compose -f docker-compose.prod.yml exec -T app node server/dist/scripts/migrate-food-recurring-day-of-month.js
 */
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { FoodRecurringPledge, type FoodRecurringFrequency } from '../models/Finance.js';
import {
  dayOfMonthFromIsoDate,
  nextSameDayOfMonthDate,
} from '../services/foodRecurringPledge.service.js';

async function migrate() {
  await connectDatabase();

  const collection = FoodRecurringPledge.collection;
  const rows = await collection.find({}).toArray();

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const startDate = typeof row.start_date === 'string' ? row.start_date : null;
    const lastPaid = typeof row.last_paid_date === 'string' ? row.last_paid_date : null;
    const baseDate = lastPaid || startDate;
    if (!baseDate || !startDate) {
      skipped += 1;
      console.warn(`skip ${row._id}: missing start_date/last_paid_date`);
      continue;
    }

    const frequency = (row.frequency === 'annual' ? 'annual' : 'monthly') as FoodRecurringFrequency;
    const dayOfMonth = dayOfMonthFromIsoDate(startDate);
    const nextDue = nextSameDayOfMonthDate(baseDate, frequency);

    const needsUpdate =
      row.day_of_month !== dayOfMonth ||
      row.next_due_date !== nextDue ||
      row.weekday !== undefined;

    if (!needsUpdate) {
      skipped += 1;
      continue;
    }

    await collection.updateOne(
      { _id: row._id },
      {
        $set: {
          day_of_month: dayOfMonth,
          next_due_date: nextDue,
          updated_at: new Date(),
        },
        $unset: { weekday: '' },
      },
    );

    updated += 1;
    console.log(
      `${row._id}: day_of_month=${dayOfMonth}, next_due_date ${row.next_due_date} → ${nextDue}`,
    );
  }

  console.log(`Done. updated=${updated} skipped=${skipped} total=${rows.length}`);
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
