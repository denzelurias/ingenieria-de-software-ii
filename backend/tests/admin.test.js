import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import Database from 'better-sqlite3';
import request from 'supertest';
import { createTestApp } from './helpers/testApp.js';
import { createMaintenanceService } from '../src/services/maintenance.service.js';
import { seedDatabase } from '../database/seed.js';

async function fixture(t) {
  t.mock.method(console, 'info', () => {});
  const f = createTestApp(); t.after(f.close);
  const login = async (identificador, password) => (await request(f.app).post('/api/auth/login').send({ identificador, password }).expect(200)).body.data.token;
  return { ...f, token: await login('admin@unison.mx', 'AdminUnison2026!'), entrepreneur: await login('fernanda.demo@unison.mx', 'Buho2026!') };
}
const bearer = token => `Bearer ${token}`;
function admin(f, method, endpoint) { return request(f.app)[method]('/api/admin' + endpoint).set('Authorization', bearer(f.token)); }
const audits = f => f.db.prepare('SELECT COUNT(*) AS total FROM audit_logs').get().total;

test('Autorización: rutas administrativas y credenciales privadas solo para admin', async t => {
  const f = await fixture(t);
  await request(f.app).get('/api/admin/stats').expect(401);
  await request(f.app).get('/api/admin/stats').set('Authorization', bearer(f.entrepreneur)).expect(403);
  await request(f.app).get('/api/admin/requests/2/credential').expect(401);
  await request(f.app).get('/api/admin/requests/2/credential').set('Authorization', bearer(f.entrepreneur)).expect(403);
  const image = await admin(f, 'get', '/requests/2/credential').expect(200);
  assert.equal(image.headers['cache-control'], 'private, no-store'); assert(image.headers['content-type'].startsWith('image/'));
  await request(f.app).get('/storage/credentials/demo-1.svg').expect(404);
  await request(f.app).get('/uploads/credentials/demo-1.svg').expect(404);
  await admin(f, 'get', '/requests/1/credential').expect(404);
  f.db.prepare("UPDATE users SET credencial_path = '../package.json' WHERE id = 2").run();
  await admin(f, 'get', '/requests/2/credential').expect(404);
  const list = await admin(f, 'get', '/requests?status=aprobada').expect(200);
  assert(!/password_hash|credencial_path|token_version/.test(JSON.stringify(list.body)));
});

test('Solicitudes: filtros, aprobación, rechazo, notificación y auditoría atómicas', async t => {
  const f = await fixture(t);
  const list = await admin(f, 'get', '/requests?status=pendiente&q=nuevo&limit=1').expect(200);
  assert.equal(list.body.meta.total, 1); assert.equal(list.body.data[0].id, 4);
  await admin(f, 'patch', '/requests/4').send({ decision: 'rechazada' }).expect(400);
  await admin(f, 'patch', '/requests/4').send({ decision: 'rechazada', motivo: 'La imagen no es legible.' }).expect(200);
  const rejected = f.db.prepare('SELECT * FROM users WHERE id = 4').get();
  assert.equal(rejected.estado_cuenta, 'rechazada'); assert.equal(rejected.resuelto_por, 1); assert(rejected.fecha_resolucion);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS total FROM notifications WHERE user_id = 4 AND tipo = 'cuenta_rechazada'").get().total, 1);
  assert.equal(audits(f), 1);
  await admin(f, 'patch', '/requests/4').send({ decision: 'aprobada' }).expect(409);
  f.db.prepare("UPDATE users SET estado_cuenta = 'pendiente', motivo_estado = NULL WHERE id = 5").run();
  await admin(f, 'patch', '/requests/5').send({ decision: 'aprobada' }).expect(200);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS total FROM notifications WHERE user_id = 5 AND tipo = 'cuenta_aprobada'").get().total, 1);
  assert.equal(audits(f), 2);
});

