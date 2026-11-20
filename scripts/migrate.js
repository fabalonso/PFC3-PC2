import { readdir, readFile } from 'node:fs/promises';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });

const migrations = new URL('../db/', import.meta.url);

async function migrate() {
  if (!connectionString) throw new Error('Configura DATABASE_URL.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(374810)');
    await client.query('CREATE TABLE IF NOT EXISTS migrations (name text PRIMARY KEY)');
    const files = (await readdir(migrations)).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files) {
      const result = await client.query('SELECT 1 FROM migrations WHERE name = $1', [file]);
      if (result.rowCount) continue;
      await client.query(await readFile(new URL(file, migrations), 'utf8'));
      await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
      console.log('Migración aplicada:', file);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

try {
  await migrate();
} catch (error) {
  console.error('Migración fallida:', error.code ?? error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
