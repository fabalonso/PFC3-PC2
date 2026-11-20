import express from 'express';
import { fileURLToPath } from 'node:url';
import { pool } from './src/db.js';
import { placesRouter } from './src/places.js';
import { accountRouter } from './src/account.js';
import { offersRouter } from './src/offers.js';

export function createApp(database = pool) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    });
    next();
  });
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const origin = req.get('Origin');
    const mutates = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (mutates && req.get('Sec-Fetch-Site') === 'cross-site') {
      return res.status(403).json({ error: 'Origen de solicitud no permitido.' });
    }
    if (mutates && origin) {
      let host;
      try { host = new URL(origin).host; } catch { /* An invalid Origin is rejected below. */ }
      if (host !== req.get('host')) {
        return res.status(403).json({ error: 'Origen de solicitud no permitido.' });
      }
    }
    next();
  });
  app.use(express.json({ limit: '12kb' }));
  app.get('/health', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      await database.query('SELECT id FROM places LIMIT 1');
      return res.json({ status: 'ok', database: 'up', revision: process.env.APP_REVISION ?? 'local' });
    } catch (error) {
      console.error('health_database_error', { code: error.code ?? 'unexpected' });
      return res.status(503).json({ status: 'unavailable', database: 'down' });
    }
  });
  app.use(express.static(fileURLToPath(new URL('./public/', import.meta.url))));
  app.get('/', (req, res) => res.redirect(302, '/index.html'));
  app.use('/api/places', placesRouter(database));
  app.use('/api/auth', accountRouter(database));
  app.use('/api/offers', offersRouter(database));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.status === 400 || error.status === 413) {
      return res.status(error.status).json({ error: 'La solicitud no es válida.' });
    }
    console.error('request_error', { method: req.method, code: error.code ?? 'unexpected' });
    return res.status(500).json({ error: 'Algo salió mal. Inténtalo nuevamente.' });
  });
  return app;
}

export default createApp();
