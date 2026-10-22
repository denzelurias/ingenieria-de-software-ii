import { AppError } from '../utils/AppError.js';

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError(401, 'UNAUTHORIZED'));
  if (!roles.includes(req.user.rol)) return next(new AppError(403, 'FORBIDDEN'));
  next();
};