test('Suspensión: revoca JWT, oculta negocio, impide suspender admins y permite reactivar', async t => {
  const f = await fixture(t);
  await admin(f, 'patch', '/users/1/suspend').send({ suspend: true, motivo: 'Motivo de prueba' }).expect(403);
  await admin(f, 'patch', '/users/4/suspend').send({ suspend: false }).expect(409);
  await admin(f, 'patch', '/users/2/suspend').send({ suspend: true }).expect(400);
  await admin(f, 'patch', '/users/2/suspend').send({ suspend: true, motivo: 'Información pendiente de revisión', hasta: '2999-12-31' }).expect(200);
  const blocked = await request(f.app).get('/api/auth/me').set('Authorization', bearer(f.entrepreneur)).expect(403);
  assert.equal(blocked.body.error.code, 'ACCOUNT_SUSPENDED');
  assert.equal(f.db.prepare('SELECT esta_abierto FROM businesses WHERE user_id = 2').get().esta_abierto, 0);
  assert(!(await request(f.app).get('/api/businesses').expect(200)).body.data.some(row => row.id === 1));
  await admin(f, 'patch', '/users/2/suspend').send({ suspend: false }).expect(200);
  await request(f.app).get('/api/auth/me').set('Authorization', bearer(f.entrepreneur)).expect(401);
  assert.equal(audits(f), 2);
});

test('Productos: moderación y restauración crean notificación y auditoría', async t => {
  const f = await fixture(t);
  await admin(f, 'patch', '/products/1/moderate').send({ ocultar: true }).expect(400);
  await admin(f, 'patch', '/products/1/moderate').send({ ocultar: true, motivo_moderacion: 'Revisar información de la imagen' }).expect(200);
  const row = f.db.prepare('SELECT * FROM products WHERE id = 1').get();
  assert.equal(row.estado, 'oculto_admin'); assert.equal(row.moderado_por, 1); assert(row.moderado_at);
  assert(!(await request(f.app).get('/api/products').expect(200)).body.data.some(item => item.id === 1));
  await admin(f, 'patch', '/products/1/moderate').send({ ocultar: false }).expect(200);
  const restored = f.db.prepare('SELECT * FROM products WHERE id = 1').get();
  assert.equal(restored.estado, 'activo'); assert.equal(restored.motivo_moderacion, null);
  assert.equal(audits(f), 2);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS total FROM notifications WHERE user_id = 2').get().total, 2);
});

test('Reportes: reincidencias y resolución con ocultamiento o suspensión en una transacción', async t => {
  const f = await fixture(t);
  const list = await admin(f, 'get', '/reports?estado=pendiente&business_id=2').expect(200);
  assert.equal(list.body.data.length, 2); assert.equal(list.body.data[0].reportes_del_negocio, 2);
  assert(!/ip_hash|credencial_path/.test(JSON.stringify(list.body)));
  const body = { estado_reporte: 'desestimado', accion_automatica: 'ocultar_producto', motivo_sancion: 'Contenido publicado inapropiado' };
  await admin(f, 'patch', '/reports/2').send(body).expect(400);
  const resolved = await admin(f, 'patch', '/reports/1').send(body).expect(200);
  assert.equal(resolved.body.data.estado_reporte, 'resuelto_con_sancion');
  assert.equal(f.db.prepare('SELECT estado FROM products WHERE id = 9').get().estado, 'oculto_admin');
  await admin(f, 'patch', '/reports/2').send({ ...body, accion_automatica: 'suspender_cuenta' }).expect(200);
  assert.equal(f.db.prepare('SELECT estado_cuenta FROM users WHERE id = 3').get().estado_cuenta, 'suspendida');
  assert.equal(audits(f), 4); // Sanción y resolución, ambas en cada transacción.
  assert.equal(f.db.prepare('SELECT COUNT(*) AS total FROM notifications WHERE user_id = 3').get().total, 2);
});

