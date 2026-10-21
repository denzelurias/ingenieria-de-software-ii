// Excepción de alcance autorizada: únicamente las operaciones que necesita requireAuth en F1.
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
    auditReactivation: id => audit.run({ id, detalles: JSON.stringify({ motivo: 'Suspensión temporal vencida' }) })
  };
}
