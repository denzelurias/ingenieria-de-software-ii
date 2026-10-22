import { Router } from 'express';
import { createAuthController } from '../controllers/auth.controller.js';
import { createAuthService } from '../services/auth.service.js';
import { createAuthSchemas } from '../validators/auth.validator.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createRequireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { createRateLimiter } from '../middlewares/rateLimit.middleware.js';
import { createCredentialImage } from '../config/upload.js';
import { deleteStoredFile } from '../utils/files.js';

export function createAuthRouter(db, config) {
  const router = Router();
  const controller = createAuthController(createAuthService(db, config));
  const schemas = createAuthSchemas(config);
  const auth = createRequireAuth(db, config);
  const limit = (count, minutes) => createRateLimiter({ limit: count, windowMs: minutes * 60000 }, config);
  router.post('/register-request', limit(5, 60), createCredentialImage(config).single('credencial'),
    validate({ body: schemas.register }), controller.register,
    (error, req, res, next) => {
      if (req.file) {
        try { deleteStoredFile(config.STORAGE_DIR, `credentials/${req.file.filename}`); }
        catch (cleanupError) { console.error('No se pudo eliminar una credencial de una solicitud fallida.', cleanupError); }
      }
      next(error);
    });
  router.post('/login', limit(10, 15), validate({ body: schemas.login }), controller.login);
  router.get('/me', auth, controller.me);
  router.post('/request-status', validate({ body: schemas.status }), controller.requestStatus);
  router.post('/forgot-password', limit(5, 15), validate({ body: schemas.forgot }), controller.forgotPassword);
  router.post('/reset-password', limit(5, 15), validate({ body: schemas.reset }), controller.resetPassword);
  router.delete('/my-account', auth, requireRole('emprendedor'), validate({ body: schemas.remove }), controller.removeAccount);
  return router;
}
