import { Router } from 'express';
import { createReportController } from '../controllers/report.controller.js';
import { createReportService } from '../services/report.service.js';
import { reportBody } from '../validators/report.validator.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createRateLimiter } from '../middlewares/rateLimit.middleware.js';
export function createReportRouter(db, config) {
  const router = Router();
  router.post('/', createRateLimiter({ limit: 5, windowMs: 60 * 60000 }, config), validate({ body: reportBody }), createReportController(createReportService(db, config)).create);
  return router;
}
