// Prodotti, richieste di registrazione, modifica servizi, login di debug e front-end servito dal backend.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../backend/server');
const { prossimoMartedi } = require('./date_utils');
const { newDb } = require('./helpers');

async function avvia() {
  const { db } = newDb();
  const server = createApp(db).listen(0);
  await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, url, body) => {
    const r = await fetch(base + '/api' + url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  return { db, call, base, close: () => server.close() };
}

test('prodotti: CRUD, vetrina solo disponibili, validazione', async t => {
  const { call, close } = await avvia();
  t.after(close);
  let r = await call('POST', '/prodotti', { nome: 'Cera', categoria: 'Prodotti per capelli', prezzo: 12.5, immagine: 'https://example.com/a.jpg' });
  assert.equal(r.status, 201);
  const id = r.body.prodotto.id;
  assert.equal(r.body.prodotto.disponibile, 1);
  await call('POST', '/prodotti', { nome: 'Gel', prezzo: 8, disponibile: false });

  assert.equal((await call('GET', '/prodotti')).body.prodotti.length, 1, 'la vetrina mostra solo i disponibili');
  assert.equal((await call('GET', '/prodotti?tutti=1')).body.prodotti.length, 2);

  r = await call('PUT', `/prodotti/${id}`, { nome: 'Cera forte', categoria: 'Prodotti per capelli', prezzo: 14, disponibile: true });
  assert.equal(r.body.prodotto.nome, 'Cera forte');
  assert.equal(r.body.prodotto.immagine, 'https://example.com/a.jpg', 'senza il campo immagine la foto resta com\'è');
  r = await call('PUT', `/prodotti/${id}`, { nome: 'Cera forte', categoria: 'Prodotti per capelli', prezzo: 14, immagine: null });
  assert.equal(r.body.prodotto.immagine, null, 'immagine: null la rimuove');

  assert.equal((await call('POST', '/prodotti', { prezzo: 5 })).status, 400);
  assert.equal((await call('POST', '/prodotti', { nome: 'X', prezzo: -1 })).status, 400);
  assert.equal((await call('POST', '/prodotti', { nome: 'X', prezzo: 'abc' })).status, 400);
  assert.equal((await call('POST', '/prodotti', { nome: 'X', prezzo: 1, immagine: 'javascript:alert(1)' })).status, 400);
  assert.equal((await call('PUT', '/prodotti/999', { nome: 'X', prezzo: 1 })).status, 404);
  assert.equal((await call('PUT', '/prodotti/abc', { nome: 'X', prezzo: 1 })).status, 400);

  assert.equal((await call('DELETE', `/prodotti/${id}`)).status, 200);
  assert.equal((await call('DELETE', `/prodotti/${id}`)).status, 404);
});

test('servizi: modifica ed eliminazione (bloccata se usato da prenotazioni)', async t => {
  const { call, close } = await avvia();
  t.after(close);
  let r = await call('PUT', '/servizi/2', { nome: 'Barba curata', prezzo: 12, durata: 25, descrizione: 'x' });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.durata, 25);
  assert.equal((await call('PUT', '/servizi/2', { nome: '', prezzo: 12, durata: 25 })).status, 400);
  assert.equal((await call('PUT', '/servizi/2', { nome: 'X', prezzo: 12, durata: 2.5 })).status, 400);
  assert.equal((await call('PUT', '/servizi/99', { nome: 'X', prezzo: 12, durata: 25 })).status, 404);

  const data = prossimoMartedi();
  assert.equal((await call('POST', '/prenotazioni', { username: 'user0', servizio: 2, data, ora: '10:00' })).status, 201);
  // la prenotazione conserva i 25 minuti anche se poi il servizio cambia
  await call('PUT', '/servizi/2', { nome: 'Barba curata', prezzo: 12, durata: 40 });
  assert.equal((await call('GET', `/prenotazioni?data=${data}`)).body.prenotazioni[0].durata, 25);

  assert.equal((await call('DELETE', '/servizi/2')).status, 409);
  assert.equal((await call('DELETE', '/servizi/3')).status, 200);
  assert.equal((await call('DELETE', '/servizi/3')).status, 404);
});

