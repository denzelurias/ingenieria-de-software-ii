import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { env } from './env.js';
import { normalizar } from '../utils/text.js';
import { seedDatabase } from '../../database/seed.js';

export function createDatabase(config = env, { seed = config.NODE_ENV !== 'test' } = {}) {
  for (const directory of [config.BACKUP_DIR, ...['profiles', 'menus', 'products'].map(name => path.join(config.UPLOAD_DIR, name)),
    path.join(config.STORAGE_DIR, 'credentials')]) fs.mkdirSync(directory, { recursive: true });
  if (config.DB_PATH !== ':memory:') fs.mkdirSync(path.dirname(config.DB_PATH), { recursive: true });
  const db = new Database(config.DB_PATH);
  try {
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.pragma("encoding = 'UTF-8'");
    db.function('normalizar', { deterministic: true }, normalizar);
    db.exec(fs.readFileSync(new URL('../../database/schema.sql', import.meta.url), 'utf8'));
    if (seed && db.prepare('SELECT COUNT(*) AS total FROM users').get().total === 0) seedDatabase(db, config);
    return db;
  } catch (error) { db.close(); throw error; }
}

let connection;
export function getDb() {
  if (!connection?.open) connection = createDatabase();
  return connection;
}
export function closeDb() {
  if (connection?.open) connection.close();
  connection = undefined;
}
