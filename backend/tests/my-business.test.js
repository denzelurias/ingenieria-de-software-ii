import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { createTestApp } from './helpers/testApp.js';

async function fixture(t) {
  const f = createTestApp(); t.after(f.close);
  const login = async (email, password = 'Buho2026!') => (await request(f.app).post('/api/auth/login').send({ identificador: email, password }).expect(200)).body.data.token;
  return { ...f, token: await login('fernanda.demo@unison.mx'), other: await login('orlando.demo@unison.mx'), admin: await login('admin@unison.mx', 'AdminUnison2026!') };
}
const bearer = token => `Bearer ${token}`;
const image = operation => operation.attach('imagen', Buffer.from('imagen de prueba'), { filename: 'x.png', contentType: 'image/png' });
const product = operation => operation.field('nombre', 'Nuevo postre').field('descripcion', 'Postre de prueba').field('precio', '35.50');
const days = Array.from({ length: 7 }, (_, dia_semana) => ({ dia_semana, cerrado_todo_el_dia: dia_semana === 0,
  hora_apertura: dia_semana === 0 ? null : '08:00', hora_cierre: dia_semana === 0 ? null : '14:00' }));

test('Panel: autenticación, roles y separación de datos administrativos y públicos', async t => {
  const f = await fixture(t);
  await request(f.app).get('/api/my-business').expect(401);
  await request(f.app).get('/api/my-business').set('Authorization', bearer(f.admin)).expect(403);
  const own = await request(f.app).get('/api/my-business').set('Authorization', bearer(f.other)).expect(200);
  assert.equal(own.body.data.campus_zone_id, 3); assert.equal(own.body.data.mostrar_ubicacion, false);
  assert.equal(own.body.data.products.length, 4); assert(own.body.data.products.some(item => item.motivo_moderacion));
  const preview = await request(f.app).get('/api/my-business/preview').set('Authorization', bearer(f.other)).expect(200);
  const publicView = await request(f.app).get('/api/businesses/stickers-y-pines-cholesky').expect(200);
  assert.deepEqual(preview.body, publicView.body);
  assert.equal(preview.body.data.products.length, 3);
  for (const key of ['campus_zone_id', 'zona_codigo', 'zona_nombre', 'ubicacion_detalle']) assert.equal(preview.body.data[key], null);
  assert(!/credencial_path|password_hash|_mapa_/.test(JSON.stringify(own.body)));
});

test('Perfil: categoría vigente o previamente asignada, slug único y descripción', async t => {
  const f = await fixture(t);
  const update = body => request(f.app).put('/api/my-business/profile').set('Authorization', bearer(f.token)).send(body);
  const body = { nombre_negocio: 'Stickers y Pines Cholesky', category_id: 2, descripcion: 'Nueva descripción' };
  const response = await update(body).expect(200);
  assert.equal(response.body.data.slug, 'stickers-y-pines-cholesky-2');
  f.db.prepare('UPDATE categories SET activa = 0 WHERE id IN (2, 3)').run();
  await update({ ...body, category_id: 2 }).expect(200);
  await update({ ...body, category_id: 3 }).expect(400);
  await update({ ...body, descripcion: 'x'.repeat(1001) }).expect(400);
});

test('Ubicación: exige zona, conserva datos al ocultar y aplica privacidad inmediata', async t => {
  const f = await fixture(t);
  const location = body => request(f.app).patch('/api/my-business/location').set('Authorization', bearer(f.token)).send(body);
  await location({ mostrar_ubicacion: false, campus_zone_id: null }).expect(200);
  assert.equal((await location({ mostrar_ubicacion: true }).expect(400)).body.error.code, 'VALIDATION_ERROR');
  await location({ campus_zone_id: 3, ubicacion_detalle: 'Junto a las mesas', mostrar_ubicacion: true }).expect(200);
  await location({ mostrar_ubicacion: false }).expect(200);
  const stored = f.db.prepare('SELECT * FROM businesses WHERE id = 1').get();
  assert.equal(stored.campus_zone_id, 3); assert.equal(stored.ubicacion_detalle, 'Junto a las mesas');
  const preview = await request(f.app).get('/api/my-business/preview').set('Authorization', bearer(f.token)).expect(200);
  assert.equal(preview.body.data.campus_zone_id, null);
  assert(!(await request(f.app).get('/api/businesses?zone_id=3').expect(200)).body.data.some(row => row.id === 1));
  await location({ campus_zone_id: 999 }).expect(400);
});

