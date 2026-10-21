import { serializeDates } from '../utils/response.js';

const businessFields = [
  'id', 'nombre_negocio', 'slug', 'descripcion', 'foto_perfil_url', 'foto_menu_url',
  'esta_abierto', 'mostrar_ubicacion', 'en_horario_ahora', 'category_id', 'category_nombre', 'category_slug',
  'category_icono', 'campus_zone_id', 'zona_codigo', 'zona_nombre', 'ubicacion_detalle',
  'precio_minimo', 'precio_maximo', 'created_at', 'updated_at'
];
const pick = (row, fields) => Object.fromEntries(fields.filter(key => Object.hasOwn(row, key)).map(key => [key, row[key]]));
const asBoolean = value => value === true || value === 1;

export function sanitizePublicBusiness(row) {
  if (row == null) return null;
  const business = pick(row, businessFields);
  for (const field of ['esta_abierto', 'mostrar_ubicacion', 'en_horario_ahora']) business[field] = asBoolean(row[field]);
  if (!business.mostrar_ubicacion) {
    for (const field of ['campus_zone_id', 'zona_codigo', 'zona_nombre', 'ubicacion_detalle']) business[field] = null;
  }
  if (row.products) business.products = row.products.filter(product => ['activo', 'pausado'].includes(product.estado)).map(publicProduct);
  if (row.contacts) business.contacts = row.contacts.map(contact => ({
    ...pick(contact, ['id', 'tipo_contacto', 'valor', 'etiqueta', 'orden']), es_principal: asBoolean(contact.es_principal)
  }));
  if (row.schedules) business.schedules = row.schedules.map(schedule => ({
    ...pick(schedule, ['dia_semana', 'hora_apertura', 'hora_cierre']), cerrado_todo_el_dia: asBoolean(schedule.cerrado_todo_el_dia)
  }));
  return serializeDates(business);
}

export function publicProduct(row) {
  if (row == null) return null;
  const product = pick(row, ['id', 'business_id', 'nombre', 'descripcion', 'precio', 'imagen_url', 'estado', 'created_at', 'updated_at']);
  if (row.business) product.business = sanitizePublicBusiness(row.business);
  return serializeDates(product);
}