test('Auditoría: una falla revierte decisión, sanción, notificaciones y reporte', async t => {
  const f = await fixture(t);
  t.mock.method(console, 'error', () => {});
  f.db.exec("CREATE TRIGGER impedir_auditoria BEFORE INSERT ON audit_logs BEGIN SELECT RAISE(ABORT, 'fallo de prueba'); END");
  await admin(f, 'patch', '/requests/4').send({ decision: 'aprobada' }).expect(500);
  assert.equal(f.db.prepare('SELECT estado_cuenta FROM users WHERE id = 4').get().estado_cuenta, 'pendiente');
  await admin(f, 'patch', '/reports/2').send({ estado_reporte: 'resuelto_con_sancion', accion_automatica: 'suspender_cuenta', motivo_sancion: 'Revisión de información falsa' }).expect(500);
  assert.equal(f.db.prepare('SELECT estado_cuenta FROM users WHERE id = 3').get().estado_cuenta, 'aprobada');
  assert.equal(f.db.prepare('SELECT estado_reporte FROM reports WHERE id = 2').get().estado_reporte, 'pendiente');
  assert.equal(f.db.prepare('SELECT COUNT(*) AS total FROM notifications').get().total, 0);
});

test('Categorías: creación, edición parcial, desactivación y conservación de asociaciones', async t => {
  const f = await fixture(t);
  const created = await admin(f, 'post', '/categories').send({ nombre: 'Categoría Nueva', icono: 'Store' }).expect(201);
  const id = created.body.data.id;
  assert.equal(created.body.data.slug, 'categoria-nueva');
  await admin(f, 'put', `/categories/${id}`).send({ descripcion: 'Descripción' }).expect(200);
  assert.equal(f.db.prepare('SELECT nombre FROM categories WHERE id = :id').get({ id }).nombre, 'Categoría Nueva');
  await admin(f, 'put', '/categories/2').send({ activa: false }).expect(200);
  assert.equal(f.db.prepare('SELECT category_id FROM businesses WHERE id = 1').get().category_id, 2);
  const list = await admin(f, 'get', '/categories').expect(200);
  assert.equal(list.body.data.find(row => row.id === 2).negocios_count, 3);
  assert.equal(list.body.data.find(row => row.id === 2).activa, false);
  const audit = await admin(f, 'get', '/audit-logs?entidad_tipo=category&limit=1').expect(200);
  assert.equal(audit.body.meta.total, 3); assert.equal(audit.body.data.length, 1); assert.equal(audit.body.data[0].actor_id, 1);
});

test('Mantenimiento: inactividad, suspensiones vencidas, notificaciones y auditoría idempotentes', async t => {
  const f = await fixture(t);
  f.db.prepare("UPDATE businesses SET last_activity_at = datetime('now', '-31 days') WHERE id = 1").run();
  f.db.prepare("UPDATE users SET estado_cuenta = 'suspendida', motivo_estado = 'Temporal', suspendida_hasta = '2000-01-01 00:00:00' WHERE id = 3").run();
  const response = await admin(f, 'post', '/maintenance/run-inactivity-check').expect(200);
  assert.deepEqual(response.body.data, { ocultados: 1, reactivados: 1 });
  assert.equal(f.db.prepare('SELECT inactivo_oculto FROM businesses WHERE id = 1').get().inactivo_oculto, 1);
  assert.equal(f.db.prepare('SELECT estado_cuenta FROM users WHERE id = 3').get().estado_cuenta, 'aprobada');
  assert.equal(f.db.prepare("SELECT COUNT(*) AS total FROM notifications WHERE tipo = 'cuenta_reactivada'").get().total, 1);
  assert.deepEqual((await admin(f, 'post', '/maintenance/run-inactivity-check').expect(200)).body.data, { ocultados: 0, reactivados: 0 });
  assert.equal(audits(f), 3);
  const health = await admin(f, 'get', '/maintenance/health').expect(200);
  assert.equal(health.body.data.filas_por_tabla.users, 5); assert.equal(health.body.data.candidatos_inactividad, 0);
  assert(!JSON.stringify(health.body).includes(f.directory));
});

