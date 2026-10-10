import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as svc from './admin.service.js';
import * as schemas from './schemas.js';

export const adminRouter = Router();
export const usersRouter = Router();

const adminOnly = [authenticate, requireRole('ADMIN')];

adminRouter.use(...adminOnly);
usersRouter.use(...adminOnly);

adminRouter.get(
  '/pharmacies',
  validate({ query: schemas.listPharmaciesQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await svc.listPharmacies({ query: req.validated.query }));
  }),
);

adminRouter.post(
  '/pharmacies',
  validate({ body: schemas.createPharmacySchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.createPharmacy({ data: req.validated.body }) });
  }),
);

adminRouter.patch(
  '/pharmacies/:id/status',
  validate({ params: schemas.pharmacyParamsSchema, body: schemas.pharmacyStatusSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.updatePharmacyStatus({ pharmacyId: req.validated.params.id, status: req.validated.body.status }) });
  }),
);

adminRouter.delete(
  '/pharmacies/:id',
  validate({ params: schemas.pharmacyParamsSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.softDeletePharmacy({ pharmacyId: req.validated.params.id }) });
  }),
);

usersRouter.get(
  '/',
  validate({ query: schemas.listUsersQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await svc.listUsers({ query: req.validated.query }));
  }),
);

usersRouter.post(
  '/',
  validate({ body: schemas.createUserSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await svc.createUser({ data: req.validated.body }) });
  }),
);

usersRouter.delete(
  '/:id',
  validate({ params: schemas.userParamsSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.deleteUser({ adminId: req.user.id, userId: req.validated.params.id }) });
  }),
);