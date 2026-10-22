import fs from 'node:fs';
import { createAdminRepository, adminListParams } from '../repositories/admin.repository.js';
import { createAuditRepository } from '../repositories/audit.repository.js';
import { createNotificationRepository } from '../repositories/notification.repository.js';
import { pagination } from './businessPublic.service.js';
import { uniqueSlug } from '../utils/text.js';
import { safePath } from '../utils/files.js';
import { AppError } from '../utils/AppError.js';

export function createAdminService(db, config) {
  const repository = createAdminRepository(db);
  const audit = createAuditRepository(db);
  const notifications = createNotificationRepository(db);
  function run(operation) {
    const posted = [];
    const notify = notification => { notifications.insert(notification); posted.push(notification); };
    const result = db.transaction(() => operation(notify)).immediate();
    for (const item of posted) console.info(`[Notificación] usuario=${item.user_id} tipo=${item.tipo}: ${item.titulo}`);
    return result;
  }
  const user = id => { const row = repository.user(id); if (!row) throw new AppError(404, 'NOT_FOUND'); return row; };
  function suspend(actor, id, data, notify) {
    const target = user(id);
    if (target.rol === 'admin') throw new AppError(403, 'FORBIDDEN');
    if (!['aprobada', 'suspendida'].includes(target.estado_cuenta) || (!data.suspend && target.estado_cuenta !== 'suspendida')) throw new AppError(409, 'CONFLICT', 'La cuenta no está en un estado que permita esta acción.');
    repository.suspend({ id, estado_cuenta: data.suspend ? 'suspendida' : 'aprobada', motivo: data.suspend ? data.motivo : null, hasta: data.suspend && data.hasta ? data.hasta + ' 00:00:00' : null });
    if (data.suspend) repository.closeBusiness(id);
    notify({ user_id: id, tipo: data.suspend ? 'cuenta_suspendida' : 'cuenta_reactivada', titulo: data.suspend ? 'Cuenta suspendida' : 'Cuenta reactivada',
      mensaje: data.suspend ? data.motivo : 'Tu cuenta está activa nuevamente.' });
    audit.record(actor, data.suspend ? 'suspender_cuenta' : 'reactivar_cuenta', 'user', id, { motivo: data.motivo ?? null, hasta: data.hasta ?? null });
    return user(id);
  }
  function moderate(actor, id, data, notify) {
    const product = repository.product(id);
    if (!product) throw new AppError(404, 'NOT_FOUND');
    repository.moderate({ id, estado: data.ocultar ? 'oculto_admin' : 'activo', motivo: data.ocultar ? data.motivo_moderacion : null, actor_id: data.ocultar ? actor : null });
    notify({ user_id: product.user_id, tipo: data.ocultar ? 'producto_oculto' : 'producto_restaurado', titulo: data.ocultar ? 'Producto oculto' : 'Producto restaurado',
      mensaje: data.ocultar ? data.motivo_moderacion : `Tu producto ${product.nombre} vuelve a estar visible.` });
    audit.record(actor, data.ocultar ? 'ocultar_producto' : 'restaurar_producto', 'product', id, { motivo: data.motivo_moderacion ?? null });
    const result = repository.product(id); delete result.user_id; return result;
  }
  const listing = (query, operation) => { const result = operation(adminListParams(query)); return { items: result.items, meta: pagination(query, result.total) }; };
  return {
    stats: repository.stats,
    requests: query => listing(query, repository.requests),
    credential(id) {
      const row = repository.credential(id);
      if (!row?.credencial_path || !/^credentials[\\/][^\\/]+$/.test(row.credencial_path)) throw new AppError(404, 'NOT_FOUND');
      const target = safePath(config.STORAGE_DIR, row.credencial_path);
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) throw new AppError(404, 'NOT_FOUND');
      return target;
    },
    decide(actor, id, data) {
      return run(notify => {
        const target = user(id);
        if (target.rol !== 'emprendedor') throw new AppError(403, 'FORBIDDEN');
        if (target.estado_cuenta !== 'pendiente') throw new AppError(409, 'CONFLICT', 'La solicitud ya fue resuelta.');
        repository.decision({ id, actor_id: actor, decision: data.decision, motivo: data.decision === 'rechazada' ? data.motivo : null });
        notify({ user_id: id, tipo: data.decision === 'aprobada' ? 'cuenta_aprobada' : 'cuenta_rechazada',
          titulo: data.decision === 'aprobada' ? 'Solicitud aprobada' : 'Solicitud rechazada', mensaje: data.decision === 'aprobada' ? 'Tu solicitud fue aprobada. Ya puedes iniciar sesión.' : data.motivo });
        audit.record(actor, data.decision === 'aprobada' ? 'aprobar_cuenta' : 'rechazar_cuenta', 'user', id, { motivo: data.motivo ?? null });
        return user(id);
      });
    },
    suspend: (actor, id, data) => run(notify => suspend(actor, id, data, notify)),
    products(query) {
      const result = listing(query, repository.products);
      result.items = result.items.map(row => ({ ...row, editado_tras_moderacion: row.editado_tras_moderacion === 1 })); return result;
    },
    moderate: (actor, id, data) => run(notify => moderate(actor, id, data, notify)),
    reports: query => listing(query, repository.reports),
    resolve(actor, id, data) {
      return run(notify => {
        const report = repository.report(id);
        if (!report) throw new AppError(404, 'NOT_FOUND');
        if (data.accion_automatica === 'ocultar_producto') {
          if (!report.product_id) throw new AppError(400, 'VALIDATION_ERROR', 'El reporte no tiene un producto asociado.');
          const product = repository.product(report.product_id);
          if (!product || product.business_id !== report.business_id) throw new AppError(404, 'NOT_FOUND');
          moderate(actor, report.product_id, { ocultar: true, motivo_moderacion: data.motivo_sancion }, notify);
        } else if (data.accion_automatica === 'suspender_cuenta') suspend(actor, report.user_id, { suspend: true, motivo: data.motivo_sancion }, notify);
        const estado_reporte = data.accion_automatica === 'ninguna' ? data.estado_reporte : 'resuelto_con_sancion';
        repository.resolve({ ...data, id, actor_id: actor, estado_reporte });
        audit.record(actor, 'resolver_reporte', 'report', id, { estado_reporte, accion_automatica: data.accion_automatica });
        return { id, estado_reporte };
      });
    },
    categories: () => repository.categories().map(row => ({ ...row, activa: row.activa === 1 })),
    saveCategory(actor, id, data) {
      return run(() => {
        const previous = id ? repository.category(id) : null;
        if (id && !previous) throw new AppError(404, 'NOT_FOUND');
        const result = { ...previous, ...data };
        result.slug = !previous || previous.nombre !== result.nombre ? uniqueSlug(result.nombre, slug => repository.categorySlugExists(slug, id ?? 0)) : previous.slug;
        result.activa = result.activa ? 1 : 0;
        const categoryId = id ?? repository.createCategory(result);
        if (id) repository.editCategory({ ...result, id });
        audit.record(actor, id ? 'editar_categoria' : 'crear_categoria', 'category', categoryId, { nombre: result.nombre, activa: Boolean(result.activa) });
        return { ...repository.category(categoryId), activa: Boolean(result.activa) };
      });
    },
    auditLogs(query) {
      const result = audit.list({ accion: query.accion ?? null, entidad_tipo: query.entidad_tipo ?? null, limit: query.limit, offset: (query.page - 1) * query.limit });
      return { items: result.items.map(row => ({ ...row, detalles: row.detalles ? JSON.parse(row.detalles) : null })), meta: pagination(query, result.total) };
    }
  };
}
