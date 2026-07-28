import { Home } from '../models/Core.js';
import { ProjectAssignment } from '../models/ProjectAssignment.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { toApiDoc } from '../utils/serializers.js';

export type EnrichedAssignment = {
  id: string;
  user_id: string;
  home_id: string;
  trust_id: string;
  is_primary: boolean;
  assigned_by?: string;
  assigned_at: Date;
  user?: { id: string; name: string; email?: string; phone?: string } | null;
  home?: { id: string; name: string; city: string } | null;
};

async function assertSocialWorker(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  if (user.role !== 'warden') throw new AppError('User is not a social worker', 400);
  return user;
}

async function assertHome(homeId: string) {
  const home = await Home.findById(homeId);
  if (!home) throw new AppError('Project not found', 404);
  return home;
}

/** Keep legacy `User.home_id` aligned with primary (or first) assignment. */
export async function syncUserLegacyHomeId(userId: string) {
  const user = await User.findById(userId);
  if (!user || user.role !== 'warden') return;

  const primary = await ProjectAssignment.findOne({ user_id: userId, is_primary: true }).lean();
  const fallback =
    primary ||
    (await ProjectAssignment.findOne({ user_id: userId }).sort({ assigned_at: 1 }).lean());

  if (!fallback) {
    if (user.home_id) {
      user.home_id = undefined;
      await user.save();
    }
    return;
  }

  const home = await Home.findById(fallback.home_id).select('trust_id').lean();
  user.home_id = fallback.home_id;
  if (home?.trust_id) user.trust_id = home.trust_id;
  await user.save();
}

async function clearPrimaryFlagForHome(homeId: string, exceptUserId?: string) {
  const filter: Record<string, unknown> = { home_id: homeId, is_primary: true };
  if (exceptUserId) filter.user_id = { $ne: exceptUserId };
  await ProjectAssignment.updateMany(filter, { is_primary: false });
}

async function promoteNextPrimaryForHome(homeId: string) {
  const home = await Home.findById(homeId);
  if (!home) return;

  const next = await ProjectAssignment.findOne({ home_id: homeId })
    .sort({ is_primary: -1, assigned_at: 1 })
    .lean();

  if (next) {
    await ProjectAssignment.updateOne({ _id: next._id }, { is_primary: true });
    home.primary_warden_id = next.user_id;
  } else {
    home.primary_warden_id = undefined;
  }
  await home.save();
}

export async function assignSocialWorkerToProject(params: {
  userId: string;
  homeId: string;
  assignedBy?: string;
  isPrimary?: boolean;
}) {
  const { userId, homeId, assignedBy, isPrimary = false } = params;
  const user = await assertSocialWorker(userId);
  const home = await assertHome(homeId);

  if (isPrimary) {
    await clearPrimaryFlagForHome(homeId);
  }

  let assignment = await ProjectAssignment.findOne({ user_id: userId, home_id: homeId });
  if (assignment) {
    if (isPrimary && !assignment.is_primary) {
      assignment.is_primary = true;
      await assignment.save();
    }
  } else {
    assignment = await ProjectAssignment.create({
      user_id: userId,
      home_id: homeId,
      trust_id: home.trust_id,
      is_primary: isPrimary,
      assigned_by: assignedBy,
      assigned_at: new Date(),
    });
  }

  if (isPrimary) {
    home.primary_warden_id = userId;
    await home.save();
  }

  if (!user.trust_id) {
    user.trust_id = home.trust_id;
    await user.save();
  }

  await syncUserLegacyHomeId(userId);
  return toApiDoc(assignment)!;
}

export async function setPrimarySocialWorker(params: {
  homeId: string;
  userId: string;
  assignedBy?: string;
}) {
  return assignSocialWorkerToProject({
    userId: params.userId,
    homeId: params.homeId,
    assignedBy: params.assignedBy,
    isPrimary: true,
  });
}

export async function removeSocialWorkerFromProject(userId: string, homeId: string) {
  const home = await Home.findById(homeId);
  const assignment = await ProjectAssignment.findOne({ user_id: userId, home_id: homeId });
  if (!assignment) return;

  const wasPrimary = assignment.is_primary || home?.primary_warden_id === userId;
  await assignment.deleteOne();

  if (home && wasPrimary) {
    await promoteNextPrimaryForHome(homeId);
  }

  await syncUserLegacyHomeId(userId);
}

/**
 * Assign primary social worker to a project (HomeForm / StaffForm flow).
 * Does not remove the worker from their other project assignments.
 */
