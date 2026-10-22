import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdminController } from '../src/controllers/admin.controller.js';

test('Archivos privados: cancelar la descarga no genera 500 y los errores reales se conservan', () => {
  const controller = createAdminController({ credential: () => '/documento-privado' }, { backupFile: () => '/respaldo-privado' });
  for (const operation of ['credential', 'download']) {
    for (const code of ['ECONNABORTED', 'ENOENT', 'EACCES']) {
      const received = [];
      const failure = Object.assign(new Error('Error simulado del transporte'), { code });
      const response = { set() {}, sendFile(file, callback) { callback(failure); }, download(file, name, callback) { callback(failure); } };
      controller[operation]({ params: { userId: 4, filename: 'emprendebuho_20261022_120000.sqlite' } }, response, error => received.push(error));
      if (code === 'ECONNABORTED') assert.deepEqual(received, []);
      else if (code === 'ENOENT') { assert.equal(received[0].status, 404); assert.equal(received[0].code, 'NOT_FOUND'); }
      else assert.equal(received[0], failure);
    }
  }
});
