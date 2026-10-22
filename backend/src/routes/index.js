import { Router } from 'express';
import { ok } from '../utils/response.js';
import { env } from '../config/env.js';
import { getDb } from '../config/db.js';
import { createAuthRouter } from './auth.routes.js';
import { createCatalogRouter } from './catalog.routes.js';
import { createBusinessRouter } from './business.routes.js';
import { createProductRouter } from './product.routes.js';
import { createReportRouter } from './report.routes.js';
import { createNotificationRouter } from './notification.routes.js';
import { createMyBusinessRouter } from './myBusiness.routes.js';
import { createAdminRouter } from './admin.routes.js';

export function createApiRouter({ db, config = env } = {}) {
  const router = Router();
  router.get('/health', (req, res) => ok(res, { estado: 'disponible' }, 'El servidor está disponible.'));
  const connection = db ?? getDb();
  router.use('/auth', createAuthRouter(connection, config));
  router.use('/catalogs', createCatalogRouter(connection));
  router.use('/businesses', createBusinessRouter(connection));
  router.use('/products', createProductRouter(connection));
  router.use('/reports', createReportRouter(connection, config));
  router.use('/notifications', createNotificationRouter(connection, config));
  router.use('/my-business', createMyBusinessRouter(connection, config));
  router.use('/admin', createAdminRouter(connection, config));
  return router;
}
export default createApiRouter;
