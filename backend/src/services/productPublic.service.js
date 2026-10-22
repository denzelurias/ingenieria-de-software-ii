import { createProductPublicRepository } from '../repositories/productPublic.repository.js';
import { publicQueryParams, pagination } from './businessPublic.service.js';
import { sanitizePublicBusiness } from './serializers.js';
export function createProductPublicService(db) {
  const repository = createProductPublicRepository(db);
  return { list(query) {
    const result = repository.list(publicQueryParams(query), query.sort);
    return { items: result.items.map(row => ({
      id: row.id, nombre: row.nombre, descripcion: row.descripcion, precio: row.precio, imagen_url: row.imagen_url,
      business: sanitizePublicBusiness({ id: row.negocio_id, nombre_negocio: row.nombre_negocio, slug: row.slug,
        foto_perfil_url: row.foto_perfil_url, esta_abierto: row.esta_abierto, category_nombre: row.category_nombre,
        mostrar_ubicacion: row.mostrar_ubicacion, campus_zone_id: row.campus_zone_id, zona_codigo: row.zona_codigo,
        zona_nombre: row.zona_nombre, ubicacion_detalle: row.ubicacion_detalle })
    })), meta: pagination(query, result.total) };
  } };
}
