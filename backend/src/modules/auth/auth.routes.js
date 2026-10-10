import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as svc from './auth.service.js';
import * as schemas from './schemas.js';

export const authRouter = Router();

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.me(req.user) });
  }),
);

authRouter.post(
  '/login',
  validate({ body: schemas.loginSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.login(req.validated.body) });
  }),
);

authRouter.post(
  '/refresh',
  validate({ body: schemas.refreshSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.refresh(req.validated.body) });
  }),
);

authRouter.post(
  '/logout',
  authenticate,
  validate({ body: schemas.logoutSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.logout({ user: req.user, auth: req.auth, refreshToken: req.validated.body.refreshToken }) });
  }),
);

authRouter.post(
  '/setup-admin',
  validate({ body: schemas.setupAdminSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.setupAdmin(req.validated.body) });
  }),
);

authRouter.post(
  '/register/pharmacy',
  validate({ body: schemas.registerPharmacySchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await svc.registerPharmacy(req.validated.body) });
  }),
);

authRouter.post(
  '/complete-profile',
  authenticate,
  validate({ body: schemas.completeProfileSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.completeProfile({ user: req.user, ...req.validated.body }) });
  }),
);