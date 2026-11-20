import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readdir, readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { createApp } from '../app.js';

const migrations = new URL('../db/', import.meta.url);
const samplePassphrase = 'Aula-' + randomBytes(9).toString('hex');
const testUrl = process.env.TEST_DATABASE_URL;
const testSchema = 'recircula_test_' + randomBytes(8).toString('hex');

let server, base, db, admin;
let generator, otherGenerator, collector, otherCollector;

async function call(path, { method = 'GET', body, cookie, headers = {} } = {}) {
  const requestHeaders = { ...headers };
  if (cookie) requestHeaders.Cookie = cookie;
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
  const response = await fetch(base + path, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data, cookie: response.headers.get('set-cookie') };
}

async function createAccount(local, role) {
  const email = local + '@example.test';
  const response = await call('/api/auth/register', {
    method: 'POST', body: { email, password: samplePassphrase, role },
  });
  assert.equal(response.status, 201);
  return { email, id: response.data.user.id, role };
}

async function login(account) {
  const response = await call('/api/auth/login', {
    method: 'POST', body: { email: account.email, password: samplePassphrase },
  });
  assert.equal(response.status, 200);
  assert.equal(response.data.user.role, account.role);
  return { ...account, cookie: response.cookie.split(';')[0], fullCookie: response.cookie };
}

const materialOffer = { material: 'papel', district: 'Miraflores', weightKg: 4.5 };

async function publish(body = materialOffer) {
  const response = await call('/api/offers', { method: 'POST', cookie: generator.cookie, body });
  assert.equal(response.status, 201);
  return response.data.item;
}

function change(offer, verb, account) {
  return call('/api/offers/' + offer.id + '/' + verb, { method: 'POST', cookie: account.cookie });
}

before(async () => {
  if (testUrl) {
    admin = new pg.Pool({ connectionString: testUrl });
    await admin.query('CREATE SCHEMA "' + testSchema + '"');
    db = new pg.Pool({ connectionString: testUrl, options: '-c search_path=' + testSchema });
  } else {
    db = new PGlite();
  }

  const files = (await readdir(migrations)).filter((file) => file.endsWith('.sql')).sort();
  for (const name of files) {
    const sql = await readFile(new URL(name, migrations), 'utf8');
    if (testUrl) await db.query(sql);
    else await db.exec(sql);
  }
  server = createApp(db).listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = 'http://127.0.0.1:' + server.address().port;

  generator = await login(await createAccount('generador', 'generator'));
  otherGenerator = await login(await createAccount('otro-generador', 'generator'));
  collector = await login(await createAccount('recolector', 'collector'));
  otherCollector = await login(await createAccount('otro-recolector', 'collector'));
}, { timeout: 20_000 });

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (testUrl) {
    if (db) await db.end();
    if (admin) {
      await admin.query('DROP SCHEMA IF EXISTS "' + testSchema + '" CASCADE');
      await admin.end();
    }
  } else if (db) await db.close();
});

test('directorio filtra por material y distrito y la ficha incluye horarios y ubicación', async () => {
  const response = await call('/api/places?' + new URLSearchParams({ district: 'Miraflores', material: 'plástico' }));
  assert.equal(response.status, 200);
  assert.equal(response.data.items.length, 1);
  const { data: { item } } = await call('/api/places/' + response.data.items[0].id);
  assert.equal(item.name, 'Punto Kennedy');
  assert.ok(item.materials.includes('plástico'));
  assert.ok(item.address.includes('Miraflores'));
  assert.match(item.schedule, /09:00/);
  const missing = await call('/api/places?district=NoExiste&material=vidrio');
  assert.deepEqual(missing.data.items, []);
});

test('registro valida el rol y rechaza un correo duplicado', async () => {
  const invalid = await call('/api/auth/register', {
    method: 'POST', body: { email: 'invalido@example.test', password: samplePassphrase, role: 'otro' },
  });
  assert.equal(invalid.status, 400);
  const duplicate = await call('/api/auth/register', {
    method: 'POST', body: { email: generator.email.toUpperCase(), password: samplePassphrase, role: 'collector' },
  });
  assert.equal(duplicate.status, 409);
});

test('inicio y cierre de sesión conservan el rol y revocan la sesión anterior', async () => {
  const invalid = await call('/api/auth/login', {
    method: 'POST', body: { email: collector.email, password: samplePassphrase + 'x' },
  });
  assert.equal(invalid.status, 401);
  const anotherSession = await login(collector);
  assert.match(anotherSession.fullCookie, /HttpOnly/i);
  assert.match(anotherSession.fullCookie, /SameSite=Lax/i);
  assert.equal((await call('/api/auth/session', { cookie: anotherSession.cookie })).data.user.role, 'collector');
  assert.equal((await call('/api/auth/logout', { method: 'POST', cookie: anotherSession.cookie })).status, 204);
  assert.equal((await call('/api/auth/session', { cookie: anotherSession.cookie })).data.user, null);
});

