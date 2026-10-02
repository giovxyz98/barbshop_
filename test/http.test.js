const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../backend/server');
const { addDaysForTest, prossimoMartedi } = require('./date_utils');
const { newDb } = require('./helpers');

async function avvia() {
  const { db } = newDb();
  const server = createApp(db).listen(0);
  await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (method, url, body, raw) => {
    const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: raw ?? (body ? JSON.stringify(body) : undefined) });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  return { db, call, close: () => server.close() };
}

test('API: disponibilità, prenotazione, elenco, annullamento', async t => {
  const { call, close } = await avvia();
  t.after(close);
  const data = prossimoMartedi();

  let r = await call('GET', `/disponibilita?data=${data}&servizio=1`);
  assert.equal(r.status, 200);
  assert.equal(r.body.slots[0], '09:00');

  r = await call('POST', '/prenotazioni', { username: 'user0', servizio: 1, data, ora: '09:00' });
  assert.equal(r.status, 201);
  const id = r.body.prenotazione.id;

  r = await call('POST', '/prenotazioni', { username: 'user1', servizio: 1, data, ora: '09:00' });
  assert.equal(r.status, 409);
  assert.match(r.body.error, /non disponibile/);

  r = await call('GET', `/prenotazioni?data=${data}`);
  assert.equal(r.body.prenotazioni.length, 1);
  assert.equal(r.body.prenotazioni[0].nome, 'Nome0');

  r = await call('DELETE', `/prenotazioni/${id}`);
  assert.equal(r.status, 200);
  r = await call('GET', `/disponibilita?data=${data}&servizio=1`);
  assert.equal(r.body.slots[0], '09:00');
});

test('API: errori sempre in JSON con il codice giusto', async t => {
  const { call, close } = await avvia();
  t.after(close);
  assert.equal((await call('GET', '/disponibilita')).status, 400);
  assert.equal((await call('GET', '/disponibilita?data=2026-10-06')).status, 400);
  assert.equal((await call('GET', '/disponibilita?data=boh&servizio=1')).status, 400);
  assert.equal((await call('GET', `/disponibilita?data=${prossimoMartedi()}&servizio=99`)).status, 404);
  assert.equal((await call('POST', '/prenotazioni', {})).status, 400);
  assert.equal((await call('POST', '/prenotazioni', undefined, '{non json')).status, 400);
  assert.equal((await call('DELETE', '/prenotazioni/abc')).status, 400);
  assert.equal((await call('DELETE', '/prenotazioni/12345')).status, 404);
  assert.equal((await call('GET', '/calendario?da=2026-01-01&a=2027-01-01')).status, 400);
  assert.equal((await call('GET', "/prenotazioni?q=%27%3B%20DROP%20TABLE%20users%3B--")).status, 200);
});

test('API: 40 richieste HTTP parallele sullo stesso slot -> una sola 201', async t => {
  const { call, close, db } = await avvia();
  t.after(close);
  const data = prossimoMartedi();
  const r = await Promise.all([...Array(40)].map((_, i) => call('POST', '/prenotazioni', { username: `user${i}`, servizio: 1, data, ora: '10:00' })));
  assert.equal(r.filter(x => x.status === 201).length, 1);
  assert.equal(r.filter(x => x.status === 409).length, 39);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM prenotazioni').get().c, 1);
});

test('API: stesso utente, 10 richieste parallele su slot diversi -> una sola 201', async t => {
  const { call, close } = await avvia();
  t.after(close);
  const data = prossimoMartedi();
  const r = await Promise.all([...Array(10)].map((_, i) => call('POST', '/prenotazioni', { username: 'user0', servizio: 1, data, ora: `${String(9 + i % 4).padStart(2, '0')}:${i < 4 ? '00' : '30'}` })));
  assert.equal(r.filter(x => x.status === 201).length, 1);
});

test('API: orari settimanali, eccezioni e calendario', async t => {
  const { call, close } = await avvia();
  t.after(close);
  const data = prossimoMartedi();

  let r = await call('PUT', '/orari/eccezioni', { data, chiuso: true, motivo: 'Ferie' });
  assert.equal(r.status, 200);
  r = await call('GET', `/calendario?da=${data}&a=${addDaysForTest(data, 1)}`);
  assert.equal(r.body.giorni[0].aperto, false);
  assert.equal(r.body.giorni[1].aperto, true);
  assert.equal((await call('POST', '/prenotazioni', { username: 'user0', servizio: 1, data, ora: '10:00' })).status, 409);

  r = await call('PUT', '/orari/settimanali', { giorni: [{ giorno_settimana: 0, fasce: [{ apertura: '10:00', chiusura: '12:00' }] }] });
  assert.equal(r.status, 200);
  assert.equal(r.body.settimanali[0].fasce.length, 1);
  assert.equal((await call('PUT', '/orari/settimanali', { giorni: [{ giorno_settimana: 0, fasce: [{ apertura: '12:00', chiusura: '10:00' }] }] })).status, 400);

  r = await call('GET', '/orari');
  assert.equal(r.body.eccezioni.length, 1);
  assert.equal(r.body.impostazioni.slot_step, 5);
  assert.equal((await call('DELETE', `/orari/eccezioni/${data}`)).status, 200);
  assert.equal((await call('PUT', '/impostazioni', { slot_step: 15 })).body.impostazioni.slot_step, 15);
});

test('API: login fittizio', async t => {
  const { call, close } = await avvia();
  t.after(close);
  assert.equal((await call('POST', '/login', { username: 'admin1', password: 'x' })).body.user.ruolo, 'admin');
  assert.equal((await call('POST', '/login', {})).body.user.ruolo, 'cliente');
});

test('API: utenti e servizi (percorsi invariati)', async t => {
  const { call, close, db } = await avvia();
  t.after(close);
  assert.equal((await call('POST', '/addUser', { nome: 'A', cognome: 'B', username: 'nuovo', password: 'pw' })).status, 201);
  assert.equal((await call('POST', '/addUser', { nome: 'A', cognome: 'B', username: 'nuovo', password: 'pw' })).status, 400);
  assert.equal((await call('GET', '/getUser?username=nuovo')).body.user.nome, 'A');
  assert.equal((await call('GET', '/getUser?username=zzz')).status, 404);
  assert.equal((await call('PUT', '/editPassword', { username: 'nuovo', newPassword: 'x' })).status, 200);
  assert.equal((await call('GET', '/getServizi')).body.data.length, 3);
  assert.equal((await call('POST', '/addServizio', { nome: 'X', prezzo: 5, durata: 15 })).status, 200);
  assert.equal((await call('POST', '/addServizio', { nome: 'X', prezzo: 5, durata: 'abc' })).status, 400);
  assert.equal((await call('POST', '/addServizio', { nome: 'X', prezzo: -1, durata: 15 })).status, 400);
  assert.equal((await call('POST', '/addServizio', { nome: 'X', prezzo: 5, durata: 0 })).status, 400);
  await call('POST', '/prenotazioni', { username: 'nuovo', servizio: 1, data: prossimoMartedi(), ora: '10:00' });
  assert.equal((await call('DELETE', '/deleteUser', { username: 'nuovo' })).status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM prenotazioni').get().c, 0);
});
