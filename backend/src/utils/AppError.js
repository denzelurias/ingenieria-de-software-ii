export const errorCatalog = Object.freeze({
  VALIDATION_ERROR: [400, 'Revisa los datos enviados e inténtalo de nuevo.'],
  INVALID_FILE: [400, 'La imagen debe ser JPG, PNG o WebP y pesar máximo 5 MB.'],
  INVALID_CREDENTIALS: [401, 'Credenciales incorrectas. Verifica tu correo/matrícula y contraseña.'],
  UNAUTHORIZED: [401, 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.'],
  ACCOUNT_PENDING: [403, 'Tu solicitud de cuenta aún está en revisión por un administrador.'],
  ACCOUNT_REJECTED: [403, 'Tu solicitud de registro fue rechazada.'],
  ACCOUNT_SUSPENDED: [403, 'Tu cuenta se encuentra suspendida temporalmente.'],
  FORBIDDEN: [403, 'No tienes permisos para realizar esta acción.'],
  NOT_FOUND: [404, 'No encontramos el recurso solicitado.'],
  CONFLICT: [409, 'Ya existe un registro con esos datos.'],
  PRODUCT_LOCKED: [409, 'Este producto fue moderado por un administrador y no puede cambiarse de estado.'],
  RESET_CODE_INVALID: [400, 'El código de recuperación es inválido o ha expirado. Solicita uno nuevo.'],
  RATE_LIMITED: [429, 'Has realizado demasiados intentos. Espera unos minutos antes de volver a intentarlo.'],
  INTERNAL_ERROR: [500, 'Ocurrió un problema en el servidor. Inténtalo de nuevo en unos momentos.']
});

export class AppError extends Error {
  constructor(status, code, message, details) {
    const entry = errorCatalog[code];
    super(message ?? entry?.[1] ?? errorCatalog.INTERNAL_ERROR[1]);
    this.name = 'AppError';
    this.status = entry && status === entry[0] ? status : (entry?.[0] ?? 500);
    this.code = entry ? code : 'INTERNAL_ERROR';
    this.details = details;
  }
}
export default AppError;
