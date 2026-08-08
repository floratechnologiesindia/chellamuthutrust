import { Router, Response } from 'express';
import { Model } from 'mongoose';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  applyWardenHomeListFilter,
  applyWardenOwnHomesListFilter,
  applyWardenTasksListFilter,
  assertWardenCanAccessHome,
  assertWardenCanAccessTask,
  assertWardenCannotWrite,
  isWardenRole,
} from '../middleware/wardenScope.js';
import { toApiDoc } from '../utils/serializers.js';
import { applyIncludes, parseIncludes, buildFilter } from '../services/populate.js';
import { bookOrUpdateFoodSlot, dedupeFoodSlotCell } from '../services/foodSlot.service.js';

interface ResourceOptions {
  name: string;
  model: Model<any>;
  filterFields?: string[];
  defaultSort?: Record<string, 1 | -1>;
  publicRead?: boolean;
  authRequired?: boolean;
  roles?: string[];
  afterCreate?: (doc: Record<string, unknown>) => Promise<void>;
  afterUpdate?: (doc: Record<string, unknown>, previous: Record<string, unknown>) => Promise<void>;
  wardenHomeScoped?: boolean;
  homeIdField?: string;
  wardenHomesReadOnly?: boolean;
  /** Deny all write methods for social workers (reads still allowed) */
  denyWardenWrites?: boolean;
}

async function getDocHomeId(
  model: Model<any>,
  id: string,
  homeIdField: string,
): Promise<string | null> {
  const doc = await model.findById(id).select(homeIdField).lean();
  if (!doc) return null;
  return String((doc as Record<string, unknown>)[homeIdField] ?? '');
}