test('Horarios: siete días, sin duplicados ni intervalos invertidos', async t => {
  const f = await fixture(t);
  const save = schedules => request(f.app).put('/api/my-business/schedules').set('Authorization', bearer(f.token)).send({ schedules });
  const result = await save(days).expect(200);
  assert.equal(result.body.data.schedules.length, 7);
  for (const invalid of [days.slice(1), days.map(() => days[0]), days.map(day => ({ ...day, hora_apertura: '24:00' })), days.map(day => ({ ...day, cerrado_todo_el_dia: false, hora_apertura: '14:00', hora_cierre: '08:00' }))]) await save(invalid).expect(400);
  assert.deepEqual((await request(f.app).get('/api/my-business').set('Authorization', bearer(f.token))).body.data.schedules, result.body.data.schedules);
});

test('Contactos: normalización, principal automático y reemplazo atómico', async t => {
  const f = await fixture(t);
  const save = contacts => request(f.app).put('/api/my-business/contacts').set('Authorization', bearer(f.token)).send({ contacts });
  const response = await save([{ tipo_contacto: 'whatsapp', valor: '+52 (662) 123-4567', es_principal: false },
    { tipo_contacto: 'instagram', valor: 'https://www.instagram.com/buho.demo/', es_principal: false },
    { tipo_contacto: 'tiktok', valor: 'https://www.tiktok.com/@buho.demo', es_principal: false }]).expect(200);
  assert.equal(response.body.data.contacts[0].valor, '6621234567'); assert.equal(response.body.data.contacts[0].es_principal, true);
  assert.equal(response.body.data.contacts[1].valor, 'buho.demo'); assert.equal(response.body.data.contacts[2].valor, 'buho.demo');
  const original = response.body.data.contacts;
  const duplicate = [{ tipo_contacto: 'whatsapp', valor: '6621234567', es_principal: true }, { tipo_contacto: 'whatsapp', valor: '+526621234567', es_principal: false }];
  await save(duplicate).expect(409);
  assert.deepEqual((await request(f.app).get('/api/my-business').set('Authorization', bearer(f.token))).body.data.contacts, original);
  await save([{ tipo_contacto: 'otro', valor: 'javascript:alert(1)', es_principal: true }]).expect(400);
  await save([{ tipo_contacto: 'instagram', valor: 'https://no-permitido.example/buho', es_principal: true }]).expect(400);
  const single = await save([{ tipo_contacto: 'instagram', valor: '@a', es_principal: true }]).expect(200);
  assert.equal(single.body.data.contacts[0].valor, 'a');
  assert.equal((await save([]).expect(200)).body.data.contacts.length, 0);
});

test('Productos: imagen obligatoria, pertenencia y borrado lógico con eliminación del archivo', async t => {
  const f = await fixture(t);
  await product(request(f.app).post('/api/my-business/products').set('Authorization', bearer(f.token))).expect(400);
  const created = await image(product(request(f.app).post('/api/my-business/products').set('Authorization', bearer(f.token)))).expect(201);
  const id = created.body.data.id;
  const target = path.join(f.config.UPLOAD_DIR, created.body.data.imagen_url.slice('/uploads/'.length));
  assert(fs.existsSync(target));
  await request(f.app).put(`/api/my-business/products/${id}`).set('Authorization', bearer(f.other)).field('nombre', 'Ajeno').expect(404);
  await request(f.app).delete(`/api/my-business/products/${id}`).set('Authorization', bearer(f.other)).expect(404);
  await request(f.app).put(`/api/my-business/products/${id}`).set('Authorization', bearer(f.token)).field('precio', '1.234').expect(400);
  await request(f.app).delete(`/api/my-business/products/${id}`).set('Authorization', bearer(f.token)).expect(200);
  assert(!fs.existsSync(target));
  const row = f.db.prepare('SELECT * FROM products WHERE id = :id').get({ id });
  assert.equal(row.estado, 'eliminado'); assert.equal(row.imagen_url, null);
  await request(f.app).patch(`/api/my-business/products/${id}/status`).set('Authorization', bearer(f.token)).send({ estado: 'activo' }).expect(404);
});

test('Moderación: edición conserva el bloqueo y señala una corrección incluso en el mismo segundo', async t => {
  const f = await fixture(t);
  f.db.prepare('UPDATE products SET moderado_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = 9').run();
  await request(f.app).put('/api/my-business/products/9').set('Authorization', bearer(f.other)).field('descripcion', 'Contenido corregido por el emprendedor').expect(200);
  const row = f.db.prepare('SELECT * FROM products WHERE id = 9').get();
  assert.equal(row.estado, 'oculto_admin'); assert(row.updated_at > row.moderado_at);
  assert.equal((await request(f.app).patch('/api/my-business/products/9/status').set('Authorization', bearer(f.other)).send({ estado: 'activo' }).expect(409)).body.error.code, 'PRODUCT_LOCKED');
  const review = await request(f.app).get('/api/admin/products?estado=oculto_admin').set('Authorization', bearer(f.admin)).expect(200);
  assert.equal(review.body.data.find(item => item.id === 9).editado_tras_moderacion, true);
});

