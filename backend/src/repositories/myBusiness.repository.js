import { businessSelect, businessJoins } from './businessPublic.repository.js';
export function createMyBusinessRepository(db) {
  return {
    find: id => db.prepare(`SELECT b.*, c.nombre AS category_nombre, c.slug AS category_slug, c.icono AS category_icono,
      z.codigo AS zona_codigo, z.nombre AS zona_nombre FROM businesses b JOIN categories c ON c.id = b.category_id
      LEFT JOIN campus_zones z ON z.id = b.campus_zone_id WHERE b.id = :id`).get({ id }),
    preview: params => db.prepare(`${businessSelect} ${businessJoins} WHERE b.id = :id`).get(params),
    touchActivity: id => db.prepare('UPDATE businesses SET last_activity_at = CURRENT_TIMESTAMP, inactivo_oculto = 0 WHERE id = :id').run({ id }),
    category: id => db.prepare('SELECT id, activa FROM categories WHERE id = :id').get({ id }),
    zone: id => db.prepare('SELECT id FROM campus_zones WHERE id = :id AND activa = 1').get({ id }),
    slugExists: (slug, id) => Boolean(db.prepare('SELECT id FROM businesses WHERE slug = :slug AND id <> :id').get({ slug, id })),
    profile: params => db.prepare('UPDATE businesses SET nombre_negocio = :nombre_negocio, slug = :slug, category_id = :category_id, descripcion = :descripcion WHERE id = :id').run(params),
    photos: params => db.prepare('UPDATE businesses SET foto_perfil_url = :foto_perfil_url, foto_menu_url = :foto_menu_url WHERE id = :id').run(params),
    open: (id, value) => db.prepare('UPDATE businesses SET esta_abierto = :value WHERE id = :id').run({ id, value }),
    location: params => db.prepare('UPDATE businesses SET campus_zone_id = :campus_zone_id, ubicacion_detalle = :ubicacion_detalle, mostrar_ubicacion = :mostrar_ubicacion WHERE id = :id').run(params),
    clearSchedules: id => db.prepare('DELETE FROM business_schedules WHERE business_id = :id').run({ id }),
    schedule: params => db.prepare('INSERT INTO business_schedules (business_id, dia_semana, hora_apertura, hora_cierre, cerrado_todo_el_dia) VALUES (:business_id, :dia_semana, :hora_apertura, :hora_cierre, :cerrado_todo_el_dia)').run(params),
    clearContacts: id => db.prepare('DELETE FROM business_contacts WHERE business_id = :id').run({ id }),
    contact: params => db.prepare('INSERT INTO business_contacts (business_id, tipo_contacto, valor, etiqueta, es_principal, orden) VALUES (:business_id, :tipo_contacto, :valor, :etiqueta, :es_principal, :orden)').run(params)
  };
}
