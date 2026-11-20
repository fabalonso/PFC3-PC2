import { Router } from 'express';

export function placesRouter(db) {
  const router = Router();

  router.get('/', async (req, res) => {
    const { rows } = await db.query(
      'SELECT id, name, district, materials FROM places WHERE active ORDER BY name',
    );
    res.json({ items: rows });
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
