import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createTestApp } from './helpers/testApp.js';
import { createBusinessPublicService } from '../src/services/businessPublic.service.js';
import { businessQuery } from '../src/validators/public.validator.js';

function fixture(t) { const f = createTestApp(); t.after(f.close); return f; }
const ids = response => response.body.data.map(item => item.id);
function assertPrivate(business) {
  assert.equal(business.mostrar_ubicacion, false);
  for (const key of ['campus_zone_id', 'zona_codigo', 'zona_nombre', 'ubicacion_detalle']) assert.equal(business[key], null);
  for (const key of ['_mapa_x', '_mapa_y', 'password_hash', 'credencial_path', 'user_id']) assert(!Object.hasOwn(business, key));
}

test('Catálogos: ocho categorías y nueve zonas, únicamente activas y en orden visual', async t => {
  const f = fixture(t);
  const response = await request(f.app).get('/api/catalogs').expect(200);
  assert.equal(response.body.data.categories.length, 8); assert.equal(response.body.data.campus_zones.length, 9);
  const mobile = response.body.data.campus_zones.at(-1);
  assert.equal(mobile.codigo, 'ZONA-MOVIL'); assert.equal(mobile.mapa_x, null);
  f.db.prepare('UPDATE categories SET activa = 0 WHERE id = 2').run();
  f.db.prepare('UPDATE campus_zones SET activa = 0 WHERE id = 1').run();
  const filtered = await request(f.app).get('/api/catalogs').expect(200);
  assert.equal(filtered.body.data.categories.length, 7); assert.equal(filtered.body.data.campus_zones.length, 8);
  // Desactivar el catálogo conserva la asociación de negocios existentes.
  assert(ids(await request(f.app).get('/api/businesses').expect(200)).includes(1));
});

test('RNF-06: lista, detalle y productos no exponen ubicación privada ni permiten filtrar por ella', async t => {
  const f = fixture(t);
  const list = await request(f.app).get('/api/businesses').expect(200);
  assert.deepEqual(ids(list), [1, 2]);
  assertPrivate(list.body.data.find(item => item.id === 2));
  assertPrivate((await request(f.app).get('/api/businesses/stickers-y-pines-cholesky').expect(200)).body.data);
  const products = await request(f.app).get('/api/products').expect(200);
  assert.equal(products.body.data.length, 7);
  for (const product of products.body.data.filter(item => item.business.id === 2)) assertPrivate(product.business);
  assert.equal((await request(f.app).get('/api/businesses?zone_id=3').expect(200)).body.data.length, 0);
  assert.equal((await request(f.app).get('/api/products?zone_id=3').expect(200)).body.data.length, 0);
  assert.deepEqual(ids(await request(f.app).get('/api/businesses?zone_id=1').expect(200)), [1]);
});

test('Búsqueda: mayúsculas, acentos, productos activos y comodines literales', async t => {
  const f = fixture(t);
  for (const q of ['BUHO', 'búho']) {
    assert.deepEqual(ids(await request(f.app).get('/api/businesses').query({ q }).expect(200)), [1, 2]);
  }
  for (const q of ['limon', 'LIMÓN']) {
    assert.deepEqual(ids(await request(f.app).get('/api/businesses').query({ q }).expect(200)), [1]);
  }
  const lemon = await request(f.app).get('/api/products?q=limon').expect(200);
  assert.equal(lemon.body.data[0].nombre, 'Pay de Limón');
  assert.equal((await request(f.app).get('/api/businesses').query({ q: '%_' }).expect(200)).body.data.length, 0);
  assert.equal((await request(f.app).get('/api/products').query({ q: "%' OR 1=1 --" }).expect(200)).body.data.length, 0);
  assert.equal((await request(f.app).get('/api/businesses?q=Galleta').expect(200)).body.data.length, 0);
  assert.equal((await request(f.app).get('/api/products?q=revisi%C3%B3n').expect(200)).body.data.length, 0);
});

test('Precios: un mismo producto debe satisfacer ambos extremos del rango', async t => {
  const f = fixture(t);
  f.db.prepare("UPDATE products SET estado = 'pausado' WHERE business_id = 1").run();
  f.db.prepare("UPDATE products SET precio = 5, estado = 'activo' WHERE id = 1").run();
  f.db.prepare("UPDATE products SET precio = 600, estado = 'activo' WHERE id = 2").run();
  f.db.prepare('UPDATE products SET precio = 150 WHERE id = 8').run();
  const response = await request(f.app).get('/api/businesses?min_price=100&max_price=200').expect(200);
  assert.deepEqual(ids(response), [2]);
  const productResponse = await request(f.app).get('/api/products?min_price=100&max_price=200').expect(200);
  assert.equal(productResponse.body.data.length, 1); assert.equal(productResponse.body.data[0].precio, 150);
  assert.deepEqual(ids(await request(f.app).get('/api/businesses?min_price=600&max_price=600').expect(200)), [1]);
});

