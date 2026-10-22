import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getDb } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { toIsoUtc } from '../utils/time.js';
import { createUserRepository } from '../repositories/user.repository.js';
import { reactivateExpiredAccount } from '../services/notification.service.js';

export function createRequireAuth(db, config = env, logger = console) {
  const users = createUserRepository(db);
  return (req, res, next) => {
    try {
      const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') ?? '');
      if (!match) throw new AppError(401, 'UNAUTHORIZED');
      let payload;
      try { payload = jwt.verify(match[1], config.JWT_SECRET, { algorithms: ['HS256'] }); }
      catch { throw new AppError(401, 'UNAUTHORIZED'); }
      if (!payload || !/^\d+$/.test(String(payload.sub)) || !Number.isSafeInteger(Number(payload.sub))
        || Number(payload.sub) < 1 || !Number.isInteger(payload.tv) || !Number.isFinite(payload.exp)) {
        throw new AppError(401, 'UNAUTHORIZED');
      }
      let user = users.findForAuth(Number(payload.sub));
      if (!user) throw new AppError(401, 'UNAUTHORIZED');
      // Una suspensión debe comunicar su motivo incluso si también revocó la versión del token.
      if (user.estado_cuenta === 'suspendida') {
        // Un JWT revocado no puede provocar escrituras ni reactivar una cuenta.
        if (user.token_version !== payload.tv) {
          const until = user.suspendida_hasta && Date.parse(toIsoUtc(user.suspendida_hasta));
          if (until && until <= Date.now()) throw new AppError(401, 'UNAUTHORIZED');
          throw new AppError(403, 'ACCOUNT_SUSPENDED', undefined,
            { motivo_estado: user.motivo_estado, suspendida_hasta: toIsoUtc(user.suspendida_hasta) });
        }
        if (reactivateExpiredAccount(db, user.id, logger)) user = users.findForAuth(user.id);
        else throw new AppError(403, 'ACCOUNT_SUSPENDED', undefined,
          { motivo_estado: user.motivo_estado, suspendida_hasta: toIsoUtc(user.suspendida_hasta) });
      }
      if (user.token_version !== payload.tv) throw new AppError(401, 'UNAUTHORIZED');
      if (user.estado_cuenta === 'eliminada') throw new AppError(401, 'INVALID_CREDENTIALS');
      if (user.estado_cuenta !== 'aprobada') {
        const code = user.estado_cuenta === 'pendiente' ? 'ACCOUNT_PENDING' : 'ACCOUNT_REJECTED';
        throw new AppError(403, code, undefined, user.motivo_estado ? { motivo_estado: user.motivo_estado } : undefined);
      }
      req.user = { id: user.id, rol: user.rol, businessId: user.businessId ?? null };
      next();
    } catch (error) { next(error); }
  };
}

export function requireAuth(req, res, next) {
  return createRequireAuth(getDb())(req, res, next);
}
