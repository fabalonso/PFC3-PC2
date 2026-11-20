import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const settings = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 ** 2 };

export function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

export function validPassword(value) {
  return typeof value === 'string' && value.length >= 10 && Buffer.byteLength(value) <= 128;
}

export async function hashPassword(value) {
  const salt = randomBytes(16);
  const hash = await derive(value, salt, 64, settings);
  return salt.toString('hex') + ':' + hash.toString('hex');
}

export async function checkPassword(value, saved) {
  const [salt, expected] = saved.split(':');
  const digest = await derive(value, Buffer.from(salt, 'hex'), 64, settings);
  return timingSafeEqual(digest, Buffer.from(expected, 'hex'));
}
