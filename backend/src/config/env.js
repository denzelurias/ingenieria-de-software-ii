import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

export const backendRoot = fileURLToPath(new URL('../../', import.meta.url));
dotenv.config({ path: path.join(backendRoot, '.env'), quiet: true });
z.config(z.locales.es());

const positiveInteger = z.coerce.number().int().positive();
const schema = z.object({
  PORT: positiveInteger.max(65535),
  NODE_ENV: z.enum(['development', 'test', 'production']),
  CORS_ORIGIN: z.url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/),
  DB_PATH: z.string().min(1),
  UPLOAD_DIR: z.string().min(1),
  STORAGE_DIR: z.string().min(1),
  BACKUP_DIR: z.string().min(1),
  BACKUP_KEEP: positiveInteger,
  ALLOWED_EMAIL_DOMAINS: z.string().min(1).transform(value => value.split(',').map(domain => domain.trim().toLowerCase()))
    .pipe(z.array(z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/)).min(1)),
  INACTIVITY_DAYS_LIMIT: positiveInteger,
  MAINTENANCE_INTERVAL_HOURS: positiveInteger,
  REPORT_IP_SALT: z.string().min(16)
});

export function loadEnv(source = process.env) {
  const result = schema.safeParse(source);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map(issue => issue.path.join('.')))];
    throw new Error(`Configuración inválida. Revisa estas variables en backend/.env: ${fields.join(', ')}.`);
  }
  const config = result.data;
  for (const key of ['DB_PATH', 'UPLOAD_DIR', 'STORAGE_DIR', 'BACKUP_DIR']) {
    if (key !== 'DB_PATH' || config[key] !== ':memory:') config[key] = path.resolve(backendRoot, config[key]);
  }
  const uploads = config.UPLOAD_DIR;
  const privatePath = config.STORAGE_DIR;
  const overlaps = (a, b) => {
    const relative = path.relative(a, b);
    return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
  };
  if (overlaps(uploads, privatePath) || overlaps(privatePath, uploads)
    || overlaps(uploads, config.BACKUP_DIR) || overlaps(uploads, config.DB_PATH)) {
    throw new Error('Configuración inválida. Separa las imágenes públicas de las credenciales, respaldos y base de datos.');
  }
  return Object.freeze(config);
}

export const env = loadEnv();
