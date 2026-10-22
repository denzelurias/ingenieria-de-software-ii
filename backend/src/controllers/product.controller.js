import { ok } from '../utils/response.js';
export const createProductController = service => ({
  list(req, res) { const result = service.list(req.query); return ok(res, result.items, undefined, result.meta); }
});
