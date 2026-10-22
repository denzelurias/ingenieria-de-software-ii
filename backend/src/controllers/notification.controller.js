import { ok } from '../utils/response.js';
export const createNotificationController = service => ({
  list: (req, res) => ok(res, service.listNotifications(req.user.id)),
  read: (req, res) => ok(res, service.readNotification(req.user.id, req.params.id)),
  readAll: (req, res) => ok(res, service.readAllNotifications(req.user.id))
});
