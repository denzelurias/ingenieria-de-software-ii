import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export function createRateLimiter({ windowMs, limit }, config = env) {
  return rateLimit({ windowMs, limit: config.NODE_ENV === 'test' ? 10000 : limit,
    standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (req, res, next) => next(new AppError(429, 'RATE_LIMITED')) });
}

export const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, limit: 10 });
export const registerLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, limit: 5 });
export const forgotPasswordLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, limit: 5 });
export const resetPasswordLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, limit: 5 });
export const reportLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, limit: 5 });
