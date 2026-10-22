import { z } from 'zod';
const positive = z.coerce.number().int().positive().safe();
const price = z.string().regex(/^\d+(?:\.\d{1,2})?$/).transform(Number).pipe(z.number().finite().nonnegative());
const common = {
  q: z.string().trim().min(2).max(60).optional(), category_id: positive.optional(), zone_id: positive.optional(),
  open_now: z.enum(['true', 'false']).optional(), min_price: price.optional(), max_price: price.optional(),
  page: positive.default(1), limit: positive.max(50).default(24)
};
const priceRange = (data, ctx) => {
  if (!Number.isSafeInteger((data.page - 1) * data.limit)) {
    ctx.addIssue({ code: 'custom', path: ['page'], message: 'La página solicitada está fuera del rango permitido.' });
  }
  if (data.min_price !== undefined && data.max_price !== undefined && data.min_price > data.max_price) {
    ctx.addIssue({ code: 'custom', path: ['max_price'], message: 'El precio máximo debe ser mayor o igual al mínimo.' });
  }
};
export const businessQuery = z.object({ ...common,
  day_of_week: z.coerce.number().int().min(0).max(6).optional(), time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).optional(),
  available_now: z.literal('true').optional(), preferred_zone_id: positive.optional(),
  // Favoritos resilientes: las entradas que no son IDs se omiten, nunca se interpolan en SQL.
  ids: z.string().max(2100).refine(value => value.split(',').length <= 100).transform(value =>
    [...new Set(value.split(',').filter(id => /^\d+$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id) > 0).map(Number))]).optional(),
  sort: z.enum(['open_now', 'alpha_asc', 'alpha_desc', 'proximity']).default('open_now')
}).superRefine((data, ctx) => {
  priceRange(data, ctx);
  if ((data.day_of_week === undefined) !== (data.time === undefined)) {
    ctx.addIssue({ code: 'custom', path: ['time'], message: 'Envía juntos el día y la hora.' });
  }
});
export const productQuery = z.object({ ...common, sort: z.enum(['price_asc', 'price_desc', 'alpha_asc', 'open_now']).default('open_now') }).superRefine(priceRange);
export const slugParams = z.object({ slug: z.string().min(1).max(160).regex(/^[a-z0-9-]+$/) });
export const notificationParams = z.object({ id: positive });
