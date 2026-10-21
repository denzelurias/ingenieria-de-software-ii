import { toIsoUtc } from './time.js';

export function serializeDates(value) {
  if (Array.isArray(value)) return value.map(serializeDates);
  if (value instanceof Date) return toIsoUtc(value);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, /(_at|_hasta)$/.test(key) || key === 'fecha_resolucion'
      ? toIsoUtc(item) : serializeDates(item)])
  );
  return value;
}

export function ok(res, data = {}, message, meta) {
  return res.json({ ok: true, data: serializeDates(data), ...(message ? { message } : {}), ...(meta ? { meta } : {}) });
}
