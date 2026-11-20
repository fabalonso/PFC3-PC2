import { Router } from 'express';
import { checkPassword, hashPassword, normalizeEmail, validPassword } from './passwords.js';
import { readSession, startSession } from './sessions.js';

const dummyPassword = '00000000000000000000000000000000:' + '00'.repeat(64);

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

  router.post('/login', async (req, res) => {
    const { email: input, password } = req.body ?? {};
    const email = normalizeEmail(input);
    const invalid = () => res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    if (!email || !validPassword(password)) return invalid();
    const { rows: [user] } = await db.query(
      'SELECT id, role, password_hash FROM users WHERE email = $1',
      [email],
    );
    const valid = await checkPassword(password, user?.password_hash ?? dummyPassword);
    if (!user || !valid) return invalid();
    await startSession(db, res, user.id);
    res.json({ user: { id: user.id, role: user.role } });
  });

  router.get('/session', async (req, res) => {
    res.json({ user: await readSession(db, req) });
  });

  return router;
}