test('Fotos: perfil y menú en sus directorios, reemplazo, borrado y limpieza de subidas fallidas', async t => {
  const f = await fixture(t);
  const original = f.db.prepare('SELECT foto_perfil_url FROM businesses WHERE id = 1').get().foto_perfil_url;
  const save = () => request(f.app).put('/api/my-business/photos').set('Authorization', bearer(f.token));
  await save().expect(400);
  const response = await save().attach('foto_perfil', Buffer.from('perfil'), { filename: 'p.png', contentType: 'image/png' })
    .attach('foto_menu', Buffer.from('menu'), { filename: 'm.webp', contentType: 'image/webp' }).expect(200);
  for (const [key, prefix] of [['foto_perfil_url', '/uploads/profiles/'], ['foto_menu_url', '/uploads/menus/']]) {
    assert(response.body.data[key].startsWith(prefix)); assert(fs.existsSync(path.join(f.config.UPLOAD_DIR, response.body.data[key].slice('/uploads/'.length))));
  }
  assert(!fs.existsSync(path.join(f.config.UPLOAD_DIR, original.slice('/uploads/'.length))));
  await request(f.app).delete('/api/my-business/photos/menu').set('Authorization', bearer(f.token)).expect(200);
  assert(!fs.existsSync(path.join(f.config.UPLOAD_DIR, response.body.data.foto_menu_url.slice('/uploads/'.length))));
  const count = fs.readdirSync(path.join(f.config.UPLOAD_DIR, 'products')).length;
  await image(request(f.app).post('/api/my-business/products').set('Authorization', bearer(f.token)).field('nombre', 'x')).expect(400);
  assert.equal(fs.readdirSync(path.join(f.config.UPLOAD_DIR, 'products')).length, count);
});

test('Actividad: todas las mutaciones reactivan el negocio; los errores no alteran la actividad', async t => {
  const f = await fixture(t);
  let id;
  const auth = operation => operation.set('Authorization', bearer(f.token));
  const operations = [
    () => auth(request(f.app).patch('/api/my-business/open-status')).send({ esta_abierto: false }),
    () => auth(request(f.app).put('/api/my-business/profile')).send({ nombre_negocio: 'Perfil actualizado', category_id: 2, descripcion: 'Descripción' }),
    () => auth(request(f.app).patch('/api/my-business/location')).send({ mostrar_ubicacion: false }),
    () => auth(request(f.app).put('/api/my-business/schedules')).send({ schedules: days }),
    () => auth(request(f.app).put('/api/my-business/contacts')).send({ contacts: [] }),
    () => auth(request(f.app).put('/api/my-business/photos')).attach('foto_perfil', Buffer.from('foto'), { filename: 'x.png', contentType: 'image/png' }),
    () => auth(request(f.app).delete('/api/my-business/photos/perfil')),
    async () => { const response = await image(product(auth(request(f.app).post('/api/my-business/products')))); id = response.body.data.id; return response; },
    () => auth(request(f.app).put(`/api/my-business/products/${id}`)).field('nombre', 'Nombre actualizado'),
    () => auth(request(f.app).patch(`/api/my-business/products/${id}/status`)).send({ estado: 'pausado' }),
    () => auth(request(f.app).delete(`/api/my-business/products/${id}`))
  ];
  for (const operation of operations) {
    f.db.prepare("UPDATE businesses SET inactivo_oculto = 1, last_activity_at = '2000-01-01 00:00:00' WHERE id = 1").run();
    const response = await operation(); assert([200, 201].includes(response.status), JSON.stringify(response.body));
    const row = f.db.prepare('SELECT inactivo_oculto, last_activity_at FROM businesses WHERE id = 1').get();
    assert.equal(row.inactivo_oculto, 0); assert(row.last_activity_at > '2000-01-01 00:00:00');
  }
  f.db.prepare("UPDATE businesses SET inactivo_oculto = 1, last_activity_at = '2000-01-01 00:00:00' WHERE id = 1").run();
  await auth(request(f.app).patch('/api/my-business/open-status')).send({ esta_abierto: 'true' }).expect(400);
  assert.equal(f.db.prepare('SELECT inactivo_oculto FROM businesses WHERE id = 1').get().inactivo_oculto, 1);
});
