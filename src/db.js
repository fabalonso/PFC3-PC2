import pg from 'pg';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 8_000,
});

pool.on('error', (error) => {
  console.error('database_connection_error', { code: error.code ?? 'unexpected' });
});
