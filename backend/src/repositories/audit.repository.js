export function createAuditRepository(db) {
  const insert = db.prepare('INSERT INTO audit_logs (actor_id, accion, entidad_tipo, entidad_id, detalles) VALUES (:actor_id, :accion, :entidad_tipo, :entidad_id, :detalles)');
  return {
    record: (actor_id, accion, entidad_tipo, entidad_id = null, detalles = null) => insert.run({ actor_id, accion, entidad_tipo, entidad_id, detalles: detalles === null ? null : JSON.stringify(detalles) }),
    list(params) {
      const where = 'WHERE (:accion IS NULL OR accion = :accion) AND (:entidad_tipo IS NULL OR entidad_tipo = :entidad_tipo)';
      return { items: db.prepare(`SELECT * FROM audit_logs ${where} ORDER BY id DESC LIMIT :limit OFFSET :offset`).all(params),
        total: db.prepare(`SELECT COUNT(*) AS total FROM audit_logs ${where}`).get(params).total };
    }
  };
}
