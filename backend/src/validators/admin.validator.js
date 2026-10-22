import { z } from 'zod';
const id = z.coerce.number().int().positive().safe();
const reason = z.string().trim().min(5).max(500);
export const userParams = z.object({ userId: id });
export const productParams = z.object({ productId: id });
export const reportParams = z.object({ reportId: id });
export const categoryParams = z.object({ id });
export const backupParams = z.object({ filename: z.string().regex(/^emprendebuho_\d{8}_\d{6}\.sqlite$/) });
const pagination = { page: id.default(1), limit: id.max(50).default(24) };
const paginated = schema => schema.refine(data => Number.isSafeInteger((data.page - 1) * data.limit), 'La página está fuera del rango permitido.');
export const requestsQuery = paginated(z.object({ ...pagination, status: z.enum(['pendiente', 'aprobada', 'rechazada', 'suspendida']).default('pendiente'), q: z.string().trim().min(1).max(120).optional() }));
export const productsQuery = paginated(z.object({ ...pagination, estado: z.enum(['oculto_admin', 'activo', 'pausado']).optional(), q: z.string().trim().min(1).max(120).optional(), business_id: id.optional() }));
export const reportsQuery = paginated(z.object({ ...pagination, estado: z.enum(['pendiente', 'en_revision', 'resuelto_con_sancion', 'desestimado']).optional(), business_id: id.optional() }));
export const auditQuery = paginated(z.object({ ...pagination, accion: z.string().max(100).optional(), entidad_tipo: z.enum(['user', 'business', 'product', 'report', 'category', 'system']).optional() }));
export const decisionBody = z.object({ decision: z.enum(['aprobada', 'rechazada']), motivo: reason.optional() })
  .refine(data => data.decision !== 'rechazada' || data.motivo, 'Explica el motivo del rechazo.');
export const suspensionBody = z.object({ suspend: z.boolean(), motivo: reason.optional(), hasta: z.iso.date().optional() })
  .refine(data => !data.suspend || data.motivo, 'Explica el motivo de la suspensión.');
export const moderationBody = z.object({ ocultar: z.boolean(), motivo_moderacion: reason.optional() })
  .refine(data => !data.ocultar || data.motivo_moderacion, 'Explica el motivo de la moderación.');
export const resolveBody = z.object({ estado_reporte: z.enum(['en_revision', 'resuelto_con_sancion', 'desestimado']), notas_admin: z.string().trim().max(1000).default(''),
  accion_automatica: z.enum(['ninguna', 'ocultar_producto', 'suspender_cuenta']), motivo_sancion: reason.optional() })
  .refine(data => data.accion_automatica === 'ninguna' || data.motivo_sancion, 'Explica el motivo de la sanción.');
const categoryFields = { nombre: z.string().trim().min(2).max(60), descripcion: z.string().trim().max(200).default(''), icono: z.string().regex(/^[A-Za-z][A-Za-z0-9]{0,59}$/), activa: z.boolean().default(true) };
export const createCategoryBody = z.object(categoryFields);
export const editCategoryBody = z.object({ ...categoryFields, descripcion: z.string().trim().max(200), activa: z.boolean() }).partial().refine(data => Object.keys(data).length > 0, 'Envía al menos un campo.');
