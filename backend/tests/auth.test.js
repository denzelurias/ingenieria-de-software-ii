import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createTestApp } from './helpers/testApp.js';
import { createApp } from '../src/app.js';

const registration = { nombre_completo: 'Estudiante de Prueba', email_institucional: 'prueba@unison.mx', matricula_unison: '221200099',
  password: 'Prueba2026!', nombre_negocio: 'Búho Nuevo', category_id: 2, descripcion: 'Postres de prueba' };
function fixture(t) { const f = createTestApp(); t.after(f.close); return f; }
function register(app, changes = {}, file = true) {
  let operation = request(app).post('/api/auth/register-request');
  for (const [key, value] of Object.entries({ ...registration, ...changes })) operation = operation.field(key, String(value));
  return file ? operation.attach('credencial', Buffer.from('credencial de prueba'), { filename: 'credencial.png', contentType: 'image/png' }) : operation;
}
async function login(app, identificador = 'fernanda.demo@unison.mx', password = 'Buho2026!') {
  return request(app).post('/api/auth/login').send({ identificador, password });
}

test('Registro: validaciones, archivo obligatorio y limpieza en cada rechazo', async t => {
  const f = fixture(t);
  const files = () => fs.readdirSync(path.join(f.config.STORAGE_DIR, 'credentials')).length;
  const initial = files();
  for (const changes of [{ email_institucional: 'prueba@gmail.com' }, { matricula_unison: '123' }, { password: 'abcdefgh' }, { category_id: 999 }, { nombre_negocio: 'a' }]) {
    const response = await register(f.app, changes).expect(400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
    assert.equal(files(), initial);
  }
  await register(f.app, {}, false).expect(400);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS total FROM users').get().total, 5);
});

test('Registro: crea cuenta pendiente, negocio privado y siete horarios cerrados', async t => {
  const f = fixture(t);
  const response = await register(f.app).expect(201);
  assert.equal(response.body.data.estado_cuenta, 'pendiente');
  const id = response.body.data.user_id;
  const user = f.db.prepare('SELECT * FROM users WHERE id = :id').get({ id });
  assert.notEqual(user.password_hash, registration.password);
  assert(fs.existsSync(path.join(f.config.STORAGE_DIR, user.credencial_path)));
  const business = f.db.prepare('SELECT * FROM businesses WHERE user_id = :id').get({ id });
  assert.equal(business.mostrar_ubicacion, 0); assert.equal(business.esta_abierto, 0);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS total FROM business_schedules WHERE business_id = :id AND cerrado_todo_el_dia = 1').get({ id: business.id }).total, 7);
  const pending = await login(f.app, registration.email_institucional, registration.password);
  assert.equal(pending.status, 403); assert.equal(pending.body.error.code, 'ACCOUNT_PENDING');
  assert.match(pending.body.error.details.fecha_solicitud, /Z$/);
  const status = await request(f.app).post('/api/auth/request-status').send({ email_institucional: registration.email_institucional, matricula_unison: registration.matricula_unison }).expect(200);
  assert.equal(status.body.data.nombre_negocio, registration.nombre_negocio);
  await request(f.app).post('/api/auth/request-status').send({ email_institucional: registration.email_institucional, matricula_unison: '221200098' }).expect(404);
  await request(f.app).get('/api/auth/request-status').expect(404);
  await register(f.app).expect(409);
});

test('Registro: slug único, correo normalizado y conflictos de identidades', async t => {
  const f = fixture(t);
  await register(f.app, { email_institucional: 'NUEVO@UNISON.MX' }).expect(201);
  await register(f.app, { email_institucional: 'segundo@unison.mx', matricula_unison: '221200098' }).expect(201);
  const slugs = f.db.prepare("SELECT slug FROM businesses WHERE nombre_negocio = 'Búho Nuevo' ORDER BY id").all().map(row => row.slug);
  assert.deepEqual(slugs, ['buho-nuevo', 'buho-nuevo-2']);
  assert(f.db.prepare("SELECT id FROM users WHERE email_institucional = 'nuevo@unison.mx'").get());
  f.db.prepare("UPDATE users SET estado_cuenta = 'eliminada' WHERE id = 4").run();
  await register(f.app, { email_institucional: 'rechazado.demo@unison.mx', matricula_unison: '221200003' }).expect(409);
  await register(f.app, { email_institucional: 'rechazado.demo@unison.mx', matricula_unison: '221200097' }).expect(409);
  await register(f.app, { email_institucional: 'otra.persona@unison.mx', matricula_unison: '221200004' }).expect(409);
  await register(f.app, { email_institucional: 'fernanda.demo@unison.mx', matricula_unison: '221200001' }).expect(409);
});

test('Registro: reutiliza rechazada y eliminada sin duplicar usuario, negocio ni horarios', async t => {
  const f = fixture(t);
  for (const id of [3, 5]) {
    if (id === 3) f.db.prepare("UPDATE users SET estado_cuenta = 'eliminada' WHERE id = :id").run({ id });
    const before = f.db.prepare('SELECT * FROM users WHERE id = :id').get({ id });
    const business = f.db.prepare('SELECT id FROM businesses WHERE user_id = :id').get({ id });
    const response = await register(f.app, { email_institucional: before.email_institucional, matricula_unison: before.matricula_unison }).expect(201);
    assert.equal(response.body.data.user_id, id);
    const after = f.db.prepare('SELECT * FROM users WHERE id = :id').get({ id });
    assert.equal(after.estado_cuenta, 'pendiente'); assert.equal(after.motivo_estado, null);
    assert.equal(after.token_version, before.token_version + 1);
    assert.notEqual(after.credencial_path, before.credencial_path);
    assert(!fs.existsSync(path.join(f.config.STORAGE_DIR, before.credencial_path)));
    assert.equal(f.db.prepare('SELECT id FROM businesses WHERE user_id = :id').get({ id }).id, business.id);
  }
  assert.equal(f.db.prepare('SELECT COUNT(*) AS total FROM users').get().total, 5);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS total FROM business_schedules').get().total, 28);
});

test('Login: contraseña antes del estado, JWT HS256 y restauración de sesión sin datos privados', async t => {
  const f = fixture(t);
  for (const email of ['nuevo.emprendedor@unison.mx', 'rechazado.demo@unison.mx', 'inexistente@unison.mx']) {
    assert.equal((await login(f.app, email, 'Incorrecta1')).body.error.code, 'INVALID_CREDENTIALS');
  }
  const rejected = await login(f.app, 'rechazado.demo@unison.mx');
  assert.equal(rejected.status, 403); assert.equal(rejected.body.error.details.motivo_estado, 'La credencial no es legible');
  f.db.prepare("UPDATE businesses SET inactivo_oculto = 1, last_activity_at = '2000-01-01 00:00:00' WHERE user_id = 2").run();
  const response = await login(f.app, '221200001');
  assert.equal(response.status, 200);
  const payload = jwt.verify(response.body.data.token, f.config.JWT_SECRET, { algorithms: ['HS256'] });
  assert.equal(payload.sub, 2); assert.equal(payload.tv, 0);
  assert.equal(f.db.prepare('SELECT inactivo_oculto FROM businesses WHERE user_id = 2').get().inactivo_oculto, 0);
  const me = await request(f.app).get('/api/auth/me').set('Authorization', `Bearer ${response.body.data.token}`).expect(200);
  assert.equal(me.body.data.user.id, 2);
  assert(!/password_hash|credencial_path|token_version/.test(JSON.stringify(me.body)));
  await request(f.app).get('/api/auth/me').expect(401);
});

test('Login: suspensión inmediata y vencida, con notificación de reactivación', async t => {
  const f = fixture(t);
  const session = await login(f.app);
  const bearer = `Bearer ${session.body.data.token}`;
  f.db.prepare("UPDATE users SET estado_cuenta = 'suspendida', motivo_estado = 'Revisión', token_version = token_version + 1 WHERE id = 2").run();
  assert.equal((await request(f.app).get('/api/auth/me').set('Authorization', bearer).expect(403)).body.error.code, 'ACCOUNT_SUSPENDED');
  assert.equal((await login(f.app)).body.error.code, 'ACCOUNT_SUSPENDED');
  f.db.prepare("UPDATE users SET suspendida_hasta = '2000-01-01 00:00:00' WHERE id = 2").run();
  const restored = await login(f.app);
  assert.equal(restored.status, 200); assert.equal(restored.body.data.unread_notifications, 1);
  assert.equal((await request(f.app).get('/api/auth/me').set('Authorization', bearer).expect(401)).body.error.code, 'UNAUTHORIZED');
});

test('Recuperación: hash, código único, caducidad, contraseña nueva y revocación inmediata', async t => {
  t.mock.method(console, 'info', () => {});
  const f = fixture(t);
  const before = await login(f.app);
  const first = await request(f.app).post('/api/auth/forgot-password').send({ email_institucional: 'fernanda.demo@unison.mx' }).expect(200);
  assert.match(first.body.data.dev_codigo, /^\d{6}$/);
  const second = await request(f.app).post('/api/auth/forgot-password').send({ email_institucional: 'fernanda.demo@unison.mx' }).expect(200);
  const codes = f.db.prepare('SELECT * FROM password_reset_tokens ORDER BY id').all();
  assert.equal(codes[0].usado, 1); assert.equal(codes[1].codigo_hash.length, 64);
  assert.notEqual(codes[1].codigo_hash, second.body.data.dev_codigo);
  const body = { email_institucional: 'fernanda.demo@unison.mx', codigo_recuperacion: second.body.data.dev_codigo, nueva_password: 'NuevaClave2026!' };
  await request(f.app).post('/api/auth/reset-password').send(body).expect(200);
  await request(f.app).get('/api/auth/me').set('Authorization', `Bearer ${before.body.data.token}`).expect(401);
  assert.equal((await login(f.app)).status, 401);
  assert.equal((await login(f.app, 'fernanda.demo@unison.mx', body.nueva_password)).status, 200);
  await request(f.app).post('/api/auth/reset-password').send(body).expect(400);
  const next = await request(f.app).post('/api/auth/forgot-password').send({ email_institucional: body.email_institucional }).expect(200);
  f.db.prepare("UPDATE password_reset_tokens SET expires_at = '2000-01-01 00:00:00' WHERE usado = 0").run();
  await request(f.app).post('/api/auth/reset-password').send({ ...body, codigo_recuperacion: next.body.data.dev_codigo }).expect(400);
});

test('Recuperación: quinto intento persiste el bloqueo y producción no expone el código', async t => {
  t.mock.method(console, 'info', () => {});
  const f = fixture(t);
  const email_institucional = 'fernanda.demo@unison.mx';
  const response = await request(f.app).post('/api/auth/forgot-password').send({ email_institucional }).expect(200);
  const wrong = response.body.data.dev_codigo === '111111' ? '222222' : '111111';
  for (let index = 0; index < 5; index += 1) {
    assert.equal((await request(f.app).post('/api/auth/reset-password').send({ email_institucional, codigo_recuperacion: wrong, nueva_password: 'NuevaClave2026!' }).expect(400)).body.error.code, 'RESET_CODE_INVALID');
  }
  const code = f.db.prepare('SELECT * FROM password_reset_tokens ORDER BY id DESC LIMIT 1').get();
  assert.equal(code.intentos, 5); assert.equal(code.usado, 1);
  await request(f.app).post('/api/auth/reset-password').send({ email_institucional, codigo_recuperacion: response.body.data.dev_codigo, nueva_password: 'NuevaClave2026!' }).expect(400);
  const production = createApp({ db: f.db, config: { ...f.config, NODE_ENV: 'production' } });
  const present = await request(production).post('/api/auth/forgot-password').send({ email_institucional }).expect(200);
  const absent = await request(production).post('/api/auth/forgot-password').send({ email_institucional: 'no-existe@unison.mx' }).expect(200);
  assert.deepEqual(present.body, absent.body); assert(!Object.hasOwn(present.body.data, 'dev_codigo'));
});

test('Baja: contraseña y rol obligatorios, auditoría y token invalidado al instante', async t => {
  const f = fixture(t);
  const session = await login(f.app);
  const bearer = `Bearer ${session.body.data.token}`;
  await request(f.app).delete('/api/auth/my-account').set('Authorization', bearer).send({ password_actual: 'Incorrecta1' }).expect(401);
  await request(f.app).delete('/api/auth/my-account').set('Authorization', bearer).send({ password_actual: 'Buho2026!' }).expect(200);
  assert.equal((await request(f.app).get('/api/auth/me').set('Authorization', bearer).expect(401)).body.error.code, 'UNAUTHORIZED');
  const listing = await request(f.app).get('/api/businesses').expect(200);
  assert(!listing.body.data.some(item => item.id === 1));
  assert.equal(f.db.prepare("SELECT COUNT(*) AS total FROM audit_logs WHERE accion = 'eliminar_cuenta' AND actor_id = 2").get().total, 1);
  assert.equal((await login(f.app)).status, 401);
  const admin = await login(f.app, 'admin@unison.mx', 'AdminUnison2026!');
  await request(f.app).delete('/api/auth/my-account').set('Authorization', `Bearer ${admin.body.data.token}`).send({ password_actual: 'AdminUnison2026!' }).expect(403);
});

test('Notificaciones: aislamiento, últimas 50, lectura individual y lectura total', async t => {
  const f = fixture(t);
  const insert = f.db.prepare("INSERT INTO notifications (user_id, tipo, titulo, mensaje) VALUES (:id, 'sistema', 'Aviso', 'Mensaje')");
  const other = Number(insert.run({ id: 3 }).lastInsertRowid);
  for (let index = 0; index < 55; index += 1) insert.run({ id: 2 });
  const session = await login(f.app);
  const bearer = `Bearer ${session.body.data.token}`;
  const list = await request(f.app).get('/api/notifications').set('Authorization', bearer).expect(200);
  assert.equal(list.body.data.items.length, 50); assert.equal(list.body.data.unread_count, 55);
  assert.equal(list.body.data.items[0].leida, false);
  const id = list.body.data.items[0].id;
  await request(f.app).patch(`/api/notifications/${other}/read`).set('Authorization', bearer).expect(404);
  await request(f.app).patch(`/api/notifications/${id}/read`).set('Authorization', bearer).expect(200);
  await request(f.app).patch('/api/notifications/read-all').set('Authorization', bearer).expect(200);
  assert.equal((await request(f.app).get('/api/notifications').set('Authorization', bearer).expect(200)).body.data.unread_count, 0);
  await request(f.app).get('/api/notifications').expect(401);
});
