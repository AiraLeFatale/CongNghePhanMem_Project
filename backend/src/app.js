import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { createRepositories } from './repositories/index.js';
import { createServices } from './services/index.js';
import { createRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

/** Ghép 3 lớp: Repository (dữ liệu) → Service (nghiệp vụ) → Controller/Route (REST). */
export function createApp(db, { translator, tts, rateLimits = true } = {}) {
  const repos = { ...createRepositories(db), db };
  const services = createServices(repos, { translator, tts });

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads', express.static(config.uploadDir, { maxAge: '7d', fallthrough: false }));
  app.use('/api', createRouter(services, { rateLimits }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return { app, services, repos };
}
