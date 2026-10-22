import { z } from 'zod';
export const idParams = z.object({ id: z.coerce.number().int().positive().safe() });
export const profileBody = z.object({ nombre_negocio: z.string().trim().min(2).max(80), category_id: z.number().int().positive().safe(), descripcion: z.string().trim().max(1000) });
export const openBody = z.object({ esta_abierto: z.boolean() });
export const locationBody = z.object({ mostrar_ubicacion: z.boolean().optional(), campus_zone_id: z.number().int().positive().safe().nullable().optional(),
  ubicacion_detalle: z.string().trim().max(120).optional() }).refine(data => Object.keys(data).length > 0, 'Envía al menos un campo.');
export const photoParams = z.object({ tipo: z.enum(['perfil', 'menu']) });
const hour = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable();
export const schedulesBody = z.object({ schedules: z.array(z.object({ dia_semana: z.number().int().min(0).max(6), cerrado_todo_el_dia: z.boolean(),
  hora_apertura: hour, hora_cierre: hour }).refine(day => day.cerrado_todo_el_dia || (day.hora_apertura !== null && day.hora_cierre !== null && day.hora_apertura < day.hora_cierre), 'Revisa la apertura y el cierre.')).length(7)
  .refine(days => new Set(days.map(day => day.dia_semana)).size === 7, 'Incluye los siete días sin repetir.') });

function normalizeContact(data, ctx) {
  let value = data.valor.trim();
  if (['whatsapp', 'telefono'].includes(data.tipo_contacto)) {
    value = value.replace(/[\s()+-]/g, '');
    if (value.length === 13 && value.startsWith('521')) value = value.slice(3);
    else if (value.length === 12 && value.startsWith('52')) value = value.slice(2);
    if (!/^\d{10}$/.test(value)) ctx.addIssue({ code: 'custom', path: ['valor'], message: 'Escribe un teléfono de 10 dígitos.' });
  } else if (['instagram', 'tiktok'].includes(data.tipo_contacto)) {
    if (/^https?:\/\//i.test(value)) {
      try {
        const url = new URL(value);
        const allowed = data.tipo_contacto === 'instagram' ? ['instagram.com', 'www.instagram.com'] : ['tiktok.com', 'www.tiktok.com'];
        if (!allowed.includes(url.hostname) || !/^\/@?[A-Za-z0-9._]+\/?$/.test(url.pathname)) throw new Error();
        value = url.pathname.replace(/^\/@?/, '').replace(/\/$/, '');
      } catch { ctx.addIssue({ code: 'custom', path: ['valor'], message: 'Escribe un perfil válido de esa red social.' }); }
    } else value = value.replace(/^@/, '');
    if (!/^[A-Za-z0-9._]{1,30}$/.test(value)) ctx.addIssue({ code: 'custom', path: ['valor'], message: 'Revisa el nombre de usuario.' });
  } else {
    try { const url = new URL(value); if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error(); }
    catch { ctx.addIssue({ code: 'custom', path: ['valor'], message: 'Usa una dirección http o https válida.' }); }
  }
  return { ...data, valor: value };
}
export const contactsBody = z.object({ contacts: z.array(z.object({ tipo_contacto: z.enum(['whatsapp', 'telefono', 'instagram', 'facebook', 'tiktok', 'otro']),
  valor: z.string().min(1).max(200), etiqueta: z.string().trim().max(40).optional(), es_principal: z.boolean() }).transform(normalizeContact)).max(10)
  .refine(items => items.filter(item => item.es_principal).length <= 1, 'Selecciona un solo contacto principal.') });