test('Respaldos: SQLite válido, descarga protegida, retención y validación de nombres', async t => {
  const f = await fixture(t);
  const oldNames = ['emprendebuho_20000101_000000.sqlite', 'emprendebuho_20000102_000000.sqlite'];
  for (const filename of oldNames) fs.writeFileSync(path.join(f.config.BACKUP_DIR, filename), 'anterior');
  // Configuración compartida por el router creado para esta suite.
  f.config.BACKUP_KEEP = 2;
  const response = await admin(f, 'post', '/maintenance/backup').expect(200);
  const { filename, size_bytes } = response.body.data;
  assert.match(filename, /^emprendebuho_\d{8}_\d{6}\.sqlite$/); assert(size_bytes > 0);
  const db = new Database(path.join(f.config.BACKUP_DIR, filename), { readonly: true });
  try { assert.equal(db.pragma('integrity_check', { simple: true }), 'ok'); assert.equal(db.prepare('SELECT COUNT(*) AS total FROM users').get().total, 5); } finally { db.close(); }
  assert(!fs.existsSync(path.join(f.config.BACKUP_DIR, oldNames[0]))); assert(fs.existsSync(path.join(f.config.BACKUP_DIR, oldNames[1])));
  const downloaded = await admin(f, 'get', '/maintenance/backups/' + filename).expect(200);
  assert(downloaded.headers['content-disposition'].includes(filename));
  await request(f.app).get('/api/admin/maintenance/backups/' + filename).expect(401);
  await admin(f, 'get', '/maintenance/backups/archivo.sqlite').expect(400);
  await admin(f, 'get', '/maintenance/backups/..%5Cpackage.json').expect(400);
  assert.equal(audits(f), 1);
});

test('Huérfanos: elimina solo imágenes no referenciadas de más de una hora, conserva credenciales', async t => {
  const f = await fixture(t);
  const orphan = path.join(f.config.UPLOAD_DIR, 'products', 'huerfano.png');
  const recent = path.join(f.config.UPLOAD_DIR, 'products', 'reciente.png');
  fs.writeFileSync(orphan, 'imagen huérfana'); fs.writeFileSync(recent, 'imagen reciente');
  const old = new Date(Date.now() - 7200000); fs.utimesSync(orphan, old, old);
  const referenced = path.join(f.config.UPLOAD_DIR, 'profiles', 'demo-1.svg'); fs.utimesSync(referenced, old, old);
  const credential = path.join(f.config.STORAGE_DIR, 'credentials', 'demo-1.svg');
  const response = await admin(f, 'post', '/maintenance/cleanup-orphans').expect(200);
  assert.equal(response.body.data.eliminados, 1); assert(!fs.existsSync(orphan));
  assert(fs.existsSync(recent)); assert(fs.existsSync(referenced)); assert(fs.existsSync(credential));
  assert.equal(audits(f), 1);
});

test('Mantenimiento: falla de auditoría conserva archivos y estado de la base', async t => {
  const f = await fixture(t); t.mock.method(console, 'error', () => {});
  const orphan = path.join(f.config.UPLOAD_DIR, 'products', 'huerfano.png'); fs.writeFileSync(orphan, 'imagen');
  const old = new Date(Date.now() - 7200000); fs.utimesSync(orphan, old, old);
  f.db.exec("CREATE TRIGGER impedir_auditoria BEFORE INSERT ON audit_logs BEGIN SELECT RAISE(ABORT, 'fallo de prueba'); END");
  await admin(f, 'post', '/maintenance/cleanup-orphans').expect(500); assert(fs.existsSync(orphan));
  await admin(f, 'post', '/maintenance/backup').expect(500);
  assert.equal(fs.readdirSync(f.config.BACKUP_DIR).filter(name => name.endsWith('.sqlite')).length, 0);
});

