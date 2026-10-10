import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as svc from './inventory.service.js';
import * as schemas from './schemas.js';

export const inventoryRouter = Router();

inventoryRouter.use(authenticate);

inventoryRouter.get(
  '/products',
  validate({ query: schemas.productListQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await svc.listProducts({ user: req.user, query: req.validated.query }));
  }),
);

inventoryRouter.post(
  '/products',
  validate({ body: schemas.productCreateSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await svc.createProduct({ user: req.user, data: req.validated.body }) });
  }),
);

inventoryRouter.get(
  '/products/:id',
  validate({ params: schemas.productParamsSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.getProduct({ user: req.user, productId: req.validated.params.id }) });
  }),
);

inventoryRouter.patch(
  '/products/:id',
  validate({ params: schemas.productParamsSchema, body: schemas.productUpdateSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.updateProduct({ user: req.user, productId: req.validated.params.id, data: req.validated.body }) });
  }),
);

inventoryRouter.get(
  '/products/:id/batches',
  validate({ params: schemas.productParamsSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.listBatches({ user: req.user, productId: req.validated.params.id }) });
  }),
);

inventoryRouter.post(
  '/products/:id/batches',
  validate({ params: schemas.productParamsSchema, body: schemas.batchCreateSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await svc.createBatch({ user: req.user, productId: req.validated.params.id, data: req.validated.body }) });
  }),
);

inventoryRouter.patch(
  '/batches/:id',
  validate({ params: schemas.batchParamsSchema, body: schemas.batchUpdateSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.updateBatch({ user: req.user, batchId: req.validated.params.id, data: req.validated.body }) });
  }),
);

inventoryRouter.post(
  '/movements',
  validate({ body: schemas.movementCreateSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await svc.createMovement({ user: req.user, data: req.validated.body }) });
  }),
);

inventoryRouter.get(
  '/movements',
  validate({ query: schemas.movementListQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await svc.listMovements({ user: req.user, query: req.validated.query }));
  }),
);

inventoryRouter.get(
  '/movements/export',
  validate({ query: schemas.movementListQuerySchema.partial() }),
  asyncHandler(async (req, res) => {
    const csv = await svc.exportMovements({ user: req.user, query: req.validated.query });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="movements.csv"');
    res.send(csv);
  }),
);

inventoryRouter.get(
  '/reports/dashboard',
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.dashboard({ user: req.user }) });
  }),
);

inventoryRouter.get(
  '/loss-reports',
  validate({ query: schemas.lossReportListQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await svc.listLossReports({ user: req.user, query: req.validated.query }));
  }),
);

inventoryRouter.patch(
  '/loss-reports/:id/reported',
  validate({ params: schemas.lossReportParamsSchema, body: schemas.lossReportUpdateSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await svc.markLossReportReported({ user: req.user, reportId: req.validated.params.id, authorityReference: req.validated.body.authorityReference }) });
  }),
);

inventoryRouter.get(
  '/loss-reports/export',
  validate({ query: schemas.lossReportListQuerySchema.partial() }),
  asyncHandler(async (req, res) => {
    const csv = await svc.exportLossReports({ user: req.user, query: req.validated.query });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="loss-reports.csv"');
    res.send(csv);
  }),
);