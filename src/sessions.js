import { createHash, randomBytes } from 'node:crypto';

const cookieName = 'recircula_session';
const ttlSeconds = 24 * 60 * 60;
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' };

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function sessionToken(req) {
  const cookie = req.get('cookie') ?? '';
  const match = new RegExp('(?:^|;\\s*)' + cookieName + '=([a-zA-Z0-9_-]{43})(?:;|$)').exec(cookie);
  return match?.[1];
}

export async function startSession(db, res, userId) {
  const token = randomBytes(32).toString('base64url');
  await db.query(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1,$2,now() + $3 * interval \'1 second\')',
    [hashToken(token), userId, ttlSeconds],
  );
  res.cookie(cookieName, token, { ...cookieOptions, maxAge: ttlSeconds * 1000 });
}

export async function readSession(db, req) {
  const token = sessionToken(req);
  if (!token) return null;
  const { rows: [user] } = await db.query(
    'SELECT u.id, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()',
    [hashToken(token)],
  );
  return user ?? null;
}
