import { Router } from 'express';
import { createProductController } from '../controllers/product.controller.js';
import { createProductPublicService } from '../services/productPublic.service.js';
import { productQuery } from '../validators/public.validator.js';
import { validate } from '../middlewares/validate.middleware.js';
export function createProductRouter(db) {
  const router = Router();
  router.get('/', validate({ query: productQuery }), createProductController(createProductPublicService(db)).list);
  return router;
}
