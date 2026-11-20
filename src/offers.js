import { Router } from 'express';
import { readSession } from './sessions.js';

const materials = new Set(['papel', 'cartón', 'plástico', 'vidrio', 'metal', 'electrónicos']);
const publicColumns = 'id, material, district, weight_kg::float8 AS weight_kg, status, created_at';

export function offersRouter(db) {
  const router = Router();

  function requireRole(role) {
    return async (req, res, next) => {
      const user = await readSession(db, req);
      if (!user) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
      if (user.role !== role) return res.status(403).json({ error: 'Tu rol no permite esta acción.' });
      res.locals.user = user;
      next();
    };
  }

  router.param('id', (req, res, next, value) => {
    const id = Number(value);
    if (!/^\d+$/.test(value) || !Number.isInteger(id) || id < 1 || id > 2147483647) {
      return res.status(404).json({ error: 'Oferta no encontrada.' });
    }
    res.locals.offerId = id;
    next();
  });

  router.get('/', async (req, res) => {
    const district = typeof req.query.district === 'string' ? req.query.district.trim() : '';
    const material = typeof req.query.material === 'string' ? req.query.material.trim() : '';
    const { rows } = await db.query(
      "SELECT " + publicColumns + " FROM offers WHERE status = 'available' AND ($1::text IS NULL OR district = $1) AND ($2::text IS NULL OR material = $2) ORDER BY id DESC",
      [district || null, material || null],
    );
    res.json({ items: rows });
  });

  router.post('/', requireRole('generator'), async (req, res) => {
    const { material, district: input, weightKg } = req.body ?? {};
    const district = typeof input === 'string' ? input.trim() : '';
    const weight = ['number', 'string'].includes(typeof weightKg) ? String(weightKg).trim() : '';
    if (!materials.has(material) || !district || district.length > 70
      || !/^\d{1,4}(?:\.\d{1,2})?$/.test(weight) || Number(weight) <= 0 || Number(weight) > 1000) {
      return res.status(400).json({ error: 'Indica un material, un distrito y un peso mayor a 0 y de hasta 1000 kg.' });
    }
    const supported = await db.query('SELECT 1 FROM places WHERE active AND district = $1 LIMIT 1', [district]);
    if (supported.rows.length === 0) {
      return res.status(400).json({ error: 'Selecciona un distrito del catálogo.' });
    }
    const { rows: [offer] } = await db.query(
      'INSERT INTO offers (generator_id, material, district, weight_kg) VALUES ($1,$2,$3,$4) RETURNING ' + publicColumns,
      [res.locals.user.id, material, district, weight],
    );
    res.status(201).json({ item: offer });
  });

  router.post('/:id/reserve', requireRole('collector'), async (_req, res) => {
    const { rows: [offer] } = await db.query(
      "UPDATE offers SET status = 'reserved', collector_id = $2 WHERE id = $1 AND status = 'available' RETURNING " + publicColumns,
      [res.locals.offerId, res.locals.user.id],
    );
    if (!offer) return res.status(409).json({ error: 'La oferta ya no está disponible.' });
    res.json({ item: offer });
  });

  router.post('/:id/cancel', requireRole('collector'), async (_req, res) => {
    const { rows: [offer] } = await db.query(
      "UPDATE offers SET status = 'available', collector_id = NULL WHERE id = $1 AND status = 'reserved' AND collector_id = $2 RETURNING " + publicColumns,
      [res.locals.offerId, res.locals.user.id],
    );
    if (!offer) return res.status(409).json({ error: 'La reserva no está disponible para cancelar.' });
    res.json({ item: offer });
  });

  router.post('/:id/complete', requireRole('generator'), async (_req, res) => {
    const { rows: [offer] } = await db.query(
      "UPDATE offers SET status = 'delivered' WHERE id = $1 AND status = 'reserved' AND generator_id = $2 RETURNING " + publicColumns,
      [res.locals.offerId, res.locals.user.id],
    );
    if (!offer) return res.status(409).json({ error: 'La oferta no está disponible para confirmar la entrega.' });
    res.json({ item: offer });
  });

  return router;
}