test('Horarios: apertura incluida, cierre excluido y available_now resuelto en Hermosillo', async t => {
  const f = fixture(t);
  f.db.prepare("UPDATE business_schedules SET hora_apertura = '08:00', hora_cierre = '14:00', cerrado_todo_el_dia = 0 WHERE business_id = 1 AND dia_semana = 1").run();
  for (const [time, expected] of [['07:59', []], ['08:00', [1]], ['13:59', [1]], ['14:00', []]]) {
    assert.deepEqual(ids(await request(f.app).get('/api/businesses').query({ ids: '1', day_of_week: '1', time }).expect(200)), expected);
  }
  for (const [time, count] of [['13:59', 1], ['14:00', 0]]) {
    const service = createBusinessPublicService(f.db, () => ({ dow: 1, time }));
    assert.equal(service.list(businessQuery.parse({ ids: '1', available_now: 'true' })).items.length, count);
  }
});

test('Detalle: horarios completos, contactos principales y productos activos antes de pausados', async t => {
  const f = fixture(t);
  const response = await request(f.app).get('/api/businesses/buho-brownies-postres').expect(200);
  const business = response.body.data;
  assert.equal(business.schedules.length, 7); assert.equal(business.contacts[0].es_principal, true);
  assert.equal(business.contacts[0].tipo_contacto, 'whatsapp');
  assert.equal(business.products.length, 5); assert.equal(business.products.at(-1).estado, 'pausado');
  assert.equal(typeof business.esta_abierto, 'boolean'); assert.match(business.updated_at, /Z$/);
  assert(!/motivo_moderacion|moderado_por|_mapa_/.test(JSON.stringify(business)));
  const stickers = await request(f.app).get('/api/businesses/stickers-y-pines-cholesky').expect(200);
  assert.equal(stickers.body.data.products.length, 3);
  await request(f.app).get('/api/businesses/no-existe').expect(404);
});

test('Visibilidad y favoritos: omite inexistentes, suspendidos e inactivos sin fallar', async t => {
  const f = fixture(t);
  assert.deepEqual(ids(await request(f.app).get('/api/businesses?ids=1,999,suspendido').expect(200)), [1]);
  assert.deepEqual(ids(await request(f.app).get('/api/businesses?ids=suspendido').expect(200)), []);
  f.db.prepare("UPDATE users SET estado_cuenta = 'suspendida', motivo_estado = 'Revisión' WHERE id = 2").run();
  assert.deepEqual(ids(await request(f.app).get('/api/businesses?ids=1,2').expect(200)), [2]);
  await request(f.app).get('/api/businesses/buho-brownies-postres').expect(404);
  assert(!(await request(f.app).get('/api/products').expect(200)).body.data.some(item => item.business.id === 1));
  f.db.prepare('UPDATE businesses SET inactivo_oculto = 1 WHERE id = 2').run();
  assert.equal((await request(f.app).get('/api/businesses').expect(200)).body.data.length, 0);
  assert.equal((await request(f.app).get('/api/products').expect(200)).body.data.length, 0);
});

test('Orden, proximidad, filtros combinados y metadatos de paginación', async t => {
  const f = fixture(t);
  const page = await request(f.app).get('/api/businesses?sort=alpha_desc&page=2&limit=1').expect(200);
  assert.deepEqual(ids(page), [1]); assert.deepEqual(page.body.meta, { page: 2, limit: 1, total: 2, total_pages: 2 });
  assert.deepEqual(ids(await request(f.app).get('/api/businesses?category_id=6&open_now=false').expect(200)), [2]);
  f.db.prepare("UPDATE users SET estado_cuenta = 'aprobada' WHERE id = 4").run();
  f.db.prepare('UPDATE businesses SET mostrar_ubicacion = 1, campus_zone_id = 2 WHERE id = 3').run();
  assert.deepEqual(ids(await request(f.app).get('/api/businesses?sort=proximity&preferred_zone_id=3').expect(200)), [3, 1, 2]);
  assert.equal((await request(f.app).get('/api/businesses?sort=proximity&preferred_zone_id=9').expect(200)).body.data[0].id, 1);
  const products = await request(f.app).get('/api/products?sort=price_desc&limit=2').expect(200);
  assert.deepEqual(products.body.data.map(item => item.precio), [250, 60]); assert.equal(products.body.meta.total, 7);
});

test('Validación de filtros rechaza rangos, horas, ordenamientos e IDs malformados', async t => {
  const f = fixture(t);
  for (const query of ['day_of_week=1', 'time=08:00', 'day_of_week=1&time=24:00', 'min_price=100&max_price=20', 'q=a', 'page=0', 'page=9007199254740991', 'limit=51', 'sort=SQL', 'zone_id=abc', 'q=x&q=y']) {
    const response = await request(f.app).get('/api/businesses?' + query).expect(400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  }
  for (const query of ['sort=proximity', 'min_price=-1', 'max_price=NaN', 'open_now=1']) await request(f.app).get('/api/products?' + query).expect(400);
  await request(f.app).get('/api/businesses').query({ ids: Array(101).fill('1').join(',') }).expect(400);
});
