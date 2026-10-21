import { ZodError } from 'zod';
import multer from 'multer';
import { AppError, errorCatalog } from '../utils/AppError.js';
import { serializeDates } from '../utils/response.js';

export const notFound = (req, res, next) => next(new AppError(404, 'NOT_FOUND'));

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let code = 'INTERNAL_ERROR';
  let message;
  let details;
  if (error instanceof AppError && Object.hasOwn(errorCatalog, error.code)) {
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    code = 'VALIDATION_ERROR';
    details = error.issues.map(issue => ({ field: issue.path.join('.'), message: 'Revisa el valor de este campo.' }));
  } else if (error instanceof multer.MulterError) {
    code = 'INVALID_FILE';
  } else if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE' || error?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
    code = 'CONFLICT';
  } else if (['SQLITE_CONSTRAINT_FOREIGNKEY', 'SQLITE_CONSTRAINT_CHECK', 'SQLITE_CONSTRAINT_NOTNULL'].includes(error?.code)
    || ['entity.parse.failed', 'entity.too.large'].includes(error?.type)) {
    code = 'VALIDATION_ERROR';
  }
  if (code === 'INTERNAL_ERROR') console.error('Error inesperado en el servidor:', error);
  const [status, defaultMessage] = errorCatalog[code];
  return res.status(status).json({ ok: false, error: { code,
    message: code === 'INTERNAL_ERROR' ? defaultMessage : (message ?? defaultMessage),
    ...(details !== undefined && code !== 'INTERNAL_ERROR' ? { details: serializeDates(details) } : {}) } });
}
