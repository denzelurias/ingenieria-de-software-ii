import { Router } from 'express';
import { ok } from '../utils/response.js';

export function createApiRouter() {
  const router = Router();
  router.get('/health', (req, res) => ok(res, { estado: 'disponible' }, 'El servidor está disponible.'));
  return router;
}
export default createApiRouter;
