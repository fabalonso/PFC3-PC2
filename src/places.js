import { Router } from 'express';

export function placesRouter(db) {
  const router = Router();

  router.get('/', async (req, res) => {
    const district = typeof req.query.district === 'string' ? req.query.district.trim() : '';
    const { rows } = await db.query(
      'SELECT id, name, district FROM places WHERE active AND ($1::text IS NULL OR district = $1) ORDER BY name',
      [district || null],
    );
    res.json({ items: rows });
  });

  router.get('/filters', async (_req, res) => {
    const { rows } = await db.query('SELECT DISTINCT district FROM places WHERE active ORDER BY district');
    res.json({ districts: rows.map(({ district }) => district) });
  });

  router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
      return res.status(404).json({ error: 'Punto de acopio no encontrado.' });
    }
    const { rows: [place] } = await db.query(
      'SELECT id, name, district, schedule, materials FROM places WHERE id = $1 AND active',
      [id],
    );
    if (!place) return res.status(404).json({ error: 'Punto de acopio no encontrado.' });
    res.json({ item: place });
  });

  return router;
}
