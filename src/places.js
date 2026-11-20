import { Router } from 'express';

export function placesRouter(db) {
  const router = Router();

  router.get('/', async (req, res) => {
    const district = typeof req.query.district === 'string' ? req.query.district.trim() : '';
    const material = typeof req.query.material === 'string' ? req.query.material.trim() : '';
    const { rows } = await db.query(
      'SELECT id, name, district, latitude, longitude FROM places WHERE active AND ($1::text IS NULL OR district = $1) AND ($2::text IS NULL OR $2 = ANY(materials)) ORDER BY name',
      [district || null, material || null],
    );
    res.json({ items: rows });
  });

  router.get('/filters', async (_req, res) => {
    const { rows } = await db.query('SELECT DISTINCT district FROM places WHERE active ORDER BY district');
    const { rows: catalog } = await db.query('SELECT DISTINCT unnest(materials) AS material FROM places WHERE active ORDER BY material');
    res.json({
      districts: rows.map(({ district }) => district),
      materials: catalog.map(({ material }) => material),
    });
  });

  router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
      return res.status(404).json({ error: 'Punto de acopio no encontrado.' });
    }
    const { rows: [place] } = await db.query(
      'SELECT id, name, district, address, schedule, materials FROM places WHERE id = $1 AND active',
      [id],
    );
    if (!place) return res.status(404).json({ error: 'Punto de acopio no encontrado.' });
    res.json({ item: place });
  });

  return router;
}
