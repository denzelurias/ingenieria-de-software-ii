import { Router } from 'express';
import { createBusinessController } from '../controllers/business.controller.js';
import { createBusinessPublicService } from '../services/businessPublic.service.js';
import { businessQuery, slugParams } from '../validators/public.validator.js';
import { validate } from '../middlewares/validate.middleware.js';
export function createBusinessRouter(db) {
  const router = Router();
  const controller = createBusinessController(createBusinessPublicService(db));
  router.get('/', validate({ query: businessQuery }), controller.list);
  router.get('/:slug', validate({ params: slugParams }), controller.detail);
  return router;
}
