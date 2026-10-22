import { createBusinessPublicRepository } from '../repositories/businessPublic.repository.js';
import { createCatalogRepository } from '../repositories/catalog.repository.js';
import { sanitizePublicBusiness } from './serializers.js';
import { normalizar, escapeLike } from '../utils/text.js';
import { nowInHermosillo } from '../utils/time.js';
import { AppError } from '../utils/AppError.js';

export function publicQueryParams(query, now = nowInHermosillo()) {
  return {
    q_like: query.q === undefined ? null : `%${escapeLike(normalizar(query.q))}%`,
    category_id: query.category_id ?? null, zone_id: query.zone_id ?? null,
    open_now: query.open_now === undefined ? null : (query.open_now === 'true' ? 1 : 0),
    min_price: query.min_price ?? null, max_price: query.max_price ?? null,
    ids_json: query.ids === undefined ? null : JSON.stringify(query.ids),
    day_of_week: query.available_now === 'true' ? now.dow : query.day_of_week ?? null,
    time: query.available_now === 'true' ? now.time : query.time ?? null,
    now_dow: now.dow, now_time: now.time, px: null, py: null,
    limit: query.limit, offset: (query.page - 1) * query.limit
  };
}
export const pagination = (query, total) => ({ page: query.page, limit: query.limit, total, total_pages: Math.ceil(total / query.limit) });
export function createBusinessPublicService(db, clock = nowInHermosillo) {
  const repository = createBusinessPublicRepository(db);
  const catalogs = createCatalogRepository(db);
  return {
    list(query) {
      const params = publicQueryParams(query, clock());
      let sort = query.sort;
      if (sort === 'proximity') {
        const zone = query.preferred_zone_id && catalogs.zone(query.preferred_zone_id);
        if (zone && zone.mapa_x !== null && zone.mapa_y !== null) { params.px = zone.mapa_x; params.py = zone.mapa_y; }
        else sort = 'open_now';
      }
      const result = repository.list(params, sort);
      return { items: result.items.map(sanitizePublicBusiness), meta: pagination(query, result.total) };
    },
    detail(slug) {
      const now = clock();
      const row = repository.detail({ slug, now_dow: now.dow, now_time: now.time });
      if (!row) throw new AppError(404, 'NOT_FOUND');
      return sanitizePublicBusiness({ ...row, schedules: repository.schedules(row.id), contacts: repository.contacts(row.id), products: repository.products(row.id) });
    }
  };
}