test('publicación exige generador, distrito del catálogo y peso válido', async () => {
  const anon = await call('/api/offers', { method: 'POST', body: materialOffer });
  const forbidden = await call('/api/offers', { method: 'POST', cookie: collector.cookie, body: materialOffer });
  const invalid = await call('/api/offers', { method: 'POST', cookie: generator.cookie, body: { ...materialOffer, weightKg: 0 } });
  const invalidDistrict = await call('/api/offers', { method: 'POST', cookie: generator.cookie, body: { ...materialOffer, district: 'Desconocido' } });
  assert.deepEqual([anon.status, forbidden.status, invalid.status, invalidDistrict.status], [401, 403, 400, 400]);
  const item = await publish();
  assert.equal(item.status, 'available');
  assert.equal(item.weight_kg, 4.5);
});

test('listado público exige ambos filtros y omite identidad de los participantes', async () => {
  const offer = await publish({ ...materialOffer, material: 'vidrio' });
  await publish({ ...materialOffer, district: 'San Isidro', material: 'vidrio' });
  const query = new URLSearchParams({ district: 'Miraflores', material: 'vidrio' });
  const { data } = await call('/api/offers?' + query);
  assert.deepEqual(data.items.map(({ id }) => id), [offer.id]);
  assert.equal(Object.hasOwn(data.items[0], 'email'), false);
  assert.equal(Object.hasOwn(data.items[0], 'generator_id'), false);
});

test('ante dos reservas simultáneas solo una se confirma', async () => {
  const item = await publish();
  const results = await Promise.all([change(item, 'reserve', collector), change(item, 'reserve', otherCollector)]);
  assert.deepEqual(results.map(({ status }) => status).sort(), [200, 409]);
  const list = await call('/api/offers');
  assert.ok(!list.data.items.some(({ id }) => id === item.id));
});

test('solo quien reservó puede cancelar y la oferta vuelve a estar disponible', async () => {
  const item = await publish();
  assert.equal((await change(item, 'reserve', collector)).status, 200);
  assert.equal((await change(item, 'cancel', otherCollector)).status, 409);
  const response = await change(item, 'cancel', collector);
  assert.equal(response.data.item.status, 'available');
  const list = await call('/api/offers');
  assert.ok(list.data.items.some(({ id }) => id === item.id));
});

test('solo el generador propietario confirma la entrega y cada usuario ve su actividad', async () => {
  const item = await publish();
  assert.equal((await change(item, 'reserve', collector)).status, 200);
  assert.equal((await change(item, 'complete', otherGenerator)).status, 409);
  const response = await change(item, 'complete', generator);
  assert.equal(response.data.item.status, 'delivered');
  for (const user of [generator, collector]) {
    const mine = await call('/api/offers/mine', { cookie: user.cookie });
    assert.equal(mine.data.items.find(({ id }) => id === item.id)?.status, 'delivered');
  }
  const other = await call('/api/offers/mine', { cookie: otherGenerator.cookie });
  assert.ok(!other.data.items.some(({ id }) => id === item.id));
  assert.equal((await change(item, 'cancel', collector)).status, 409);
});

test('las secciones principales tienen páginas y rutas independientes', async () => {
  const pages = [
    ['/', /data-page="home"/],
    ['/acopio', /id="place-map"/],
    ['/ofertas', /id="offer-list"/],
    ['/actividad', /id="activity-list"/],
    ['/registro', /Antes de registrarte/],
    ['/iniciar-sesion', /id="login-form"/],
  ];
  for (const [path, marker] of pages) {
    const response = await fetch(base + path, { redirect: 'manual' });
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), marker, path);
  }
});

test('el directorio proporciona ubicaciones de referencia y permite el mapa dentro de la página', async () => {
  const { data } = await call('/api/places');
  assert.equal(data.items.length, 6);
  assert.ok(data.items.every(({ latitude, longitude }) =>
    Number.isFinite(latitude) && latitude > -12.2 && latitude < -12
    && Number.isFinite(longitude) && longitude > -77.1 && longitude < -76.9));
  const response = await fetch(base + '/acopio', { redirect: 'manual' });
  const policy = response.headers.get('content-security-policy') ?? '';
  assert.match(policy, /frame-src https:\/\/www\.openstreetmap\.org(?:;|$)/);
});