test('registrazioni: richiesta, accettazione, rifiuto e controlli', async t => {
  const { call, close, db } = await avvia();
  t.after(close);
  const ok = { nome: 'Mario', cognome: 'Rossi', username: 'mario.rossi', password: 'password1' };

  let r = await call('POST', '/registrazioni', ok);
  assert.equal(r.status, 201);
  const id = r.body.id;
  assert.equal((await call('POST', '/registrazioni', ok)).status, 409, 'doppia richiesta in attesa');
  assert.equal((await call('POST', '/registrazioni', { ...ok, username: 'user0' })).status, 409, 'username già utente');
  assert.equal((await call('POST', '/registrazioni', { ...ok, username: 'ab' })).status, 400);
  assert.equal((await call('POST', '/registrazioni', { ...ok, username: 'a b c d e' })).status, 400);
  assert.equal((await call('POST', '/registrazioni', { ...ok, password: 'corta' })).status, 400);
  assert.equal((await call('POST', '/registrazioni', { ...ok, nome: 'Al', username: 'altro.utente' })).status, 400);

  r = await call('GET', '/registrazioni');
  assert.equal(r.body.richieste.length, 1);
  assert.equal(JSON.stringify(r.body).includes('password1'), false, 'la password non viene mai restituita');
  assert.equal(db.prepare("SELECT COUNT(*) c FROM users WHERE username = 'mario.rossi'").get().c, 0, 'non è ancora un utente');

  r = await call('POST', `/registrazioni/${id}/accetta`);
  assert.equal(r.status, 200);
  assert.equal(db.prepare("SELECT ruolo FROM users WHERE username = 'mario.rossi'").get().ruolo, 'cliente');
  assert.equal((await call('POST', `/registrazioni/${id}/accetta`)).status, 409, 'già gestita');
  assert.equal((await call('POST', `/registrazioni/${id}/rifiuta`)).status, 409);
  assert.equal((await call('GET', '/registrazioni')).body.richieste.length, 0);

  // ora l'utente accettato può prenotare
  assert.equal((await call('POST', '/prenotazioni', { username: 'mario.rossi', servizio: 1, data: prossimoMartedi(), ora: '10:00' })).status, 201);

  // rifiuto, e dopo il rifiuto si può rifare la richiesta
  r = await call('POST', '/registrazioni', { ...ok, username: 'luigi.verdi' });
  assert.equal((await call('POST', `/registrazioni/${r.body.id}/rifiuta`)).status, 200);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM users WHERE username = 'luigi.verdi'").get().c, 0);
  assert.equal((await call('POST', '/registrazioni', { ...ok, username: 'luigi.verdi' })).status, 201);
  assert.equal((await call('GET', '/registrazioni?stato=tutte')).body.richieste.length, 3);

  assert.equal((await call('POST', '/registrazioni/999/accetta')).status, 404);
  assert.equal((await call('POST', '/registrazioni/x/accetta')).status, 400);
  assert.equal((await call('GET', '/registrazioni?stato=boh')).status, 400);
});

test('login di debug: crea l\'utente se manca, così si può prenotare', async t => {
  const { call, close, db } = await avvia();
  t.after(close);
  let r = await call('POST', '/login', { username: 'mario_debug', password: 'qualsiasi' });
  assert.equal(r.status, 200);
  assert.equal(r.body.user.username, 'mario_debug');
  assert.equal(r.body.user.ruolo, 'cliente');
  assert.equal(db.prepare("SELECT COUNT(*) c FROM users WHERE username = 'mario_debug'").get().c, 1);
  assert.equal((await call('POST', '/prenotazioni', { username: 'mario_debug', servizio: 1, data: prossimoMartedi(), ora: '10:00' })).status, 201);

  await call('POST', '/login', { username: 'mario_debug', password: 'altra' });
  assert.equal(db.prepare("SELECT COUNT(*) c FROM users WHERE username = 'mario_debug'").get().c, 1, 'nessun duplicato');

  r = await call('POST', '/login', { username: 'admin', password: '' });
  assert.equal(r.body.user.ruolo, 'admin');
  r = await call('POST', '/login', {});
  assert.equal(r.body.user.username, 'debug');
  r = await call('POST', '/login', { username: 'user3' });  // utente esistente: nome reale
  assert.equal(r.body.user.nome, 'Nome3');
});

test('il backend serve il front-end e risponde JSON alle API sconosciute', async t => {
  const { base, close } = await avvia();
  t.after(close);
  const r = await fetch(`${base}/index.html`);
  assert.equal(r.status, 200);
  assert.match(await r.text(), /<form/);
  const a = await fetch(`${base}/api/non-esiste`);
  assert.equal(a.status, 404);
  assert.deepEqual(await a.json(), { error: 'Risorsa non trovata' });
});
