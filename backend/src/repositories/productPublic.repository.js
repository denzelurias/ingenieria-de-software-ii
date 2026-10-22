import { businessJoins, visibleBusiness } from './businessPublic.repository.js';
const filters = String.raw`WHERE ${visibleBusiness} AND p.estado = 'activo'
  AND (:q_like IS NULL OR normalizar(p.nombre) LIKE :q_like ESCAPE '\' OR normalizar(p.descripcion) LIKE :q_like ESCAPE '\')
  AND (:category_id IS NULL OR b.category_id = :category_id)
  AND (:zone_id IS NULL OR (b.mostrar_ubicacion = 1 AND b.campus_zone_id = :zone_id))
  AND (:open_now IS NULL OR b.esta_abierto = :open_now)
  AND p.precio >= COALESCE(:min_price, 0) AND p.precio <= COALESCE(:max_price, 99999.99)`;
const SORT_CLAUSES = Object.freeze({ price_asc: 'p.precio ASC, p.id ASC', price_desc: 'p.precio DESC, p.id ASC',
  alpha_asc: 'normalizar(p.nombre) ASC, p.id ASC', open_now: 'b.esta_abierto DESC, normalizar(p.nombre) ASC, p.id ASC' });
export function createProductPublicRepository(db) {
  const joins = `${businessJoins} JOIN products p ON p.business_id = b.id`;
  return { list(params, sort) {
    const order = Object.hasOwn(SORT_CLAUSES, sort) ? SORT_CLAUSES[sort] : SORT_CLAUSES.open_now;
    const items = db.prepare(`SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen_url,
      b.id AS negocio_id, b.nombre_negocio, b.slug, b.foto_perfil_url, b.esta_abierto, b.mostrar_ubicacion, c.nombre AS category_nombre,
      CASE WHEN b.mostrar_ubicacion = 1 THEN z.id END AS campus_zone_id,
      CASE WHEN b.mostrar_ubicacion = 1 THEN z.codigo END AS zona_codigo,
      CASE WHEN b.mostrar_ubicacion = 1 THEN z.nombre END AS zona_nombre,
      CASE WHEN b.mostrar_ubicacion = 1 THEN b.ubicacion_detalle END AS ubicacion_detalle
      ${joins} ${filters} ORDER BY ${order} LIMIT :limit OFFSET :offset`).all(params);
    const total = db.prepare(`SELECT COUNT(*) AS total ${joins} ${filters}`).get(params).total;
    return { items, total };
  } };
}
