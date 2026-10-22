import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
const listing = (res, result) => ok(res, result.items, undefined, result.meta);
const fileError = next => error => {
  // Cerrar el visor o cancelar un fetch no es un fallo interno del servidor.
  if (error && error.code !== 'ECONNABORTED') next(error.code === 'ENOENT' ? new AppError(404, 'NOT_FOUND') : error);
};
export function createAdminController(service, maintenance) {
  return {
    stats: (req, res) => ok(res, service.stats()),
    requests: (req, res) => listing(res, service.requests(req.query)),
    credential(req, res, next) { res.set('Cache-Control', 'private, no-store'); res.sendFile(service.credential(req.params.userId), fileError(next)); },
    decide: (req, res) => ok(res, service.decide(req.user.id, req.params.userId, req.body)),
    suspend: (req, res) => ok(res, service.suspend(req.user.id, req.params.userId, req.body)),
    products: (req, res) => listing(res, service.products(req.query)),
    moderate: (req, res) => ok(res, service.moderate(req.user.id, req.params.productId, req.body)),
    reports: (req, res) => listing(res, service.reports(req.query)),
    resolve: (req, res) => ok(res, service.resolve(req.user.id, req.params.reportId, req.body)),
    categories: (req, res) => ok(res, service.categories()),
    createCategory: (req, res) => ok(res.status(201), service.saveCategory(req.user.id, null, req.body)),
    editCategory: (req, res) => ok(res, service.saveCategory(req.user.id, req.params.id, req.body)),
    health: (req, res) => ok(res, maintenance.health()),
    inactivity: (req, res) => ok(res, maintenance.runInactivityCheck(req.user.id)),
    backup: async (req, res) => ok(res, await maintenance.backup(req.user.id)),
    download(req, res, next) { res.set('Cache-Control', 'private, no-store'); res.download(maintenance.backupFile(req.params.filename), req.params.filename, fileError(next)); },
    cleanup: (req, res) => ok(res, maintenance.cleanupOrphans(req.user.id)),
    auditLogs: (req, res) => listing(res, service.auditLogs(req.query))
  };
}
