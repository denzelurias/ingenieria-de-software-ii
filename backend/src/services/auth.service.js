import { createHash, randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUserRepository } from '../repositories/user.repository.js';
import { createCatalogRepository } from '../repositories/catalog.repository.js';
import { createNotificationRepository } from '../repositories/notification.repository.js';
import { reactivateExpiredAccount } from './notification.service.js';
import { uniqueSlug } from '../utils/text.js';
import { deleteStoredFile } from '../utils/files.js';
import { AppError } from '../utils/AppError.js';
import { toIsoUtc } from '../utils/time.js';

const hashCode = value => createHash('sha256').update(value).digest('hex');
const safeUser = user => Object.fromEntries(['id', 'nombre_completo', 'email_institucional', 'matricula_unison', 'rol', 'estado_cuenta'].map(key => [key, user[key]]));
export function createAuthService(db, config, logger = console) {
  const users = createUserRepository(db);
  const catalogs = createCatalogRepository(db);
  const notifications = createNotificationRepository(db);
  const snapshot = id => {
    const user = users.byId(id);
    const business = users.business(id);
    return { user: safeUser(user), business: business ? { id: business.id, nombre_negocio: business.nombre_negocio,
      slug: business.slug, esta_abierto: business.esta_abierto === 1, mostrar_ubicacion: business.mostrar_ubicacion === 1 } : null,
    unread_notifications: notifications.unreadCount(id) };
  };
  const removeOldCredential = relative => {
    if (!relative) return;
    try { deleteStoredFile(config.STORAGE_DIR, relative); }
    catch (error) { logger.error('No se pudo eliminar una credencial reemplazada del almacenamiento privado.', error); }
  };
  return {
    register(data, credentialPath) {
      let oldCredential;
      const password_hash = bcrypt.hashSync(data.password, 10);
      const result = db.transaction(() => {
        if (!catalogs.activeCategory(data.category_id)) throw new AppError(400, 'VALIDATION_ERROR', 'Selecciona una categoría activa.');
        const matches = users.matching(data);
        if (matches.length > 1 || matches.some(user => user.rol !== 'emprendedor' || !['rechazada', 'eliminada'].includes(user.estado_cuenta))) {
          throw new AppError(409, 'CONFLICT');
        }
        const previous = matches[0];
        if (previous && (previous.email_institucional.toLowerCase() !== data.email_institucional || previous.matricula_unison !== data.matricula_unison)) {
          throw new AppError(409, 'CONFLICT');
        }
        const account = { ...data, password_hash, credencial_path: credentialPath };
        let id;
        if (previous) {
          id = previous.id;
          oldCredential = previous.credencial_path;
          users.reuse({ ...account, id });
          users.invalidateResetCodes(id);
        } else id = users.insert(account);
        const business = users.business(id);
        const params = { ...data, user_id: id, slug: uniqueSlug(data.nombre_negocio, slug => users.slugExists(slug, id)) };
        if (business) users.updateBusiness(params);
        else {
          const business_id = users.insertBusiness(params);
          for (let dia_semana = 0; dia_semana < 7; dia_semana += 1) users.insertSchedule({ business_id, dia_semana });
        }
        return { user_id: id, estado_cuenta: 'pendiente', email_institucional: data.email_institucional, matricula_unison: data.matricula_unison };
      }).immediate();
      if (oldCredential && oldCredential !== credentialPath) removeOldCredential(oldCredential);
      return result;
    },
    login(data) {
      let user = users.byIdentifier(data.identificador);
      if (!user || user.estado_cuenta === 'eliminada' || !bcrypt.compareSync(data.password, user.password_hash)) throw new AppError(401, 'INVALID_CREDENTIALS');
      if (user.estado_cuenta === 'suspendida') {
        if (reactivateExpiredAccount(db, user.id, logger)) user = users.byId(user.id);
        else throw new AppError(403, 'ACCOUNT_SUSPENDED', undefined, { estado_cuenta: user.estado_cuenta, motivo_estado: user.motivo_estado, suspendida_hasta: user.suspendida_hasta });
      }
      if (user.estado_cuenta === 'pendiente') throw new AppError(403, 'ACCOUNT_PENDING', undefined, { estado_cuenta: user.estado_cuenta, fecha_solicitud: toIsoUtc(user.created_at) });
      if (user.estado_cuenta === 'rechazada') throw new AppError(403, 'ACCOUNT_REJECTED', undefined, { estado_cuenta: user.estado_cuenta, motivo_estado: user.motivo_estado, fecha_resolucion: user.fecha_resolucion });
      db.transaction(() => { users.touchLogin(user.id); if (user.rol === 'emprendedor') users.touchActivity(user.id); })();
      const token = jwt.sign({ sub: user.id, rol: user.rol, tv: user.token_version }, config.JWT_SECRET, { algorithm: 'HS256', expiresIn: config.JWT_EXPIRES_IN });
      return { token, ...snapshot(user.id) };
    },
    me: snapshot,
    requestStatus(data) {
      const result = users.requestStatus(data);
      if (!result) throw new AppError(404, 'NOT_FOUND');
      return result;
    },
    forgotPassword(data) {
      // También se genera un código ficticio para correos inexistentes: mismo sobre en desarrollo.
      const code = String(randomInt(100000, 1000000));
      const user = users.byEmail(data.email_institucional);
      if (user && user.estado_cuenta !== 'eliminada') {
        db.transaction(() => { users.invalidateResetCodes(user.id); users.insertResetCode({ user_id: user.id, codigo_hash: hashCode(code) }); })();
        logger.info(`[Recuperación de contraseña]\nPara: ${data.email_institucional}\nCódigo: ${code}\nVigencia: 15 minutos.`);
      }
      return { sent: true, ...(['development', 'test'].includes(config.NODE_ENV) ? { dev_codigo: code } : {}) };
    },
    resetPassword(data) {
      // El intento fallido debe confirmarse; lanzar dentro de la transacción lo revertiría.
      const changed = db.transaction(() => {
        const user = users.byEmail(data.email_institucional);
        if (!user || user.estado_cuenta === 'eliminada') return false;
        const reset = users.activeResetCode(user.id);
        if (!reset) return false;
        if (reset.codigo_hash !== hashCode(data.codigo_recuperacion)) { users.failedReset(reset.id); return false; }
        users.changePassword({ id: user.id, password_hash: bcrypt.hashSync(data.nueva_password, 10) });
        users.invalidateResetCodes(user.id);
        return true;
      }).immediate();
      if (!changed) throw new AppError(400, 'RESET_CODE_INVALID');
      return { restablecida: true };
    },
    removeAccount(id, password) {
      const user = users.byId(id);
      if (!user || !bcrypt.compareSync(password, user.password_hash)) throw new AppError(401, 'INVALID_CREDENTIALS');
      db.transaction(() => { users.deleteAccount(id); users.closeBusiness(id); users.invalidateResetCodes(id); users.auditDeletion(id); })();
      return { eliminada: true };
    },
    listNotifications: id => ({ items: notifications.list(id).map(item => ({ ...item, leida: item.leida === 1 })), unread_count: notifications.unreadCount(id) }),
    readNotification(userId, id) {
      if (!notifications.markRead(userId, id)) throw new AppError(404, 'NOT_FOUND');
      return { leida: true };
    },
    readAllNotifications: id => ({ actualizadas: notifications.markAllRead(id) })
  };
}
