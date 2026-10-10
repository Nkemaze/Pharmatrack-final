import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);

// Auth, public discovery, inventory, loss reports, reports and admin
// routers are mounted here as their modules land (see ROADMAP phases 3-5).