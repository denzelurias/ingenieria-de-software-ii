// Conserva el contrato usado por F1 y agrega las operaciones de cuenta de F2A.
export function createUserRepository(db) {
  const find = db.prepare(`SELECT u.id, u.rol, u.estado_cuenta, u.motivo_estado, u.suspendida_hasta, u.token_version,
    b.id AS businessId FROM users u LEFT JOIN businesses b ON b.user_id = u.id WHERE u.id = :sub`);
  const reactivate = db.prepare(`UPDATE users SET estado_cuenta = 'aprobada', motivo_estado = NULL, suspendida_hasta = NULL
    WHERE id = :id AND estado_cuenta = 'suspendida' AND suspendida_hasta IS NOT NULL
      AND datetime(suspendida_hasta) <= CURRENT_TIMESTAMP`);
  const audit = db.prepare(`INSERT INTO audit_logs (actor_id, accion, entidad_tipo, entidad_id, detalles)
    VALUES (NULL, 'reactivar_cuenta', 'user', :id, :detalles)`);
  return {
    findForAuth: sub => find.get({ sub }),
    reactivateExpired: id => reactivate.run({ id }).changes > 0,
    auditReactivation: id => audit.run({ id, detalles: JSON.stringify({ motivo: 'Suspensión temporal vencida' }) }),
    byId: id => db.prepare('SELECT * FROM users WHERE id = :id').get({ id }),
    byIdentifier: identificador => db.prepare('SELECT * FROM users WHERE email_institucional = :identificador OR matricula_unison = :identificador').get({ identificador }),
    byEmail: email => db.prepare('SELECT * FROM users WHERE email_institucional = :email').get({ email }),
    matching: params => db.prepare('SELECT * FROM users WHERE email_institucional = :email_institucional OR matricula_unison = :matricula_unison').all(params),
    insert: params => Number(db.prepare(`INSERT INTO users (nombre_completo, email_institucional, matricula_unison, password_hash, credencial_path)
      VALUES (:nombre_completo, :email_institucional, :matricula_unison, :password_hash, :credencial_path)`).run(params).lastInsertRowid),
    reuse: params => db.prepare(`UPDATE users SET nombre_completo = :nombre_completo, email_institucional = :email_institucional,
      matricula_unison = :matricula_unison, password_hash = :password_hash, credencial_path = :credencial_path,
      estado_cuenta = 'pendiente', motivo_estado = NULL, suspendida_hasta = NULL, resuelto_por = NULL,
      fecha_resolucion = NULL, last_login_at = NULL, token_version = token_version + 1 WHERE id = :id`).run(params),
    business: user_id => db.prepare('SELECT * FROM businesses WHERE user_id = :user_id').get({ user_id }),
    slugExists: (slug, user_id) => Boolean(db.prepare('SELECT id FROM businesses WHERE slug = :slug AND user_id <> :user_id').get({ slug, user_id })),
    insertBusiness: params => Number(db.prepare(`INSERT INTO businesses (user_id, nombre_negocio, slug, category_id, descripcion)
      VALUES (:user_id, :nombre_negocio, :slug, :category_id, :descripcion)`).run(params).lastInsertRowid),
    updateBusiness: params => db.prepare(`UPDATE businesses SET nombre_negocio = :nombre_negocio, slug = :slug, category_id = :category_id,
      descripcion = :descripcion, esta_abierto = 0, mostrar_ubicacion = 0, inactivo_oculto = 0, last_activity_at = CURRENT_TIMESTAMP
      WHERE user_id = :user_id`).run(params),
    insertSchedule: params => db.prepare('INSERT INTO business_schedules (business_id, dia_semana) VALUES (:business_id, :dia_semana)').run(params),
    touchLogin: id => db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = :id').run({ id }),
    touchActivity: user_id => db.prepare('UPDATE businesses SET last_activity_at = CURRENT_TIMESTAMP, inactivo_oculto = 0 WHERE user_id = :user_id').run({ user_id }),
    requestStatus: params => db.prepare(`SELECT u.estado_cuenta, u.motivo_estado, u.suspendida_hasta, u.created_at, u.fecha_resolucion, b.nombre_negocio
      FROM users u LEFT JOIN businesses b ON b.user_id = u.id WHERE u.email_institucional = :email_institucional AND u.matricula_unison = :matricula_unison`).get(params),
    invalidateResetCodes: user_id => db.prepare('UPDATE password_reset_tokens SET usado = 1 WHERE user_id = :user_id AND usado = 0').run({ user_id }),
    insertResetCode: params => db.prepare("INSERT INTO password_reset_tokens (user_id, codigo_hash, expires_at) VALUES (:user_id, :codigo_hash, datetime('now', '+15 minutes'))").run(params),
    activeResetCode: user_id => db.prepare(`SELECT * FROM password_reset_tokens WHERE user_id = :user_id AND usado = 0
      AND expires_at > CURRENT_TIMESTAMP AND intentos < 5 ORDER BY id DESC LIMIT 1`).get({ user_id }),
    failedReset: id => db.prepare('UPDATE password_reset_tokens SET intentos = intentos + 1, usado = CASE WHEN intentos + 1 >= 5 THEN 1 ELSE usado END WHERE id = :id').run({ id }),
    changePassword: params => db.prepare('UPDATE users SET password_hash = :password_hash, token_version = token_version + 1 WHERE id = :id').run(params),
    deleteAccount: id => db.prepare("UPDATE users SET estado_cuenta = 'eliminada', token_version = token_version + 1 WHERE id = :id").run({ id }),
    closeBusiness: user_id => db.prepare('UPDATE businesses SET esta_abierto = 0, mostrar_ubicacion = 0 WHERE user_id = :user_id').run({ user_id }),
    auditDeletion: id => db.prepare("INSERT INTO audit_logs (actor_id, accion, entidad_tipo, entidad_id) VALUES (:id, 'eliminar_cuenta', 'user', :id)").run({ id })
  };
}
