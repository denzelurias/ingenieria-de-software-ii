import { getDb } from '../config/db.js';
import { createNotificationRepository } from '../repositories/notification.repository.js';
import { createUserRepository } from '../repositories/user.repository.js';

export function createNotificationService(db, logger = console) {
  const repository = createNotificationRepository(db);
  return {
    notify(notification) {
      const id = repository.insert(notification);
      logger.info(`[Notificación] usuario=${notification.user_id} tipo=${notification.tipo}: ${notification.titulo}`);
      return id;
    }
  };
}

export function notify(notification) {
  return createNotificationService(getDb()).notify(notification);
}

// Operación transversal requerida por requireAuth; el barrido periódico pertenece a F2B.
export function reactivateExpiredAccount(db, id, logger = console) {
  const users = createUserRepository(db);
  const notifications = createNotificationRepository(db);
  const changed = db.transaction(() => {
    if (!users.reactivateExpired(id)) return false;
    notifications.insert({ user_id: id, tipo: 'cuenta_reactivada', titulo: 'Cuenta reactivada',
      mensaje: 'Tu suspensión temporal terminó. Ya puedes acceder a tu cuenta.' });
    users.auditReactivation(id);
    return true;
  })();
  if (changed) logger.info(`[Notificación] usuario=${id} tipo=cuenta_reactivada: Cuenta reactivada`);
  return changed;
}
