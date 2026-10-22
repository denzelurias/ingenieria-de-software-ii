import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { createApiRouter } from './routes/index.js';
import { AppError } from './utils/AppError.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';

export function createApp({ db, config = env, configure } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin(origin, done) {
    if (!origin || origin === config.CORS_ORIGIN) done(null, true);
    else done(new AppError(403, 'FORBIDDEN', 'El origen de esta solicitud no está permitido.'));
  } }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads', express.static(config.UPLOAD_DIR, { dotfiles: 'deny', index: false, redirect: false, fallthrough: true }));
  app.use('/api', createApiRouter({ db, config }));
  // Punto de composición para las suites temporales; no incorpora endpoints de fases posteriores.
  if (configure) configure(app);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
export default createApp;
