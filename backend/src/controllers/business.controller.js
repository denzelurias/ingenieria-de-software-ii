import { ok } from '../utils/response.js';
export const createBusinessController = service => ({
  list(req, res) { const result = service.list(req.query); return ok(res, result.items, undefined, result.meta); },
  detail: (req, res) => ok(res, service.detail(req.params.slug))
});
