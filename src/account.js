import { Router } from 'express';
import { hashPassword, normalizeEmail, validPassword } from './passwords.js';

export function accountRouter(db) {
  const router = Router();

  router.post('/register', async (req, res) => {
    const { email: input, password, role } = req.body ?? {};
    const email = normalizeEmail(input);
    if (!email || !validPassword(password) || !['generator', 'collector'].includes(role)) {
      return res.status(400).json({ error: 'Indica un correo válido, una contraseña de al menos 10 caracteres y un rol.' });
    }
    const passwordHash = await hashPassword(password);
    const { rows: [user] } = await db.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1,$2,$3) ON CONFLICT (email) DO NOTHING RETURNING id, role',
      [email, passwordHash, role],
    );
    if (!user) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
    res.status(201).json({ user });
  });

  return router;
}
