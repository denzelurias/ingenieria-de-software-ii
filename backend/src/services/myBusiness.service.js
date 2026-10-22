import fs from 'node:fs';
import { createMyBusinessRepository } from '../repositories/myBusiness.repository.js';
import { createProductRepository } from '../repositories/product.repository.js';
import { createBusinessPublicRepository } from '../repositories/businessPublic.repository.js';
import { sanitizePublicBusiness } from './serializers.js';
import { uniqueSlug } from '../utils/text.js';
import { nowInHermosillo } from '../utils/time.js';
import { deleteUploadIfExists, safePath } from '../utils/files.js';
import { AppError } from '../utils/AppError.js';

export function createMyBusinessService(db, config) {
  const repository = createMyBusinessRepository(db);
  const products = createProductRepository(db);
  const publicRepository = createBusinessPublicRepository(db);
  const own = id => { const row = repository.find(id); if (!row) throw new AppError(404, 'NOT_FOUND'); return row; };
  const touchActivity = businessId => repository.touchActivity(businessId);
  const mutate = (id, operation) => db.transaction(() => { const result = operation(own(id)); touchActivity(id); return result; }).immediate();
  const full = id => {
    const row = own(id);
    return { ...row, esta_abierto: row.esta_abierto === 1, mostrar_ubicacion: row.mostrar_ubicacion === 1, inactivo_oculto: row.inactivo_oculto === 1,
      schedules: publicRepository.schedules(id).map(day => ({ ...day, cerrado_todo_el_dia: day.cerrado_todo_el_dia === 1 })),
      contacts: publicRepository.contacts(id).map(contact => ({ ...contact, es_principal: contact.es_principal === 1 })), products: products.list(id) };
  };
  function deletePrevious(url) {
    try { deleteUploadIfExists(url, config); } catch (error) { console.error('No se pudo eliminar una imagen reemplazada.', error); }
  }
  return {
    touchActivity, get: full,
    preview(id) {
      own(id);
      const now = nowInHermosillo();
      const row = repository.preview({ id, now_dow: now.dow, now_time: now.time });
      return sanitizePublicBusiness({ ...row, schedules: publicRepository.schedules(id), contacts: publicRepository.contacts(id), products: publicRepository.products(id) });
    },
    profile(id, data) {
      mutate(id, row => {
        const category = repository.category(data.category_id);
        if (!category || (!category.activa && category.id !== row.category_id)) throw new AppError(400, 'VALIDATION_ERROR', 'Selecciona una categoría activa.');
        repository.profile({ ...data, id, slug: row.nombre_negocio === data.nombre_negocio ? row.slug : uniqueSlug(data.nombre_negocio, slug => repository.slugExists(slug, id)) });
      });
      return full(id);
    },
    open(id, value) { mutate(id, () => repository.open(id, value ? 1 : 0)); return full(id); },
    location(id, data) {
      mutate(id, row => {
        const result = { ...row, ...data, id };
        if (data.campus_zone_id != null && !repository.zone(data.campus_zone_id)) throw new AppError(400, 'VALIDATION_ERROR', 'Selecciona una zona activa del campus.');
        if (result.mostrar_ubicacion && result.campus_zone_id === null) throw new AppError(400, 'VALIDATION_ERROR', 'Selecciona una zona del campus antes de mostrar tu ubicación.');
        repository.location({ ...result, mostrar_ubicacion: result.mostrar_ubicacion ? 1 : 0 });
      }); return full(id);
    },
    schedules(id, data) {
      mutate(id, () => { repository.clearSchedules(id); for (const day of data.schedules) repository.schedule({ ...day, business_id: id,
        hora_apertura: day.cerrado_todo_el_dia ? null : day.hora_apertura, hora_cierre: day.cerrado_todo_el_dia ? null : day.hora_cierre, cerrado_todo_el_dia: day.cerrado_todo_el_dia ? 1 : 0 }); });
      return full(id);
    },
    contacts(id, data) {
      mutate(id, () => {
        repository.clearContacts(id);
        const hasPrincipal = data.contacts.some(contact => contact.es_principal);
        data.contacts.forEach((contact, orden) => repository.contact({ ...contact, business_id: id, orden, etiqueta: contact.etiqueta ?? null,
          es_principal: contact.es_principal || (!hasPrincipal && orden === 0) ? 1 : 0 }));
      }); return full(id);
    },
    photos(id, files) {
      own(id);
      if (!Object.values(files).some(items => items.length)) throw new AppError(400, 'VALIDATION_ERROR', 'Adjunta una foto de perfil o de menú.');
      const old = [];
      mutate(id, row => {
        const result = { id, foto_perfil_url: row.foto_perfil_url, foto_menu_url: row.foto_menu_url };
        for (const [field, items] of Object.entries(files)) {
          const file = items[0];
          const subdir = field === 'foto_menu' ? 'menus' : 'profiles';
          if (subdir === 'menus') fs.renameSync(safePath(config.UPLOAD_DIR, `profiles/${file.filename}`), safePath(config.UPLOAD_DIR, `menus/${file.filename}`));
          file.publicUrl = `/uploads/${subdir}/${file.filename}`;
          old.push(result[field + '_url']); result[field + '_url'] = file.publicUrl;
        }
        repository.photos(result);
      });
      old.forEach(deletePrevious); return full(id);
    },
    removePhoto(id, tipo) {
      let previous;
      mutate(id, row => { const key = tipo === 'perfil' ? 'foto_perfil_url' : 'foto_menu_url'; previous = row[key]; repository.photos({ ...row, [key]: null }); });
      deletePrevious(previous); return full(id);
    }
  };
}
