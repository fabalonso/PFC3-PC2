import { Router } from 'express';

export function placesRouter(db) {
  const router = Router();

  router.get('/', async (req, res) => {
    const { rows } = await db.query(
      'SELECT id, name, district, materials FROM places WHERE active ORDER BY name',
    );
    res.json({ items: rows });
  });

  return router;
}
