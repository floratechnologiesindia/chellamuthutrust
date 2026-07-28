import { AuthRequest } from './auth.js';
import { AppError } from './errorHandler.js';
import { getAssignedHomeIdsForUser } from '../services/projectAssignment.service.js';

export function isWardenRole(role?: string) {
  return role === 'warden';
}

export async function getWardenAssignedHomeIds(req: AuthRequest): Promise<string[] | null> {
  if (!req.user || !isWardenRole(req.user.role)) return null;
  return getAssignedHomeIdsForUser(req.userId!);
}

export async function assertWardenCanAccessHome(req: AuthRequest, homeId?: string | null) {
  const assigned = await getWardenAssignedHomeIds(req);
  if (!assigned) return;
  if (!homeId || !assigned.includes(String(homeId))) {
    throw new AppError('Forbidden: not assigned to this project', 403);
  }
}

export function assertWardenCannotWrite(req: AuthRequest) {
  if (isWardenRole(req.user?.role)) {
    throw new AppError('Forbidden', 403);
  }
}

/** Merge warden list filters so only assigned projects are visible. */
export async function applyWardenHomeListFilter(
  req: AuthRequest,
  filter: Record<string, unknown>,
  field: string,
) {
  const assigned = await getWardenAssignedHomeIds(req);
  if (!assigned) return;

  if (assigned.length === 0) {
    filter[field] = { $in: [] };
    return;
  }

  const requested = req.query[field];
  if (requested !== undefined && requested !== '') {
    const ids = String(requested).split(',').map((s) => s.trim()).filter(Boolean);
    const invalid = ids.filter((id) => !assigned.includes(id));
    if (invalid.length > 0) {
      throw new AppError('Forbidden: not assigned to this project', 403);
    }
    return;
  }

  filter[field] = { $in: assigned };
}

/** Restrict warden reads on the homes collection itself (_id field). */
export async function applyWardenOwnHomesListFilter(req: AuthRequest, filter: Record<string, unknown>) {
  const assigned = await getWardenAssignedHomeIds(req);
  if (!assigned) return;
  filter._id = assigned.length > 0 ? { $in: assigned } : { $in: [] };
}

/**
 * Tasks: social workers see tasks for their assigned projects OR tasks assigned directly to them.
 */
export async function applyWardenTasksListFilter(req: AuthRequest, filter: Record<string, unknown>) {
  const assigned = await getWardenAssignedHomeIds(req);
  if (!assigned) return;

  const userId = req.userId!;
  const scope: Record<string, unknown>[] = [{ assigned_to: userId }];
  if (assigned.length > 0) {
    scope.push({ home_id: { $in: assigned } });
  }

  const existingAnd = Array.isArray(filter.$and) ? (filter.$and as Record<string, unknown>[]) : [];
  const { $and: _drop, ...rest } = filter;
  Object.keys(filter).forEach((k) => delete filter[k]);
  Object.assign(filter, {
    $and: [...existingAnd, ...(Object.keys(rest).length ? [rest] : []), { $or: scope }],
  });
}

/** Allow warden access to a task if it is on their project or assigned to them. */
export async function assertWardenCanAccessTask(
  req: AuthRequest,
  task: { home_id?: string | null; assigned_to?: string | null },
) {
  if (!isWardenRole(req.user?.role)) return;
  if (task.assigned_to && String(task.assigned_to) === req.userId) return;
  await assertWardenCanAccessHome(req, task.home_id);
}
