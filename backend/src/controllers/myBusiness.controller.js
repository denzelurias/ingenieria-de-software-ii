import { ok } from '../utils/response.js';
export function createMyBusinessController(service, products) {
  return {
    get: (req, res) => ok(res, service.get(req.user.businessId)),
    preview: (req, res) => ok(res, service.preview(req.user.businessId)),
    profile: (req, res) => ok(res, service.profile(req.user.businessId, req.body)),
    photos: (req, res) => ok(res, service.photos(req.user.businessId, req.files ?? {})),
    removePhoto: (req, res) => ok(res, service.removePhoto(req.user.businessId, req.params.tipo)),
    open: (req, res) => ok(res, service.open(req.user.businessId, req.body.esta_abierto)),
    location: (req, res) => ok(res, service.location(req.user.businessId, req.body)),
    schedules: (req, res) => ok(res, service.schedules(req.user.businessId, req.body)),
    contacts: (req, res) => ok(res, service.contacts(req.user.businessId, req.body)),
    createProduct: (req, res) => ok(res.status(201), products.create(req.user.businessId, req.body, req.file)),
    editProduct: (req, res) => ok(res, products.edit(req.user.businessId, req.params.id, req.body, req.file)),
    productStatus: (req, res) => ok(res, products.status(req.user.businessId, req.params.id, req.body.estado)),
    removeProduct: (req, res) => ok(res, products.remove(req.user.businessId, req.params.id))
  };
}
