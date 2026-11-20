import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const [target, expected] = process.argv.slice(2);
if (!target || !expected) throw new Error('Uso: node scripts/smoke.js URL SHA');
const base = new URL(target);

async function get(path) {
  const response = await fetch(new URL(path, base), {
    headers: { 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, 200, path + ' debe responder HTTP 200');
  return response;
}

async function smoke() {
  const home = await get('/');
  assert.match(await home.text(), /ReCircula Lima/);
  const css = await get('/assets/style.css');
  const js = await get('/assets/main.js');
  assert.match(css.headers.get('content-type') ?? '', /text\/css/i);
  assert.match(js.headers.get('content-type') ?? '', /javascript/i);
  const pages = await Promise.all(['/acopio', '/ofertas', '/actividad', '/registro', '/iniciar-sesion'].map(async (route) =>
    (await get(route)).text()));
  assert.match(pages[0], /id="place-map"/);
  assert.match(pages[1], /id="offer-list"/);
  assert.match(pages[2], /id="activity-list"/);
  assert.match(pages[3], /Antes de registrarte/);
  assert.match(pages[4], /id="login-form"/);
  const health = await (await get('/health')).json();
  assert.equal(health.status, 'ok');
  assert.equal(health.database, 'up');
  assert.equal(health.revision, expected, 'El dominio aún sirve una revisión distinta');
  const places = await (await get('/api/places')).json();
  assert.ok(Array.isArray(places.items) && places.items.length > 0, 'El directorio debe mostrar puntos de acopio');
  console.log('Prueba de humo exitosa: portada, páginas, recursos, salud y directorio.');
  console.log('URL:', base.origin);
  console.log('Commit:', health.revision);
}

for (let attempt = 1; attempt <= 12; attempt += 1) {
  try {
    await smoke();
    break;
  } catch (error) {
    console.error('Prueba de humo (intento ' + attempt + '): ' + error.message);
    if (attempt === 12) throw error;
    await delay(4000);
  }
}
