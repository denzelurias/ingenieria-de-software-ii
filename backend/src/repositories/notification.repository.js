// Inserción compartida con F1 y bandeja de notificaciones de F2A.
export function createNotificationRepository(db) {
  const insert = db.prepare(`INSERT INTO notifications (user_id, tipo, titulo, mensaje)
    VALUES (:user_id, :tipo, :titulo, :mensaje)`);
  return {
    insert: notification => Number(insert.run(notification).lastInsertRowid),
    list: user_id => db.prepare('SELECT id, tipo, titulo, mensaje, leida, created_at FROM notifications WHERE user_id = :user_id ORDER BY created_at DESC, id DESC LIMIT 50').all({ user_id }),
    unreadCount: user_id => db.prepare('SELECT COUNT(*) AS total FROM notifications WHERE user_id = :user_id AND leida = 0').get({ user_id }).total,
    markRead: (user_id, id) => db.prepare('UPDATE notifications SET leida = 1 WHERE user_id = :user_id AND id = :id').run({ user_id, id }).changes,
    markAllRead: user_id => db.prepare('UPDATE notifications SET leida = 1 WHERE user_id = :user_id AND leida = 0').run({ user_id }).changes
  };
}
