import { Router } from 'express';
import { createCatalogController } from '../controllers/catalog.controller.js';
import { createCatalogService } from '../services/catalog.service.js';
export function createCatalogRouter(db) {
  const router = Router();
  router.get('/', createCatalogController(createCatalogService(db)).list);
  return router;
}
