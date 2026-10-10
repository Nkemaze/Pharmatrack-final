import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import * as svc from './public.service.js';
import * as schemas from './schemas.js';

export const publicRouter = Router();

publicRouter.get(
  '/pharmacies',
  validate({ query: schemas.pharmaciesQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.listPharmaciesPublic(req.validated.query) });
  }),
);

publicRouter.get(
  '/pharmacies/:id',
  validate({ params: schemas.pharmacyParamsSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.getPharmacyPublic({ pharmacyId: req.validated.params.id }) });
  }),
);

publicRouter.get(
  '/pharmacies/:id/products',
  validate({ params: schemas.pharmacyParamsSchema, query: schemas.pharmacyProductsQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json({
      data: await svc.listPharmacyProductsPublic({
        pharmacyId: req.validated.params.id,
        q: req.validated.query.q,
      }),
    });
  }),
);

publicRouter.get(
  '/products/search',
  validate({ query: schemas.searchQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.searchProductsPublic(req.validated.query) });
  }),
);

publicRouter.get(
  '/products/popular',
  validate({ query: schemas.popularQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.popularProducts(req.validated.query) });
  }),
);