test('Servidor: ejecuta mantenimiento al inicio fuera de test y programa/cancela el intervalo', async t => {
  const f = await fixture(t);
  f.db.prepare("UPDATE businesses SET last_activity_at = '2000-01-01 00:00:00' WHERE id = 1").run();
  const script = `
    import { createServer } from 'node:net';
    import { once } from 'node:events';
    const probe = createServer().listen(0); await once(probe, 'listening');
    process.env.PORT = String(probe.address().port); await new Promise(resolve => probe.close(resolve));
    const scheduled = []; let cleared = false;
    globalThis.setInterval = (fn, delay) => { scheduled.push(delay); return { delay, unref() {} }; };
    globalThis.clearInterval = handle => { if (handle?.delay === 43200000) cleared = true; };
    const { startServer } = await import('./src/server.js');
    const server = startServer(); await once(server, 'listening');
    await new Promise(resolve => server.close(resolve));
    console.log(JSON.stringify({ scheduled, cleared }));
  `;
  const env = { ...process.env, DB_PATH: f.config.DB_PATH, UPLOAD_DIR: f.config.UPLOAD_DIR, STORAGE_DIR: f.config.STORAGE_DIR,
    BACKUP_DIR: f.config.BACKUP_DIR, NODE_ENV: 'development', MAINTENANCE_INTERVAL_HOURS: '12' };
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: path.resolve(import.meta.dirname, '..'), env, encoding: 'utf8' });
  assert(output.includes('43200000')); assert(output.includes('"cleared":true'));
  assert.equal(f.db.prepare('SELECT inactivo_oculto FROM businesses WHERE id = 1').get().inactivo_oculto, 1);
  assert.equal(f.db.prepare("SELECT actor_id FROM audit_logs WHERE accion = 'barrido_inactividad'").get().actor_id, null);
  f.db.prepare('UPDATE businesses SET inactivo_oculto = 0 WHERE id = 1').run();
  const testOutput = execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: path.resolve(import.meta.dirname, '..'), env: { ...env, NODE_ENV: 'test' }, encoding: 'utf8' });
  assert(!testOutput.includes('43200000'));
  assert.equal(f.db.prepare('SELECT inactivo_oculto FROM businesses WHERE id = 1').get().inactivo_oculto, 0);
});

test('Migración documentada: conserva contactos, secuencia e índice y admite usuarios de un carácter', t => {
  const f = createTestApp(); t.after(f.close);
  const db = new Database(':memory:'); t.after(() => db.close());
  const schema = fs.readFileSync(new URL('../database/schema.sql', import.meta.url), 'utf8');
  db.exec(schema.replace('length(valor) BETWEEN 1 AND 200', 'length(valor) BETWEEN 2 AND 200'));
  seedDatabase(db, f.config);
  const before = db.prepare('SELECT * FROM business_contacts ORDER BY id').all();
  db.prepare("UPDATE sqlite_sequence SET seq = 1000 WHERE name = 'business_contacts'").run();
  const document = fs.readFileSync(new URL('../../docs/especificacion-base-de-datos.md', import.meta.url), 'utf8');
  const migration = document.split('## 7.')[1].match(/```sql\r?\n([\s\S]*?)```/)[1];
  db.exec(migration);
  assert.deepEqual(db.prepare('SELECT * FROM business_contacts ORDER BY id').all(), before);
  const created = db.prepare("INSERT INTO business_contacts (business_id, tipo_contacto, valor) VALUES (1, 'instagram', 'a')").run();
  assert.equal(created.lastInsertRowid, 1001);
  assert.throws(() => db.prepare("INSERT INTO business_contacts (business_id, tipo_contacto, valor, es_principal) VALUES (1, 'tiktok', 'b', 1)").run(), { code: 'SQLITE_CONSTRAINT_UNIQUE' });
  assert.deepEqual(db.pragma('foreign_key_check'), []); assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
});
