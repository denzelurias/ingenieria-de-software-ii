import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { AppError } from './AppError.js';

export function safePath(root, relativePath) {
  if (typeof relativePath !== 'string' || relativePath.includes('\0') || path.isAbsolute(relativePath)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'La ruta del archivo no es válida.');
  }
  const base = path.resolve(root);
  const target = path.resolve(base, relativePath);
  const relative = path.relative(base, target);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'La ruta del archivo no es válida.');
  }
  // No se siguen enlaces simbólicos ni junctions dentro del árbol permitido.
  let current = base;
  for (const segment of ['', ...relative.split(path.sep)]) {
    current = path.join(current, segment);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'La ruta del archivo no es válida.');
    }
  }
  return target;
}

export function deleteUploadIfExists(fileUrl, config = env) {
  if (!fileUrl) return;
  if (!fileUrl.startsWith('/uploads/')) throw new AppError(400, 'VALIDATION_ERROR');
  deleteStoredFile(config.UPLOAD_DIR, fileUrl.slice('/uploads/'.length));
}

export function deleteStoredFile(root, relativePath) {
  const target = safePath(root, relativePath);
  try { fs.unlinkSync(target); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
