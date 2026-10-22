import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import request from 'supertest';
import { createTestApp } from './helpers/testApp.js';
import { createApp } from '../src/app.js';

function fixture(t) { const f = createTestApp(); t.after(f.close); return f; }
const report = { business_id: 1, motivo: 'informacion_falsa', descripcion: 'Información que debe ser revisada.' };

test('Reportes anónimos: crea pendiente y almacena hash con sal, sin IP en claro', async t => {
  const f = fixture(t);
  const response = await request(f.app).post('/api/reports').send({ ...report, product_id: 1 }).expect(201);
  assert.equal(response.body.data.estado_reporte, 'pendiente');
  const row = f.db.prepare('SELECT * FROM reports WHERE id = :id').get({ id: response.body.data.id });
  const loopbackHashes = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].map(ip => createHash('sha256').update(ip + f.config.REPORT_IP_SALT).digest('hex'));
  assert(loopbackHashes.includes(row.ip_hash));
  assert.equal(row.product_id, 1);
  assert(!/ip_hash|127\.0\.0\.1/.test(JSON.stringify(response.body)));
  assert.equal((await request(f.app).post('/api/reports').send(report).expect(429)).body.error.code, 'RATE_LIMITED');
  // Negocio diferente: misma IP permitida dentro del límite general.
  await request(f.app).post('/api/reports').send({ ...report, business_id: 2 }).expect(201);
});

test('Reportes: ventana de 24 horas y cabeceras de IP no confiables', async t => {
  const f = fixture(t);
  await request(f.app).post('/api/reports').send(report).expect(201);
  await request(f.app).post('/api/reports').set('X-Forwarded-For', '192.0.2.99').send(report).expect(429);
  f.db.prepare("UPDATE reports SET created_at = datetime('now', '-25 hours') WHERE business_id = 1").run();
  await request(f.app).post('/api/reports').send(report).expect(201);
});

test('Reportes: valida motivo, descripción y pertenencia sin aceptar negocios ocultos', async t => {
  const f = fixture(t);
  for (const body of [{ ...report, motivo: 'otro', descripcion: 'Corto' }, { ...report, motivo: 'invalido' }, { ...report, business_id: '1' }, { ...report, descripcion: 'x'.repeat(1001) }]) {
    assert.equal((await request(f.app).post('/api/reports').send(body).expect(400)).body.error.code, 'VALIDATION_ERROR');
  }
  for (const body of [{ ...report, business_id: 999 }, { ...report, business_id: 3 }, { ...report, product_id: 8 }]) {
    await request(f.app).post('/api/reports').send(body).expect(404);
  }
  await request(f.app).post('/api/reports').send({ ...report, motivo: 'otro', descripcion: 'Descripción suficientemente detallada.' }).expect(201);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS total FROM reports WHERE business_id = 1').get().total, 1);
});

test('Reportes: límite real de cinco solicitudes por hora, independiente de deduplicación', async t => {
  const f = fixture(t);
  const app = createApp({ db: f.db, config: { ...f.config, NODE_ENV: 'production' } });
  for (let count = 0; count < 5; count += 1) await request(app).post('/api/reports').send({ ...report, business_id: 999 }).expect(404);
  const response = await request(app).post('/api/reports').send(report).expect(429);
  assert.equal(response.body.error.code, 'RATE_LIMITED');
  assert(response.headers['retry-after']);
});
