// Prenotazioni inserite dall'admin per conto di un cliente e annullabili da chiunque gestisca il salone.
const test = require('node:test');
const assert = require('node:assert/strict');
const agenda = require('../backend/agenda');
const { createApp } = require('../backend/server');
const { prossimoMartedi } = require('./date_utils');
const { MARTEDI, newDb } = require('./helpers');

const rifiuta = (fn, status, msg) =>
  assert.throws(fn, e => e instanceof agenda.AppError && e.status === status && (!msg || msg.test(e.message)));

// martedì alle 10:00: il preavviso di 60' vieta le 10:30, ma non per l'admin
const OGGI = { data: MARTEDI, min: 10 * 60 };

test('l\'admin prenota senza preavviso, non negli orari già passati', () => {
  const { db } = newDb();
  const req = ora => ({ username: 'user0', servizio: 1, data: MARTEDI, ora });

  rifiuta(() => agenda.prenota(db, req('10:30'), OGGI), 400, /preavviso/);                       // cliente: no
  rifiuta(() => agenda.prenota(db, { ...req('10:30'), da_admin: 'true' }, OGGI), 400, /preavviso/); // il flag va passato come booleano vero
  rifiuta(() => agenda.prenota(db, { ...req('09:30'), da_admin: true }, OGGI), 400, /già passato/);  // nemmeno l'admin nel passato

  const p = agenda.prenota(db, { ...req('10:30'), da_admin: true }, OGGI);
  assert.equal(p.inizio, '10:30');
  assert.equal(p.user, 'user0');
});

test('disponibilità per l\'admin include gli orari entro il preavviso', () => {
  const { db } = newDb();
  assert.equal(agenda.getDisponibilita(db, MARTEDI, 1, OGGI).slots[0], '11:00');
  assert.equal(agenda.getDisponibilita(db, MARTEDI, 1, OGGI, { admin: true }).slots[0], '10:00');
});

test('le regole di agenda valgono anche per l\'admin: sovrapposizioni e una al giorno', () => {
  const { db } = newDb();
  agenda.prenota(db, { username: 'user0', servizio: 1, data: MARTEDI, ora: '11:00' }, OGGI);
  rifiuta(() => agenda.prenota(db, { username: 'user1', servizio: 1, data: MARTEDI, ora: '11:15', da_admin: true }, OGGI), 409, /non disponibile/);
  rifiuta(() => agenda.prenota(db, { username: 'user0', servizio: 1, data: MARTEDI, ora: '16:00', da_admin: true }, OGGI), 409, /già una prenotazione/);
  rifiuta(() => agenda.prenota(db, { username: 'nessuno', servizio: 1, data: MARTEDI, ora: '16:00', da_admin: true }, OGGI), 404, /Utente/);
});

test('API: l\'admin inserisce una prenotazione per un cliente e annulla sia la sua sia quella del cliente', async t => {
  const { db } = newDb();
  const server = createApp(db).listen(0);
  await new Promise(r => server.once('listening', r));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (method, url, body) => {
    const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  const data = prossimoMartedi();

  // il cliente prenota da sé
  let r = await call('POST', '/prenotazioni', { username: 'user1', servizio: 1, data, ora: '09:00' });
  assert.equal(r.status, 201);
  const delCliente = r.body.prenotazione.id;

  // l'admin ne inserisce una per un altro cliente
  r = await call('POST', '/prenotazioni', { username: 'user2', servizio: 2, data, ora: '10:00', da_admin: true });
  assert.equal(r.status, 201);
  assert.equal(r.body.prenotazione.user, 'user2');
  const dellAdmin = r.body.prenotazione.id;

  // l'elenco dell'agenda le mostra entrambe
  r = await call('GET', `/prenotazioni?data=${data}&stato=confermata`);
  assert.deepEqual(r.body.prenotazioni.map(p => p.user), ['user1', 'user2']);

  // la disponibilità "admin" è accettata dall'API
  r = await call('GET', `/disponibilita?data=${data}&servizio=1&admin=1`);
  assert.equal(r.status, 200);

  // annullamento di entrambe
  assert.equal((await call('DELETE', `/prenotazioni/${delCliente}`)).status, 200);
  assert.equal((await call('DELETE', `/prenotazioni/${dellAdmin}`)).status, 200);
  assert.equal((await call('GET', `/prenotazioni?data=${data}&stato=confermata`)).body.prenotazioni.length, 0);

  // gli slot tornano liberi e il cliente può riprenotare
  assert.equal((await call('POST', '/prenotazioni', { username: 'user2', servizio: 1, data, ora: '10:00' })).status, 201);
});
