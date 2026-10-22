import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
export function createAuthController(service) {
  return {
    register(req, res) {
      if (!req.file) throw new AppError(400, 'VALIDATION_ERROR', 'Adjunta una foto de tu credencial UNISON.');
      return ok(res.status(201), service.register(req.body, `credentials/${req.file.filename}`), 'Tu solicitud está en revisión.');
    },
    login: (req, res) => ok(res, service.login(req.body)),
    me: (req, res) => ok(res, service.me(req.user.id)),
    requestStatus: (req, res) => ok(res, service.requestStatus(req.body)),
    forgotPassword: (req, res) => ok(res, service.forgotPassword(req.body), 'Si la cuenta existe, se generó un código de recuperación.'),
    resetPassword: (req, res) => ok(res, service.resetPassword(req.body), 'Tu contraseña se restableció. Inicia sesión nuevamente.'),
    removeAccount: (req, res) => ok(res, service.removeAccount(req.user.id, req.body.password_actual), 'Tu cuenta se dio de baja.')
  };
}
