// Excepción de alcance autorizada: inserción base, sin bandeja ni endpoints de F2A.
export function createNotificationRepository(db) {
  const insert = db.prepare(`INSERT INTO notifications (user_id, tipo, titulo, mensaje)
    VALUES (:user_id, :tipo, :titulo, :mensaje)`);
  return { insert: notification => Number(insert.run(notification).lastInsertRowid) };
}
