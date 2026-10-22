import { ok } from '../utils/response.js';
export const createReportController = service => ({ create: (req, res) => ok(res.status(201), service.create(req.body, req.ip), 'Tu reporte se recibió correctamente.') });
