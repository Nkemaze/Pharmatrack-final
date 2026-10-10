import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { healthRouter } from './modules/health/health.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);

// Public discovery, inventory, loss reports, reports and admin routers are
// mounted here as their modules land (see ROADMAP phases 4-5).