import { Router } from 'express';
import { createNotificationController } from '../controllers/notification.controller.js';
import { createAuthService } from '../services/auth.service.js';
import { createRequireAuth } from '../middlewares/auth.middleware.js';
import { notificationParams } from '../validators/public.validator.js';
import { validate } from '../middlewares/validate.middleware.js';
export function createNotificationRouter(db, config) {
  const router = Router();
  const controller = createNotificationController(createAuthService(db, config));
  router.use(createRequireAuth(db, config));
  router.get('/', controller.list);
  router.patch('/read-all', controller.readAll);
  router.patch('/:id/read', validate({ params: notificationParams }), controller.read);
  return router;
}