export function createResourceRouter(options: ResourceOptions) {
  const router = Router();
  const {
    model,
    filterFields = [],
    defaultSort = { created_at: -1 },
    publicRead = true,
    authRequired = false,
    roles,
    wardenHomeScoped = false,
    homeIdField = 'home_id',
    wardenHomesReadOnly = false,
    denyWardenWrites = false,
  } = options;

  function guardWardenWrite(req: AuthRequest) {
    if (denyWardenWrites && isWardenRole(req.user?.role)) {
      throw new AppError('Forbidden', 403);
    }
  }

  const readMiddleware = publicRead ? optionalAuth : authenticate;
  const writeMiddleware = authRequired ? [authenticate, ...(roles ? [] : [])] : [authenticate];

  router.get('/', readMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
    const filter = buildFilter(req.query as Record<string, unknown>, filterFields);
    if (wardenHomesReadOnly) {
      await applyWardenOwnHomesListFilter(req, filter);
    } else if (options.name === 'tasks' && isWardenRole(req.user?.role)) {
      await applyWardenTasksListFilter(req, filter);
    } else if (wardenHomeScoped) {
      await applyWardenHomeListFilter(req, filter, homeIdField);
    }
    const sortField = (req.query.sort as string) || Object.keys(defaultSort)[0];
    const sortDir = req.query.order === 'asc' ? 1 : -1;
    const query = model.find(filter).sort({ [sortField]: sortDir });
    if (options.name === 'profiles') query.select('-passwordHash -resetToken -resetTokenExpiry');
    if (req.query.limit) query.limit(parseInt(req.query.limit as string, 10));
    const docs = await query.lean();
    const apiDocs = docs.map((d) => ({ ...d, id: d._id }));
    await applyIncludes(apiDocs as Record<string, unknown>[], parseIncludes(req.query.include as string));
    res.json(apiDocs);
  }));

  router.get('/:id', readMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
    const doc = await model.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: 'Not found' });

    if (wardenHomesReadOnly) {
      await assertWardenCanAccessHome(req, req.params.id);
    } else if (options.name === 'tasks' && isWardenRole(req.user?.role)) {
      await assertWardenCanAccessTask(req, doc as { home_id?: string; assigned_to?: string });
    } else if (wardenHomeScoped) {
      await assertWardenCanAccessHome(req, (doc as Record<string, unknown>)[homeIdField] as string);
    }

    const apiDoc = { ...(doc as any), id: (doc as any)._id } as Record<string, unknown>;
    await applyIncludes([apiDoc], parseIncludes(req.query.include as string));
    res.json(apiDoc);
  }));

  router.post('/', ...writeMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
    guardWardenWrite(req);
    if (wardenHomesReadOnly) assertWardenCannotWrite(req);
    if (wardenHomeScoped) {
      await assertWardenCanAccessHome(req, req.body?.[homeIdField]);
    }
    if (isWardenRole(req.user?.role) && options.name === 'profiles') {
      throw new AppError('Forbidden', 403);
    }

    if (options.name === 'food_slots') {
      if (isWardenRole(req.user?.role)) {
        await assertWardenCanAccessHome(req, req.body?.home_id);
      }
      const doc = await bookOrUpdateFoodSlot(req.body as Record<string, unknown>);
      return res.status(201).json(toApiDoc(doc as never));
    }
    const doc = await model.create(req.body);
    const apiDoc = toApiDoc(doc as never) as Record<string, unknown>;
    if (options.afterCreate) await options.afterCreate(apiDoc);
    res.status(201).json(apiDoc);
  }));

  router.patch('/:id', ...writeMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
    guardWardenWrite(req);
    if (wardenHomesReadOnly) assertWardenCannotWrite(req);

    const existing = await model.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const existingHomeId = wardenHomesReadOnly
      ? req.params.id
      : String((existing as Record<string, unknown>)[homeIdField] ?? '');

    if (wardenHomesReadOnly) {
      await assertWardenCanAccessHome(req, req.params.id);
    } else if (options.name === 'tasks' && isWardenRole(req.user?.role)) {
      await assertWardenCanAccessTask(req, existing as { home_id?: string; assigned_to?: string });
      if (req.body?.[homeIdField] && String(req.body[homeIdField]) !== existingHomeId) {
        await assertWardenCanAccessHome(req, req.body[homeIdField]);
      }
    } else if (wardenHomeScoped && existingHomeId) {
      await assertWardenCanAccessHome(req, existingHomeId);
      if (req.body?.[homeIdField] && String(req.body[homeIdField]) !== existingHomeId) {
        await assertWardenCanAccessHome(req, req.body[homeIdField]);
      }
    }

    const doc = await model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (options.name === 'food_slots') {
      await dedupeFoodSlotCell(doc.home_id, doc.date, doc.time_slot, doc._id, doc.meal_type);
    }
    const apiDoc = toApiDoc(doc as never) as Record<string, unknown>;
    if (options.afterUpdate && existing) {
      await options.afterUpdate(apiDoc, { ...(existing as Record<string, unknown>), id: (existing as { _id: string })._id });
    }
    res.json(apiDoc);
  }));

  router.put('/:id', ...writeMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
    guardWardenWrite(req);
    if (wardenHomesReadOnly) assertWardenCannotWrite(req);

    const existing = await model.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const existingHomeId = wardenHomesReadOnly
      ? req.params.id
      : String((existing as Record<string, unknown>)[homeIdField] ?? '');

    if (wardenHomesReadOnly) {
      await assertWardenCanAccessHome(req, req.params.id);
    } else if (options.name === 'tasks' && isWardenRole(req.user?.role)) {
      await assertWardenCanAccessTask(req, existing as { home_id?: string; assigned_to?: string });
      if (req.body?.[homeIdField]) {
        await assertWardenCanAccessHome(req, req.body[homeIdField]);
      }
    } else if (wardenHomeScoped && existingHomeId) {
      await assertWardenCanAccessHome(req, existingHomeId);
      if (req.body?.[homeIdField]) {
        await assertWardenCanAccessHome(req, req.body[homeIdField]);
      }
    }

    const doc = await model.findByIdAndUpdate(req.params.id, req.body, { new: true, overwrite: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(toApiDoc(doc as never));
  }));

  router.delete('/:id', ...writeMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
    guardWardenWrite(req);
    if (wardenHomesReadOnly) assertWardenCannotWrite(req);

    const existing = await model.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const existingHomeId = wardenHomesReadOnly
      ? req.params.id
      : String((existing as Record<string, unknown>)[homeIdField] ?? '');

    if (wardenHomesReadOnly) {
      await assertWardenCanAccessHome(req, req.params.id);
    } else if (options.name === 'tasks' && isWardenRole(req.user?.role)) {
      await assertWardenCanAccessTask(req, existing as { home_id?: string; assigned_to?: string });
    } else if (wardenHomeScoped && existingHomeId) {
      await assertWardenCanAccessHome(req, existingHomeId);
    }

    const doc = await model.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  }));

  return router;
}
