/**
 * Backfill project_assignments from legacy User.home_id and Home.primary_warden_id.
 * Run: npm run migrate-project-assignments
 */
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Home } from '../models/Core.js';
import { ProjectAssignment } from '../models/ProjectAssignment.js';
import { User } from '../models/User.js';
import { syncUserLegacyHomeId } from '../services/projectAssignment.service.js';

async function ensureAssignment(params: {
  userId: string;
  homeId: string;
  trustId: string;
  isPrimary: boolean;
}) {
  const { userId, homeId, trustId, isPrimary } = params;
  const existing = await ProjectAssignment.findOne({ user_id: userId, home_id: homeId });
  if (existing) {
    if (isPrimary && !existing.is_primary) {
      await ProjectAssignment.updateMany({ home_id: homeId, is_primary: true }, { is_primary: false });
      existing.is_primary = true;
      await existing.save();
      return 'updated';
    }
    return 'skipped';
  }

  if (isPrimary) {
    await ProjectAssignment.updateMany({ home_id: homeId, is_primary: true }, { is_primary: false });
  }

  await ProjectAssignment.create({
    user_id: userId,
    home_id: homeId,
    trust_id: trustId,
    is_primary: isPrimary,
    assigned_at: new Date(),
  });
  return 'created';
}

async function migrate() {
  await connectDatabase();

  let created = 0;
  let updated = 0;
  let skipped = 0;

  const wardens = await User.find({
    role: 'warden',
    home_id: { $exists: true, $nin: [null, ''] },
  }).lean();

  for (const warden of wardens) {
    const home = await Home.findById(warden.home_id).lean();
    if (!home) continue;
    const isPrimary = home.primary_warden_id === warden._id;
    const result = await ensureAssignment({
      userId: warden._id,
      homeId: home._id,
      trustId: home.trust_id,
      isPrimary,
    });
    if (result === 'created') created += 1;
    else if (result === 'updated') updated += 1;
    else skipped += 1;
  }

  const homes = await Home.find({
    primary_warden_id: { $exists: true, $nin: [null, ''] },
  }).lean();

  for (const home of homes) {
    const result = await ensureAssignment({
      userId: home.primary_warden_id!,
      homeId: home._id,
      trustId: home.trust_id,
      isPrimary: true,
    });
    if (result === 'created') created += 1;
    else if (result === 'updated') updated += 1;
    else skipped += 1;
  }

  const homeIds = await ProjectAssignment.distinct('home_id');
  for (const homeId of homeIds) {
    const primaries = await ProjectAssignment.find({ home_id: homeId, is_primary: true }).lean();
    if (primaries.length > 1) {
      const keep = primaries[0];
      await ProjectAssignment.updateMany(
        { home_id: homeId, _id: { $ne: keep._id } },
        { is_primary: false },
      );
      updated += primaries.length - 1;
    }
  }

  const allWardens = await User.find({ role: 'warden' }).select('_id').lean();
  for (const w of allWardens) {
    await syncUserLegacyHomeId(w._id);
  }

  console.log(`Migration complete: ${created} created, ${updated} updated, ${skipped} unchanged`);
  await disconnectDatabase();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
