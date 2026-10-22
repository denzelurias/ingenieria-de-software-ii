import { createProductRepository } from '../repositories/product.repository.js';
import { createMyBusinessService } from './myBusiness.service.js';
import { deleteUploadIfExists } from '../utils/files.js';
import { AppError } from '../utils/AppError.js';
export function createProductService(db, config) {
  const repository = createProductRepository(db);
  const business = createMyBusinessService(db, config);
  const owned = (businessId, id) => { const row = repository.find(businessId, id); if (!row) throw new AppError(404, 'NOT_FOUND'); return row; };
  const mutate = (businessId, operation) => db.transaction(() => { business.get(businessId); const result = operation(); business.touchActivity(businessId); return result; }).immediate();
  const removeImage = url => { try { deleteUploadIfExists(url, config); } catch (error) { console.error('No se pudo eliminar una imagen anterior de producto.', error); } };
  return {
    create(businessId, data, file) {
      if (!file) throw new AppError(400, 'VALIDATION_ERROR', 'Adjunta una imagen del producto.');
      const id = mutate(businessId, () => repository.insert({ ...data, business_id: businessId, imagen_url: `/uploads/products/${file.filename}` }));
      return owned(businessId, id);
    },
    edit(businessId, id, data, file) {
      let previous;
      mutate(businessId, () => {
        const row = owned(businessId, id);
        if (!file && Object.keys(data).length === 0) throw new AppError(400, 'VALIDATION_ERROR', 'Envía al menos un cambio del producto.');
        previous = file ? row.imagen_url : null;
        repository.edit({ ...row, ...data, imagen_url: file ? `/uploads/products/${file.filename}` : row.imagen_url });
      });
      removeImage(previous); return owned(businessId, id);
    },
    status(businessId, id, estado) {
      mutate(businessId, () => { const row = owned(businessId, id); if (row.estado === 'oculto_admin') throw new AppError(409, 'PRODUCT_LOCKED'); repository.status({ business_id: businessId, id, estado }); });
      return owned(businessId, id);
    },
    remove(businessId, id) {
      let previous;
      mutate(businessId, () => { previous = owned(businessId, id).imagen_url; repository.remove(businessId, id); });
      removeImage(previous); return { eliminado: true };
    }
  };
}
