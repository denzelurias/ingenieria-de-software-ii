import { createCatalogRepository } from '../repositories/catalog.repository.js';
export function createCatalogService(db) {
  const repository = createCatalogRepository(db);
  return { list: () => ({ categories: repository.categories(), campus_zones: repository.zones() }) };
}
