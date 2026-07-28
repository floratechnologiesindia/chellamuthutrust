import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { Trust, Home, HomeType, DonorCategory, Religion } from '../models/Core.js';
import { Category, Subcategory } from '../models/Operations.js';
import { FoodSlotPricing } from '../models/Finance.js';
import {
  SEED_PASSWORD, CATEGORIES, FOOD_SUBCATEGORIES, HOME_TYPES, DONOR_CATEGORIES,
  RELIGIONS, FOOD_SLOT_PRICING, TRUST, HOMES, SEED_USERS,
} from './seed-data.js';
import {
  seedExtraSubcategories, seedResidents, seedNeeds, seedFoodSlots,
  seedDonations, seedTasks, seedNotifications, seedKindDonations,
  seedCorpusFund, seedBankTransactions,
} from './seed-operational.js';

async function clearDatabase() {
  const db = mongoose.connection.db;
  if (!db) return;
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.collection(col.name).deleteMany({});
  }
  console.log(`Cleared ${collections.length} collections`);
}

export async function runSeed(fresh = false) {
  if (fresh) await clearDatabase();

  const existing = await User.countDocuments();
  if (!fresh && existing > 0) {
    console.log('Database already seeded. Use --fresh to reset and reseed.');
    return;
  }

  console.log('Seeding Chellamuthu Connect database...\n');

  // Reference data
  const categories = await Category.insertMany(
    CATEGORIES.map((c, i) => ({ ...c, is_active: true, sort_order: i }))
  );
  console.log(`  ✓ ${categories.length} need categories`);

  const foodCategory = categories.find((c) => c.key === 'food');
  if (foodCategory) {
    const subs = await Subcategory.insertMany(
      FOOD_SUBCATEGORIES.map((s, i) => ({
        category_id: foodCategory._id,
        label: s.label,
        description: s.description,
        is_active: true,
        sort_order: i,
      }))
    );
    console.log(`  ✓ ${subs.length} food subcategories`);
  }

  const extraSubCount = await seedExtraSubcategories(categories);
  console.log(`  ✓ ${extraSubCount} additional subcategories`);

  await HomeType.insertMany(HOME_TYPES.map((h, i) => ({ ...h, is_active: true, sort_order: i })));
  console.log(`  ✓ ${HOME_TYPES.length} home types`);

  await DonorCategory.insertMany(DONOR_CATEGORIES.map((d, i) => ({ ...d, is_active: true, sort_order: i })));
  console.log(`  ✓ ${DONOR_CATEGORIES.length} donor categories`);

  await Religion.insertMany(RELIGIONS.map((r, i) => ({ ...r, is_active: true, sort_order: i })));
  console.log(`  ✓ ${RELIGIONS.length} religions`);

  const pricing = await FoodSlotPricing.insertMany(FOOD_SLOT_PRICING.map((p) => ({ ...p, is_active: true })));
  console.log(`  ✓ ${FOOD_SLOT_PRICING.length} food slot prices`);

  // Organization
  const trust = await Trust.create(TRUST);
  console.log(`  ✓ Trust: ${trust.name}`);

  const homes = await Home.insertMany(
    HOMES.map((h) => ({ ...h, trust_id: trust._id, country: 'India' }))
  );
  console.log(`  ✓ ${homes.length} homes`);

  // Users
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  const createdUsers: { email: string; role: string }[] = [];
  const userMap = new Map<string, { _id: string }>();

  for (const u of SEED_USERS) {
    const userData: Record<string, unknown> = {
      email: u.email,
      passwordHash,
      name: u.name,
      role: u.role,
      status: 'active',
    };
    if ('assignTrust' in u && u.assignTrust) userData.trust_id = trust._id;
    if ('assignHome' in u && typeof u.assignHome === 'number') {
      userData.home_id = homes[u.assignHome]._id;
      userData.trust_id = trust._id;
    }
    if ('phone' in u && u.phone) userData.phone = u.phone;
    if ('donor_category' in u && u.donor_category) userData.donor_category = u.donor_category;
    if ('organization' in u && u.organization) userData.organization = u.organization;
    if ('city' in u && u.city) userData.city = u.city;
    if ('state' in u && u.state) userData.state = u.state;

    const created = await User.create(userData);
    userMap.set(u.email, { _id: created._id });
    createdUsers.push({ email: u.email, role: u.role });
  }

  const warden = await User.findOne({ email: 'warden@chellamuthu.local' });
  if (warden) {
    const { assignPrimarySocialWorker, assignSocialWorkerToProject } = await import('../services/projectAssignment.service.js');
    await assignPrimarySocialWorker({
      homeId: homes[0]._id,
      trustId: trust._id,
      socialWorkerId: warden._id,
    });
    // Demo multi-project: also assign to second project (non-primary)
    if (homes[1]) {
      await assignSocialWorkerToProject({
        userId: warden._id,
        homeId: homes[1]._id,
        assignedBy: warden._id,
        isPrimary: false,
      });
    }
  }

  const admin = userMap.get('admin@chellamuthu.local')!;
  const donor = userMap.get('donor@chellamuthu.local')!;

  console.log(`  ✓ ${createdUsers.length} users`);

  // Operational sample data
  const residentCount = await seedResidents(homes);
  console.log(`  ✓ ${residentCount} residents`);

  const needs = await seedNeeds(homes, trust._id, categories, admin._id);
  console.log(`  ✓ ${needs.length} needs`);

  const foodSlotCount = await seedFoodSlots(homes, trust._id, donor._id, pricing);
  console.log(`  ✓ ${foodSlotCount} food calendar slots`);

  const donationCount = await seedDonations(needs, homes, trust._id, userMap);
  console.log(`  ✓ ${donationCount} donations (+ payment records)`);

  const taskCount = await seedTasks(homes, trust._id, userMap);
  console.log(`  ✓ ${taskCount} tasks`);

  const notificationCount = await seedNotifications(userMap);
  console.log(`  ✓ ${notificationCount} notifications`);

  const kindCount = await seedKindDonations(homes, trust._id, userMap);
  console.log(`  ✓ ${kindCount} kind donations`);

  const corpusCount = await seedCorpusFund(trust._id, userMap);
  console.log(`  ✓ ${corpusCount} corpus fund contributions`);

  const bankTxCount = await seedBankTransactions(trust._id, userMap, categories);
  console.log(`  ✓ ${bankTxCount} bank transactions`);

  console.log('\nSeed complete. Login credentials:\n');
  console.log(`  Password (all accounts): ${SEED_PASSWORD}\n`);
  for (const u of createdUsers) {
    console.log(`  ${u.role.padEnd(12)} ${u.email}`);
  }
  console.log('');
}

async function main() {
  const fresh = process.argv.includes('--fresh');
  try {
    await connectDatabase();
    await runSeed(fresh);
  } finally {
    await disconnectDatabase();
  }
}

const isDirectRun = process.argv[1]?.includes('seed.ts') || process.argv[1]?.includes('seed.js');
if (isDirectRun) {
  main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