export async function assignPrimarySocialWorker(params: {
  homeId: string;
  trustId: string;
  socialWorkerId: string;
  previousSocialWorkerId?: string | null;
  assignedBy?: string;
}) {
  const { homeId, trustId, socialWorkerId, previousSocialWorkerId, assignedBy } = params;
  const home = await assertHome(homeId);
  if (home.trust_id !== trustId) {
    throw new AppError('Project does not belong to the specified trust', 400);
  }

  if (previousSocialWorkerId && previousSocialWorkerId !== socialWorkerId) {
    await removeSocialWorkerFromProject(previousSocialWorkerId, homeId);
  }

  await assignSocialWorkerToProject({
    userId: socialWorkerId,
    homeId,
    assignedBy,
    isPrimary: true,
  });

  const worker = await User.findById(socialWorkerId);
  if (worker && !worker.trust_id) {
    worker.trust_id = trustId;
    await worker.save();
  }

  await syncUserLegacyHomeId(socialWorkerId);
}

async function enrichAssignments(docs: Array<Record<string, unknown>>): Promise<EnrichedAssignment[]> {
  const userIds = [...new Set(docs.map((d) => String(d.user_id)))];
  const homeIds = [...new Set(docs.map((d) => String(d.home_id)))];
  const [users, homes] = await Promise.all([
    User.find({ _id: { $in: userIds } }).select('_id name email phone role').lean(),
    Home.find({ _id: { $in: homeIds } }).select('_id name city trust_id').lean(),
  ]);
  const userMap = Object.fromEntries(users.map((u) => [u._id, u]));
  const homeMap = Object.fromEntries(homes.map((h) => [h._id, h]));

  return docs.map((d) => {
    const user = userMap[String(d.user_id)];
    const home = homeMap[String(d.home_id)];
    return {
      id: String(d._id),
      user_id: String(d.user_id),
      home_id: String(d.home_id),
      trust_id: String(d.trust_id),
      is_primary: Boolean(d.is_primary),
      assigned_by: d.assigned_by as string | undefined,
      assigned_at: d.assigned_at as Date,
      user: user
        ? { id: user._id, name: user.name, email: user.email, phone: user.phone }
        : null,
      home: home ? { id: home._id, name: home.name, city: home.city } : null,
    };
  });
}

export async function listAssignmentsForUser(userId: string) {
  const docs = await ProjectAssignment.find({ user_id: userId })
    .sort({ is_primary: -1, assigned_at: 1 })
    .lean();
  return enrichAssignments(docs as Array<Record<string, unknown>>);
}

export async function listAssignmentsForHome(homeId: string) {
  const docs = await ProjectAssignment.find({ home_id: homeId })
    .sort({ is_primary: -1, assigned_at: 1 })
    .lean();
  return enrichAssignments(docs as Array<Record<string, unknown>>);
}

/** Project IDs a social worker may access (assignments table + legacy home_id fallback). */
export async function getAssignedHomeIdsForUser(userId: string): Promise<string[]> {
  const assignments = await ProjectAssignment.find({ user_id: userId }).select('home_id').lean();
  if (assignments.length > 0) return assignments.map((a) => a.home_id);

  const user = await User.findById(userId).select('home_id role').lean();
  if (user?.role === 'warden' && user.home_id) return [user.home_id];
  return [];
}

export async function assertUserAssignedToHome(userId: string, homeId: string) {
  const assigned = await getAssignedHomeIdsForUser(userId);
  if (!assigned.includes(homeId)) {
    throw new AppError('Forbidden: not assigned to this project', 403);
  }
}

/** Social worker user IDs assigned to a project (assignments + legacy fallbacks). */
export async function getSocialWorkerIdsForHome(homeId: string): Promise<string[]> {
  const ids = new Set<string>();

  const assignments = await ProjectAssignment.find({ home_id: homeId }).select('user_id').lean();
  assignments.forEach((a) => ids.add(a.user_id));

  const home = await Home.findById(homeId).select('primary_warden_id').lean();
  if (home?.primary_warden_id) ids.add(home.primary_warden_id);

  const legacyWardens = await User.find({ role: 'warden', home_id: homeId }).select('_id').lean();
  legacyWardens.forEach((u) => ids.add(u._id));

  return [...ids];
}

export async function resolvePrimarySocialWorkerIdForHome(homeId: string): Promise<string | null> {
  const home = await Home.findById(homeId).select('primary_warden_id').lean();
  if (home?.primary_warden_id) return home.primary_warden_id;

  const primaryAssignment = await ProjectAssignment.findOne({ home_id: homeId, is_primary: true })
    .select('user_id')
    .lean();
  if (primaryAssignment) return primaryAssignment.user_id;

  const anyAssignment = await ProjectAssignment.findOne({ home_id: homeId })
    .sort({ assigned_at: 1 })
    .select('user_id')
    .lean();
  return anyAssignment?.user_id ?? null;
}
