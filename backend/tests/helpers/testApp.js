import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { env } from '../../src/config/env.js';
import { createDatabase } from '../../src/config/db.js';
import { seedDatabase } from '../../database/seed.js';
import { createApp } from '../../src/app.js';

// Cada suite posee su BD, sus archivos y una función de cierre; no cambia process.env.
export function createTestApp({ seed = true, configure } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'emprendebuho-test-'));
  const config = { ...env, NODE_ENV: 'test', DB_PATH: path.join(directory, 'test.sqlite'),
    UPLOAD_DIR: path.join(directory, 'uploads'), STORAGE_DIR: path.join(directory, 'storage'), BACKUP_DIR: path.join(directory, 'backups') };
  let db;
  const close = () => {
    if (db?.open) db.close();
    const resolved = path.resolve(directory);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('emprendebuho-test-')
      || (fs.existsSync(resolved) && fs.lstatSync(resolved).isSymbolicLink())) {
      throw new Error('No se puede limpiar un directorio ajeno a esta prueba.');
    }
    fs.rmSync(directory, { recursive: true, force: true });
  };
  try {
    db = createDatabase(config, { seed: false });
    if (seed) seedDatabase(db, config);
    const app = createApp({ config, configure: configure ? app => configure(app, { db, config }) : undefined });
    return { app, db, config, directory, close };
  } catch (error) { close(); throw error; }
}

