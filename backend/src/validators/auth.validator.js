import { z } from 'zod';
import { env } from '../config/env.js';

const email = z.email().trim().toLowerCase();
const enrollment = z.string().regex(/^\d{9}$/);
const password = z.string().min(8).max(72).regex(/\p{L}/u).regex(/\d/);
export function createAuthSchemas(config = env) {
  return {
    register: z.object({ nombre_completo: z.string().trim().min(3).max(120),
      email_institucional: email.refine(value => config.ALLOWED_EMAIL_DOMAINS.includes(value.split('@')[1]), 'Usa tu correo institucional.'),
      matricula_unison: enrollment, password, nombre_negocio: z.string().trim().min(2).max(80),
      category_id: z.coerce.number().int().positive().safe(), descripcion: z.string().trim().max(1000).default('') }),
    login: z.object({ identificador: z.string().trim().min(1).max(254).toLowerCase(), password: z.string().min(1).max(256) }),
    status: z.object({ email_institucional: email, matricula_unison: enrollment }),
    forgot: z.object({ email_institucional: email }),
    reset: z.object({ email_institucional: email, codigo_recuperacion: z.string().regex(/^\d{6}$/), nueva_password: password }),
    remove: z.object({ password_actual: z.string().min(1).max(256) })
  };
}
