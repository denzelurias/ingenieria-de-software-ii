import { ok } from '../utils/response.js';
export const createCatalogController = service => ({ list: (req, res) => ok(res, service.list()) });