// Comprobaciones F1 ejecutables sin crear archivos asignados a otras fases:
// node --test backend/tests/helpers/testApp.js
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const { test } = await import('node:test');
  const { default: assert } = await import('node:assert/strict');
  const { default: request } = await import('supertest');
  const { default: jwt } = await import('jsonwebtoken');
  const { default: bcrypt } = await import('bcryptjs');
  const { z } = await import('zod');
  const { AppError } = await import('../../src/utils/AppError.js');
  const { sanitizePublicBusiness, publicProduct } = await import('../../src/services/serializers.js');
  const { createRequireAuth } = await import('../../src/middlewares/auth.middleware.js');
  const { requireRole } = await import('../../src/middlewares/role.middleware.js');
  const { validate } = await import('../../src/middlewares/validate.middleware.js');
  const { publicImage, createCredentialImage } = await import('../../src/config/upload.js');
  const { safePath, deleteUploadIfExists } = await import('../../src/utils/files.js');
  const { nowInHermosillo } = await import('../../src/utils/time.js');
  const { escapeLike, uniqueSlug } = await import('../../src/utils/text.js');
  const { createNotificationService } = await import('../../src/services/notification.service.js');
  const { createRateLimiter } = await import('../../src/middlewares/rateLimit.middleware.js');
  const { loadEnv } = await import('../../src/config/env.js');
  const silent = { info() {} };

  test('F1: esquema, PRAGMAs, semillas completas e idempotencia', t => {
    const fixture = createTestApp(); t.after(fixture.close);
    const { db, config } = fixture;
    assert.equal(db.pragma('foreign_keys', { simple: true }), 1);
    assert.equal(db.pragma('journal_mode', { simple: true }), 'wal');
    assert.equal(db.pragma('busy_timeout', { simple: true }), 5000);
    assert.equal(db.pragma('encoding', { simple: true }), 'UTF-8');
    assert.equal(db.prepare('SELECT normalizar(:text) AS result').get({ text: ' BÚHO Limón ' }).result, 'buho limon');
    assert.equal(db.prepare('SELECT normalizar(NULL) AS result').get().result, null);
    for (const [table, count] of [['categories', 8], ['campus_zones', 9], ['users', 5], ['businesses', 4], ['business_schedules', 28], ['products', 9], ['reports', 2]]) {
      assert.equal(db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get().total, count);
    }
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM campus_zones WHERE mapa_x IS NOT NULL AND mapa_y IS NOT NULL").get().total, 8);
    const mobile = db.prepare("SELECT * FROM campus_zones WHERE codigo = 'ZONA-MOVIL'").get();
    assert.equal(mobile.mapa_x, null); assert.equal(mobile.mapa_y, null);
    const admin = db.prepare("SELECT * FROM users WHERE rol = 'admin'").get();
    assert(bcrypt.compareSync('AdminUnison2026!', admin.password_hash));
    for (const user of db.prepare("SELECT * FROM users WHERE rol = 'emprendedor'").all()) {
      assert(bcrypt.compareSync('Buho2026!', user.password_hash));
      assert.equal(bcrypt.getRounds(user.password_hash), 10);
      assert(fs.existsSync(safePath(config.STORAGE_DIR, user.credencial_path)));
    }
    assert.deepEqual(db.pragma('foreign_key_check'), []);
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
    assert.equal(seedDatabase(db, config), false);
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM users').get().total, 5);
  });

  test('F1: health, CORS, cabeceras y credenciales privadas', async t => {
    const fixture = createTestApp(); t.after(fixture.close);
    const response = await request(fixture.app).get('/api/health').expect(200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.data.estado, 'disponible');
    assert(response.headers['x-content-type-options']);
    assert(!response.headers['x-powered-by']);
    await request(fixture.app).get('/uploads/profiles/demo-1.svg').expect(200);
    for (const url of ['/storage/credentials/demo-1.svg', '/uploads/credentials/demo-1.svg', '/api/admin/requests/2/credential', '/ruta-inexistente']) {
      const missing = await request(fixture.app).get(url).expect(404);
      assert.equal(missing.body.error.code, 'NOT_FOUND');
    }
    const cors = await request(fixture.app).get('/api/health').set('Origin', fixture.config.CORS_ORIGIN).expect(200);
    assert.equal(cors.headers['access-control-allow-origin'], fixture.config.CORS_ORIGIN);
    await request(fixture.app).get('/api/health').set('Origin', 'https://no-permitido.example').expect(403);
  });

  test('F1: traducción de AppError, ZodError y errores reales SQLite sin fugas', async t => {
    const fixture = createTestApp({ configure(app, { db }) {
      app.get('/prueba/aplicacion', () => { throw new AppError(409, 'CONFLICT'); });
      app.post('/prueba/validacion', validate({ body: z.object({ nombre: z.string().min(3) }) }), (req, res) => res.json(req.body));
      app.get('/prueba/unico', () => db.prepare("INSERT INTO categories (nombre, slug) VALUES ('Repostería y Postres', 'otra')").run());
      app.get('/prueba/foranea', () => db.prepare("INSERT INTO notifications (user_id, tipo, titulo, mensaje) VALUES (99999, 'sistema', 'Aviso', 'Aviso')").run());
      app.get('/prueba/check', () => db.prepare('UPDATE products SET precio = -1 WHERE id = 1').run());
      app.post('/prueba/json', (req, res) => res.json(req.body));
    } }); t.after(fixture.close);
    for (const [endpoint, status, code] of [['aplicacion', 409, 'CONFLICT'], ['unico', 409, 'CONFLICT'], ['foranea', 400, 'VALIDATION_ERROR'], ['check', 400, 'VALIDATION_ERROR']]) {
      const response = await request(fixture.app).get('/prueba/' + endpoint).expect(status);
      assert.deepEqual(Object.keys(response.body), ['ok', 'error']);
      assert.equal(response.body.error.code, code);
      assert(!/SQLITE|stack|INSERT|UPDATE/.test(JSON.stringify(response.body)));
    }
    const validation = await request(fixture.app).post('/prueba/validacion').send({ nombre: 1 }).expect(400);
    assert.equal(validation.body.error.details[0].field, 'nombre');
    assert(!/expected|Invalid input/.test(JSON.stringify(validation.body)));
    const json = await request(fixture.app).post('/prueba/json').set('Content-Type', 'application/json').send('{mal').expect(400);
    assert.equal(json.body.error.code, 'VALIDATION_ERROR');
  });

  test('F1: errores inesperados se registran sin exponer su contenido al cliente', async t => {
    const messages = [];
    t.mock.method(console, 'error', (...args) => messages.push(args));
    const fixture = createTestApp({ seed: false, configure(app) {
      app.get('/prueba/interno', () => { throw new Error('SQLITE información privada de prueba'); });
    } }); t.after(fixture.close);
    const response = await request(fixture.app).get('/prueba/interno').expect(500);
    assert.equal(response.body.error.code, 'INTERNAL_ERROR');
    assert(!/SQLITE|privada|stack/.test(JSON.stringify(response.body)));
    assert.equal(messages.length, 1);
    assert(messages[0][1] instanceof Error);
  });

  test('F1: fallo de semilla revierte las filas y elimina sus nuevos placeholders', t => {
    const fixture = createTestApp({ seed: false }); t.after(fixture.close);
    fixture.db.exec("CREATE TRIGGER fallo_semilla BEFORE INSERT ON products BEGIN SELECT RAISE(ABORT, 'fallo de prueba'); END");
    assert.throws(() => seedDatabase(fixture.db, fixture.config));
    assert.equal(fixture.db.prepare('SELECT COUNT(*) AS total FROM users').get().total, 0);
    assert.equal(fixture.db.prepare('SELECT COUNT(*) AS total FROM categories').get().total, 0);
    assert.equal(fs.readdirSync(path.join(fixture.config.STORAGE_DIR, 'credentials')).length, 0);
    assert.equal(fs.readdirSync(path.join(fixture.config.UPLOAD_DIR, 'profiles')).length, 0);
  });

  test('F1: ubicación privada con 0/false y listas blancas de serialización', () => {
    for (const mostrar_ubicacion of [0, false, undefined, '0']) {
      const original = { id: 1, mostrar_ubicacion, esta_abierto: 1, en_horario_ahora: 0, campus_zone_id: 3, zona_codigo: 'SECRETO', zona_nombre: 'Privado', ubicacion_detalle: 'Privado',
        _mapa_x: 50, _mapa_y: 55, password_hash: 'secreto', credencial_path: 'credentials/demo.svg', user_id: 2, updated_at: '2026-10-19 17:00:00' };
      const serialized = sanitizePublicBusiness(original);
      for (const key of ['campus_zone_id', 'zona_codigo', 'zona_nombre', 'ubicacion_detalle']) assert.equal(serialized[key], null);
      for (const key of ['_mapa_x', '_mapa_y', 'password_hash', 'credencial_path', 'user_id']) assert(!Object.hasOwn(serialized, key));
      assert.equal(serialized.esta_abierto, true); assert.equal(serialized.en_horario_ahora, false);
      assert.equal(serialized.updated_at, '2026-10-19T17:00:00Z');
      assert.equal(original.campus_zone_id, 3);
      const product = publicProduct({ id: 1, business: original, campus_zone_id: 3 });
      assert.equal(product.business.campus_zone_id, null);
      assert(!Object.hasOwn(product, 'campus_zone_id'));
    }
    assert.equal(sanitizePublicBusiness({ mostrar_ubicacion: 1, campus_zone_id: 3 }).campus_zone_id, 3);
  });

  test('F1: autenticación, roles, revocación y reactivación transaccional', async t => {
    const fixture = createTestApp({ configure(app, { db, config }) {
      const auth = createRequireAuth(db, config, silent);
      app.get('/prueba/privada', auth, (req, res) => res.json(req.user));
      app.get('/prueba/admin', auth, requireRole('admin'), (req, res) => res.json(req.user));
    } }); t.after(fixture.close);
    const token = (id, options = {}) => jwt.sign({ sub: id, rol: 'admin', tv: 0 }, fixture.config.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h', ...options });
    const get = bearer => request(fixture.app).get('/prueba/privada').set('Authorization', `Bearer ${bearer}`);
    await request(fixture.app).get('/prueba/privada').expect(401);
    await get('incorrecto').expect(401);
    await get(token(99999)).expect(401);
    await get(token(2, { expiresIn: -1 })).expect(401);
    await get(token(2, { algorithm: 'HS384' })).expect(401);
    const valid = await get(token(2)).expect(200);
    assert.deepEqual(valid.body, { id: 2, rol: 'emprendedor', businessId: 1 });
    await request(fixture.app).get('/prueba/admin').set('Authorization', `Bearer ${token(2)}`).expect(403);
    await request(fixture.app).get('/prueba/admin').set('Authorization', `Bearer ${token(1)}`).expect(200);
    assert.equal((await get(token(4)).expect(403)).body.error.code, 'ACCOUNT_PENDING');
    assert.equal((await get(token(5)).expect(403)).body.error.code, 'ACCOUNT_REJECTED');
    fixture.db.prepare('UPDATE users SET token_version = 1 WHERE id = 2').run();
    assert.equal((await get(token(2)).expect(401)).body.error.code, 'UNAUTHORIZED');
    fixture.db.prepare("UPDATE users SET estado_cuenta = 'suspendida', motivo_estado = 'Revisión', suspendida_hasta = '2999-01-01 00:00:00' WHERE id = 2").run();
    assert.equal((await get(token(2)).expect(403)).body.error.code, 'ACCOUNT_SUSPENDED');
    fixture.db.prepare("UPDATE users SET suspendida_hasta = '2000-01-01 00:00:00' WHERE id = 2").run();
    await get(token(2)).expect(401);
    assert.equal(fixture.db.prepare('SELECT estado_cuenta FROM users WHERE id = 2').get().estado_cuenta, 'suspendida');
    fixture.db.prepare("UPDATE users SET token_version = 0, suspendida_hasta = '2000-01-01 00:00:00' WHERE id = 2").run();
    await get(token(2)).expect(200);
    await get(token(2)).expect(200);
    assert.equal(fixture.db.prepare("SELECT COUNT(*) AS total FROM notifications WHERE tipo = 'cuenta_reactivada'").get().total, 1);
    assert.equal(fixture.db.prepare("SELECT COUNT(*) AS total FROM audit_logs WHERE accion = 'reactivar_cuenta'").get().total, 1);
    fixture.db.prepare("UPDATE users SET estado_cuenta = 'eliminada' WHERE id = 2").run();
    assert.equal((await get(token(2)).expect(401)).body.error.code, 'INVALID_CREDENTIALS');
  });

  test('F1: subidas con MIME/tamaño limitados y credenciales fuera de uploads', async t => {
    const fixture = createTestApp({ configure(app, { config }) {
      app.post('/prueba/imagen', publicImage('profiles', config).single('imagen'), (req, res) => res.json({ nombre: req.file.filename }));
      app.post('/prueba/credencial', createCredentialImage(config).single('credencial'), (req, res) => res.json({ nombre: req.file.filename }));
    } }); t.after(fixture.close);
    const image = Buffer.from('imagen de prueba');
    for (const [contentType, extension] of [['image/png', '.png'], ['image/jpeg', '.jpg'], ['image/webp', '.webp']]) {
      const response = await request(fixture.app).post('/prueba/imagen').attach('imagen', image, { filename: '../../archivo.exe', contentType }).expect(200);
      assert.match(response.body.nombre, new RegExp('^[0-9a-f-]{36}\\' + extension + '$'));
      assert(fs.existsSync(path.join(fixture.config.UPLOAD_DIR, 'profiles', response.body.nombre)));
    }
    const rejected = await request(fixture.app).post('/prueba/imagen').attach('imagen', image, { filename: 'x.svg', contentType: 'image/svg+xml' }).expect(400);
    assert.equal(rejected.body.error.code, 'INVALID_FILE');
    const large = await request(fixture.app).post('/prueba/imagen').attach('imagen', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'x.png', contentType: 'image/png' }).expect(400);
    assert.equal(large.body.error.code, 'INVALID_FILE');
    const credential = await request(fixture.app).post('/prueba/credencial').attach('credencial', image, { filename: 'x.png', contentType: 'image/png' }).expect(200);
    assert(fs.existsSync(path.join(fixture.config.STORAGE_DIR, 'credentials', credential.body.nombre)));
    await request(fixture.app).get('/uploads/credentials/' + credential.body.nombre).expect(404);
    assert.throws(() => safePath(fixture.config.UPLOAD_DIR, '../storage/credentials/demo-1.svg'), AppError);
    assert.throws(() => safePath(fixture.config.UPLOAD_DIR, path.resolve('fuera.png')), AppError);
    assert.throws(() => publicImage('credentials', fixture.config), AppError);
    assert.throws(() => deleteUploadIfExists('/storage/credentials/demo-1.svg', fixture.config), AppError);
  });

  test('F1: validación de query/params en Express 5 y mensajes seguros', async t => {
    const fixture = createTestApp({ seed: false, configure(app) {
      app.get('/prueba/:id', validate({ params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({ page: z.coerce.number().int().positive() }) }),
        (req, res) => res.json({ id: req.params.id, page: req.query.page }));
    } }); t.after(fixture.close);
    assert.deepEqual((await request(fixture.app).get('/prueba/2?page=3').expect(200)).body, { id: 2, page: 3 });
    await request(fixture.app).get('/prueba/error?page=3').expect(400);
  });

  test('F1: límites de tasa y sobre RATE_LIMITED', async t => {
    const fixture = createTestApp({ seed: false, configure(app, { config }) {
      app.get('/prueba/limite', createRateLimiter({ windowMs: 60000, limit: 1 }, { ...config, NODE_ENV: 'development' }), (req, res) => res.json({ ok: true }));
    } }); t.after(fixture.close);
    await request(fixture.app).get('/prueba/limite').expect(200);
    const response = await request(fixture.app).get('/prueba/limite').expect(429);
    assert.equal(response.body.error.code, 'RATE_LIMITED');
    assert(response.headers['retry-after']);
  });

  test('F1: notificaciones participan en la transacción del llamador', t => {
    const fixture = createTestApp(); t.after(fixture.close);
    const service = createNotificationService(fixture.db, silent);
    const notification = { user_id: 2, tipo: 'sistema', titulo: 'Aviso', mensaje: 'Mensaje de prueba' };
    assert.throws(() => fixture.db.transaction(() => { service.notify(notification); throw new Error('Revertir'); })());
    assert.equal(fixture.db.prepare('SELECT COUNT(*) AS total FROM notifications').get().total, 0);
    assert.equal(typeof service.notify(notification), 'number');
    assert.equal(fixture.db.prepare('SELECT COUNT(*) AS total FROM notifications').get().total, 1);
  });

  test('F1: configuración, horarios de Hermosillo, LIKE y slug sin SQL en utilidades', () => {
    assert.throws(() => loadEnv({}), /Configuración inválida/);
    assert.throws(() => loadEnv({ ...process.env, STORAGE_DIR: './uploads/credentials' }), /Configuración inválida/);
    assert.deepEqual(nowInHermosillo(new Date('2026-10-20T06:59:00Z')), { dow: 1, time: '23:59' });
    assert.deepEqual(nowInHermosillo(new Date('2026-10-20T07:00:00Z')), { dow: 2, time: '00:00' });
    assert.equal(escapeLike('50%_\\'), '50\\%\\_\\\\');
    assert.equal(uniqueSlug('Búho Postres', slug => ['buho-postres', 'buho-postres-2'].includes(slug)), 'buho-postres-3');
  });
}
