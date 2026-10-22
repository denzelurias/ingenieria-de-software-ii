import slugify from 'slugify';

export const normalizar = value => value == null ? null : String(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
export const escapeLike = value => value.replace(/[\\%_]/g, character => '\\' + character);

// La consulta de existencia se inyecta desde un repositorio; esta utilidad no ejecuta SQL.
export function uniqueSlug(name, exists) {
  const base = slugify(name, { lower: true, strict: true, locale: 'es' }) || 'negocio';
  let candidate = base;
  for (let suffix = 2; exists(candidate); suffix += 1) candidate = `${base}-${suffix}`;
  return candidate;
}
