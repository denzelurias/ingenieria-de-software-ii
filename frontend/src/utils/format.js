import { TIME_ZONE } from './constants.js';
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function formatCurrency(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? currency.format(Number(value)) : 'Sin precio';
}
export function formatPriceRange(minimum, maximum) {
  if (minimum == null) return 'Sin precios publicados';
  return maximum == null || Number(minimum) === Number(maximum) ? formatCurrency(minimum) : `${formatCurrency(minimum)} – ${formatCurrency(maximum)}`;
}
export function formatDate(value, options = {}) {
  if (!value) return 'Sin fecha';
  const normalized = typeof value === 'string' && /^\d{4}-\d{2}-\d{2} /.test(value) ? value.replace(' ', 'T') + 'Z' : value;
  const date = value instanceof Date ? value : new Date(normalized);
  if (!Number.isFinite(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-MX', { timeZone: TIME_ZONE, dateStyle: 'medium', ...options }).format(date);
}
export function getInitials(name = '') {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => Array.from(word)[0]).join('').toLocaleUpperCase('es-MX') || 'EB';
}
