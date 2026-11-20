import express from 'express';
import { fileURLToPath } from 'node:url';
import { pool } from './src/db.js';
import { placesRouter } from './src/places.js';

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
  app.use(express.json({ limit: '12kb' }));
  app.use(express.static(fileURLToPath(new URL('./public/', import.meta.url))));
  app.get('/', (req, res) => res.redirect(302, '/index.html'));
  app.use('/api/places', placesRouter(database));
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
