import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { ProjectAssignment } from '../models/ProjectAssignment.js';
import {
  assignPrimarySocialWorker,
  assignSocialWorkerToProject,
  assertUserAssignedToHome,
  listAssignmentsForHome,
  listAssignmentsForUser,
  removeSocialWorkerFromProject,
  setPrimarySocialWorker,
} from '../services/projectAssignment.service.js';

const router = Router();

function canViewUserAssignments(req: AuthRequest, userId: string) {
  if (req.userId === userId) return true;
  return ['super_admin', 'admin'].includes(req.user?.role ?? '');
}

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.query.user_id as string | undefined;
    const homeId = req.query.home_id as string | undefined;

    if (userId) {
      if (!canViewUserAssignments(req, userId)) throw new AppError('Forbidden', 403);
      return res.json(await listAssignmentsForUser(userId));
    }
    if (homeId) {
      return res.json(await listAssignmentsForHome(homeId));
    }
    throw new AppError('user_id or home_id query parameter is required', 400);
  }),
);

router.get(
  '/users/:userId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!canViewUserAssignments(req, req.params.userId)) throw new AppError('Forbidden', 403);
    res.json(await listAssignmentsForUser(req.params.userId));
  }),
);

router.get(
  '/homes/:homeId/social-workers',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user?.role === 'warden') {
      await assertUserAssignedToHome(req.userId!, req.params.homeId);
    }
    res.json(await listAssignmentsForHome(req.params.homeId));
  }),
);

router.post(
  '/',
  authenticate,
  authorize('super_admin', 'admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { user_id, home_id, is_primary } = req.body;
    if (!user_id || !home_id) throw new AppError('user_id and home_id are required', 400);

    const result = await assignSocialWorkerToProject({
      userId: String(user_id),
      homeId: String(home_id),
      assignedBy: req.userId,
      isPrimary: Boolean(is_primary),
    });
    res.status(201).json(result);
  }),
);

router.post(
  '/assign-primary',
  authenticate,
  authorize('super_admin', 'admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      home_id,
      homeId,
      trust_id,
      trustId,
      social_worker_id,
      socialWorkerId,
      previous_social_worker_id,
      previousSocialWorkerId,
    } = req.body;

    const resolvedHomeId = String(home_id || homeId || '');
    const resolvedTrustId = String(trust_id || trustId || '');
    const resolvedWorkerId = String(social_worker_id || socialWorkerId || '');
    const resolvedPreviousId = previous_social_worker_id || previousSocialWorkerId || null;

    if (!resolvedHomeId || !resolvedTrustId || !resolvedWorkerId) {
      throw new AppError('home_id, trust_id, and social_worker_id are required', 400);
    }

    await assignPrimarySocialWorker({
      homeId: resolvedHomeId,
      trustId: resolvedTrustId,
      socialWorkerId: resolvedWorkerId,
      previousSocialWorkerId: resolvedPreviousId,
      assignedBy: req.userId,
    });

    res.json({ success: true });
  }),
);

router.post(
  '/set-primary',
  authenticate,
  authorize('super_admin', 'admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { home_id, homeId, user_id, userId } = req.body;
    const resolvedHomeId = String(home_id || homeId || '');
    const resolvedUserId = String(user_id || userId || '');
    if (!resolvedHomeId || !resolvedUserId) {
      throw new AppError('home_id and user_id are required', 400);
    }

    const result = await setPrimarySocialWorker({
      homeId: resolvedHomeId,
      userId: resolvedUserId,
      assignedBy: req.userId,
    });
    res.json(result);
  }),
);

router.delete(
  '/by-pair',
  authenticate,
  authorize('super_admin', 'admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { user_id, userId, home_id, homeId } = req.body;
    const resolvedUserId = String(user_id || userId || '');
    const resolvedHomeId = String(home_id || homeId || '');
    if (!resolvedUserId || !resolvedHomeId) {
      throw new AppError('user_id and home_id are required', 400);
    }

    await removeSocialWorkerFromProject(resolvedUserId, resolvedHomeId);
    res.json({ success: true });
  }),
);

router.delete(
  '/:id',
  authenticate,
  authorize('super_admin', 'admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignment = await ProjectAssignment.findById(req.params.id);
    if (!assignment) throw new AppError('Assignment not found', 404);
    await removeSocialWorkerFromProject(assignment.user_id, assignment.home_id);
    res.json({ success: true });
  }),
);

export default router;
