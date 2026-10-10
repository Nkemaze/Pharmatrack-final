import { Router } from 'express';
import { adminRouter, usersRouter } from './modules/admin/admin.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { inventoryRouter } from './modules/inventory/inventory.routes.js';
import { publicRouter } from './modules/public/public.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);

// Public discovery must be mounted before the authenticated inventory router so
// that /products/search and /products/popular are not captured by /products/:id.
apiRouter.use('/', publicRouter);
apiRouter.use('/', inventoryRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/users', usersRouter);