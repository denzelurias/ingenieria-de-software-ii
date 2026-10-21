import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { env } from './config/env.js';
import { getDb, closeDb } from './config/db.js';
import { createApp } from './app.js';

export function startServer(config = env) {
  if (config !== env) throw new Error('El servidor debe usar la configuración validada del entorno.');
  getDb();
  const server = createApp({ config }).listen(config.PORT, () => {
    console.log(`EmprendeBúho disponible en http://localhost:${config.PORT}`);
  });
  const stop = () => server.close(() => { closeDb(); });
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  server.once('error', error => {
    closeDb();
    console.error('No se pudo iniciar el servidor. Revisa el puerto y los permisos.', error);
    process.exitCode = 1;
  });
  server.once('close', () => {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    closeDb();
  });
  // El mantenimiento periódico se conectará en F2B, cuando exista maintenance.service.js.
  return server;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try { startServer(); }
  catch (error) {
    console.error('No se pudo iniciar EmprendeBúho. Revisa la configuración del backend.', error);
    process.exitCode = 1;
  }
}
