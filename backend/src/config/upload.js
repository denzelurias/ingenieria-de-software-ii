import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { env } from './env.js';
import { safePath } from '../utils/files.js';
import { AppError } from '../utils/AppError.js';

const extensions = new Map([['image/jpeg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp']]);
function imageUpload(root, subdir) {
  const directory = safePath(root, subdir);
  fs.mkdirSync(directory, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination(req, file, done) {
        try { done(null, safePath(root, subdir)); } catch (error) { done(error); }
      },
      filename: (req, file, done) => done(null, randomUUID() + extensions.get(file.mimetype))
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 2, fields: 30, parts: 32 },
    fileFilter: (req, file, done) => extensions.has(file.mimetype)
      ? done(null, true) : done(new AppError(400, 'INVALID_FILE'))
  });
}

export function publicImage(subdir, config = env) {
  if (!['profiles', 'menus', 'products'].includes(subdir)) throw new AppError(400, 'VALIDATION_ERROR');
  return imageUpload(config.UPLOAD_DIR, subdir);
}

export function createCredentialImage(config = env) {
  return imageUpload(config.STORAGE_DIR, 'credentials');
}
export const credentialImage = createCredentialImage();
