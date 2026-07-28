/**
 * Verify project assignment integrity after migration.
 * Run: npm run verify-project-assignments
 */
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Home } from '../models/Core.js';
import { ProjectAssignment } from '../models/ProjectAssignment.js';
import { User } from '../models/User.js';
import {
  getAssignedHomeIdsForUser,
  getSocialWorkerIdsForHome,
  resolvePrimarySocialWorkerIdForHome,
} from '../services/projectAssignment.service.js';

async function verify() {
  await connectDatabase();

  const issues: string[] = [];
  let checks = 0;

  const wardens = await User.find({ role: 'warden' }).lean();
  for (const warden of wardens) {
    checks += 1;
    const assigned = await getAssignedHomeIdsForUser(warden._id);
    if (assigned.length === 0) {
      issues.push(`Warden ${warden.email || warden._id} has no project assignments`);
      continue;
    }
    if (warden.home_id && !assigned.includes(warden.home_id)) {
      issues.push(`Warden ${warden.email}: legacy home_id ${warden.home_id} not in assignments`);
    }
    const rows = await ProjectAssignment.find({ user_id: warden._id }).lean();
    const primaryCount = rows.filter((r) => r.is_primary).length;
    if (primaryCount > 1) {
      issues.push(`Warden ${warden.email}: multiple primary assignments (${primaryCount})`);
    }
  }

  const homes = await Home.find().lean();
  for (const home of homes) {
    checks += 1;
    const resolvedPrimary = await resolvePrimarySocialWorkerIdForHome(home._id);
    if (home.primary_warden_id && resolvedPrimary && home.primary_warden_id !== resolvedPrimary) {
      issues.push(`Home ${home.name}: primary_warden_id mismatch with assignment resolution`);
    }
    const primaries = await ProjectAssignment.find({ home_id: home._id, is_primary: true }).lean();
    if (primaries.length > 1) {
      issues.push(`Home ${home.name}: multiple is_primary assignments`);
    }
    if (home.primary_warden_id) {
      const workerIds = await getSocialWorkerIdsForHome(home._id);
      if (!workerIds.includes(home.primary_warden_id)) {
        issues.push(`Home ${home.name}: primary_warden_id not in getSocialWorkerIdsForHome`);
      }
    }
  }

  const orphanAssignments = await ProjectAssignment.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $match: { user: { $size: 0 } } },
    { $count: 'count' },
  ]);
  if (orphanAssignments[0]?.count) {
    issues.push(`${orphanAssignments[0].count} assignment(s) reference missing users`);
  }

  console.log(`Verified ${checks} wardens/homes`);
  if (issues.length === 0) {
    console.log('✓ All project assignment checks passed');
  } else {
    console.log(`✗ ${issues.length} issue(s):`);
    issues.forEach((issue) => console.log(`  - ${issue}`));
    process.exitCode = 1;
  }

  await disconnectDatabase();
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
