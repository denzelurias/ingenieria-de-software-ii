import { Router } from 'express';
import { createRequireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { publicImage } from '../config/upload.js';
import { deleteUploadIfExists } from '../utils/files.js';
import { createMyBusinessService } from '../services/myBusiness.service.js';
import { createProductService } from '../services/product.service.js';
import { createMyBusinessController } from '../controllers/myBusiness.controller.js';
import { idParams, profileBody, openBody, locationBody, photoParams, schedulesBody, contactsBody } from '../validators/myBusiness.validator.js';
import { createProductBody, editProductBody, productStatusBody } from '../validators/product.validator.js';

export function createMyBusinessRouter(db, config) {
  const router = Router();
  const controller = createMyBusinessController(createMyBusinessService(db, config), createProductService(db, config));
  router.use(createRequireAuth(db, config), requireRole('emprendedor'));
  router.get('/', controller.get);
  router.get('/preview', controller.preview);
  router.put('/profile', validate({ body: profileBody }), controller.profile);
  router.put('/photos', publicImage('profiles', config).fields([{ name: 'foto_perfil', maxCount: 1 }, { name: 'foto_menu', maxCount: 1 }]), controller.photos);
  router.delete('/photos/:tipo', validate({ params: photoParams }), controller.removePhoto);
  router.patch('/open-status', validate({ body: openBody }), controller.open);
  router.patch('/location', validate({ body: locationBody }), controller.location);
  router.put('/schedules', validate({ body: schedulesBody }), controller.schedules);
  router.put('/contacts', validate({ body: contactsBody }), controller.contacts);
  router.post('/products', publicImage('products', config).single('imagen'), validate({ body: createProductBody }), controller.createProduct);
  router.put('/products/:id', validate({ params: idParams }), publicImage('products', config).single('imagen'), validate({ body: editProductBody }), controller.editProduct);
  router.patch('/products/:id/status', validate({ params: idParams, body: productStatusBody }), controller.productStatus);
  router.delete('/products/:id', validate({ params: idParams }), controller.removeProduct);
  router.use((error, req, res, next) => {
    const files = req.file ? [req.file] : Object.values(req.files ?? {}).flat();
    for (const file of files) {
      const url = file.publicUrl ?? `/uploads/${file.fieldname === 'imagen' ? 'products' : 'profiles'}/${file.filename}`;
      try { deleteUploadIfExists(url, config); } catch (cleanupError) { console.error('No se pudo eliminar una imagen de una solicitud fallida.', cleanupError); }
    }
    next(error);
  });
  return router;
}
